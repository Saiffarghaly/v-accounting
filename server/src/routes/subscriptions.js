const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getUsageSummary } = require('../subscription-check');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.officeId = decoded.officeId;
    req.userId = decoded.userId || null;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Fawry config (from env)
const FAWRY_MERCHANT = process.env.FAWRY_MERCHANT_CODE || '';
const FAWRY_SECRET = process.env.FAWRY_SECRET_KEY || '';
const FAWRY_BASE = process.env.FAWRY_BASE_URL || 'https://atfawry.fawrybk.com/api/v2'; // production

// ─── GET current subscription ───
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, sp.name as plan_name, sp.code as plan_code, sp.price_monthly, sp.price_yearly,
              sp.max_users, sp.max_transactions, sp.max_invoices, sp.max_clients, sp.max_inventory_items, sp.features
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.office_id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.officeId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET available plans ───
router.get('/plans', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST create/upgrade subscription ───
router.post('/', auth, async (req, res) => {
  const { plan_id, billing_cycle } = req.body; // billing_cycle: 'monthly' or 'yearly'
  if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

  try {
    // Get plan
    const planRes = await pool.query('SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true', [plan_id]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];

    const cycle = billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    const price = cycle === 'yearly' ? Number(plan.price_yearly) : Number(plan.price_monthly);

    // If free plan, just activate immediately
    if (plan.code === 'free' || price <= 0) {
      await pool.query(
        `UPDATE subscriptions SET status = 'cancelled' WHERE office_id = $1 AND status = 'active'`,
        [req.officeId]
      );
      const subRes = await pool.query(
        `INSERT INTO subscriptions (office_id, plan_id, status, billing_cycle)
         VALUES ($1, $2, 'active', $3) RETURNING *`,
        [req.officeId, plan_id, cycle]
      );
      return res.json({ subscription: subRes.rows[0], payment: null });
    }

    // For paid plans: generate Fawry payment request
    const officeRes = await pool.query('SELECT name, email, phone FROM offices WHERE id = $1', [req.officeId]);
    const office = officeRes.rows[0];

    // Cancel old subscription
    await pool.query(
      `UPDATE subscriptions SET status = 'cancelled' WHERE office_id = $1 AND status = 'active'`,
      [req.officeId]
    );

    // Create new subscription as pending
    const subRes = await pool.query(
      `INSERT INTO subscriptions (office_id, plan_id, status, billing_cycle)
       VALUES ($1, $2, 'pending', $3) RETURNING *`,
      [req.officeId, plan_id, cycle]
    );
    const subscription = subRes.rows[0];

    // Generate unique merchant ref
    const merchantRef = `SUB-${req.officeId}-${subscription.id}-${Date.now()}`;

    // Build Fawry signature: merchantCode + merchantRefNum + amount + currencyCode + secret
    const signStr = `${FAWRY_MERCHANT}${merchantRef}${price.toFixed(2)}EGP`;
    const fawrySignature = crypto.createHmac('sha256', FAWRY_SECRET).update(signStr).digest('hex');

    // Prepare Fawry charge request body
    const chargeBody = {
      merchantCode: FAWRY_MERCHANT,
      merchantRefNum: merchantRef,
      customerName: office.name,
      customerEmail: office.email,
      customerMobile: office.phone || office.email,
      amount: price,
      currencyCode: 'EGP',
      chargeItems: [{ itemId: plan.code, description: `اشتراك ${plan.name} - ${cycle === 'yearly' ? 'سنوي' : 'شهري'}`, price, quantity: 1 }],
      signature: fawrySignature,
    };

    let fawryRefCode = merchantRef; // fallback
    let fawryPaymentUrl = null;

    // Call Fawry API (skip if credentials are dummy)
    try {
      if (FAWRY_MERCHANT && FAWRY_SECRET && FAWRY_MERCHANT !== 'dummy') {
        const fawryRes = await fetch(`${FAWRY_BASE}/charges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chargeBody),
        });
        const fawryData = await fawryRes.json();
        if (fawryData.fawryRefCode) {
          fawryRefCode = fawryData.fawryRefCode;
        }
        if (fawryData.paymentUrl) {
          fawryPaymentUrl = fawryData.paymentUrl;
        }
      }
    } catch (fawryErr) {
      console.warn('Fawry API call failed, using local ref code:', fawryErr.message);
    }

    const paymentRes = await pool.query(
      `INSERT INTO payment_transactions (office_id, subscription_id, plan_id, amount, currency, payment_method, fawry_ref_code, status, description)
       VALUES ($1, $2, $3, $4, 'EGP', 'fawry', $5, 'pending', $6) RETURNING *`,
      [req.officeId, subscription.id, plan_id, price, fawryRefCode, `تجديد اشتراك ${plan.name} (${cycle === 'yearly' ? 'سنوي' : 'شهري'})`]
    );

    res.json({
      subscription,
      payment: paymentRes.rows[0],
      fawry: {
        merchantCode: FAWRY_MERCHANT,
        merchantRef,
        fawryRefCode,
        paymentUrl: fawryPaymentUrl,
        amount: price,
        description: `اشتراك ${plan.name}`,
        customer: { name: office.name, email: office.email, mobile: office.phone || '' },
        signature: fawrySignature,
        chargeItems: chargeBody.chargeItems,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Fawry payment webhook ───
router.post('/webhook/fawry', async (req, res) => {
  try {
    const { merchantRefCode, paymentAmount, paymentStatus, fawryRefCode, signature } = req.body;

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', FAWRY_SECRET)
      .update(`${FAWRY_MERCHANT}${merchantRefCode}${paymentAmount}${paymentStatus}${fawryRefCode}`)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Extract office_id and sub_id from merchantRef: SUB-{officeId}-{subId}-{timestamp}
    const parts = merchantRefCode.split('-');
    if (parts.length < 3) return res.status(400).json({ error: 'Invalid reference' });
    const officeId = parseInt(parts[1]);
    const subId = parseInt(parts[2]);

    if (paymentStatus === 'paid') {
      // Activate subscription
      await pool.query(
        `UPDATE subscriptions SET status = 'active' WHERE id = $1 AND office_id = $2`,
        [subId, officeId]
      );
      // Update payment
      await pool.query(
        `UPDATE payment_transactions SET status = 'paid', fawry_ref_code = $1, paid_at = NOW()
         WHERE fawry_ref_code = $2`,
        [fawryRefCode, merchantRefCode]
      );
    } else {
      // Payment failed - delete pending subscription
      await pool.query(
        `DELETE FROM subscriptions WHERE id = $1 AND office_id = $2 AND status = 'pending'`,
        [subId, officeId]
      );
      // Update payment
      await pool.query(
        `UPDATE payment_transactions SET status = $1 WHERE fawry_ref_code = $2`,
        [paymentStatus, merchantRefCode]
      );
    }

    res.json({ message: 'OK' });
  } catch (err) {
    console.error('Fawry webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Manually confirm payment (for testing / cash payments) ───
router.post('/confirm', auth, async (req, res) => {
  const { subscription_id } = req.body;
  try {
    const subRes = await pool.query(
      `SELECT s.*, sp.name as plan_name, sp.code as plan_code
       FROM subscriptions s JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.id = $1 AND s.office_id = $2`,
      [subscription_id, req.officeId]
    );
    if (subRes.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });

    await pool.query(
      `UPDATE subscriptions SET status = 'active' WHERE id = $1 AND office_id = $2`,
      [subscription_id, req.officeId]
    );
    await pool.query(
      `UPDATE payment_transactions SET status = 'paid', paid_at = NOW()
       WHERE subscription_id = $1 AND office_id = $2 AND status = 'pending'`,
      [subscription_id, req.officeId]
    );

    res.json({ message: 'تم تفعيل الاشتراك بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET payment history ───
router.get('/payments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pt.*, sp.name as plan_name
       FROM payment_transactions pt
       LEFT JOIN subscription_plans sp ON pt.plan_id = sp.id
       WHERE pt.office_id = $1
       ORDER BY pt.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET usage summary ───
router.get('/usage', auth, async (req, res) => {
  try {
    const summary = await getUsageSummary(req.officeId);
    if (!summary) return res.status(404).json({ error: 'No subscription' });
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
