const pool = require('./db');
const jwt = require('jsonwebtoken');

// Get subscription + plan details with auto-expiry
const getSubscription = async (officeId) => {
  const res = await pool.query(
    `SELECT s.*, sp.name as plan_name, sp.code as plan_code,
            sp.price_monthly, sp.price_yearly,
            sp.max_users, sp.max_transactions, sp.max_invoices,
            sp.max_clients, sp.max_inventory_items, sp.features
     FROM subscriptions s
     JOIN subscription_plans sp ON s.plan_id = sp.id
     WHERE s.office_id = $1 AND s.status IN ('active', 'pending')
     ORDER BY s.created_at DESC LIMIT 1`,
    [officeId]
  );
  if (res.rows.length === 0) return null;

  const sub = res.rows[0];

  // Auto-expire if past expiry date
  if (sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) < new Date()) {
    await pool.query('UPDATE subscriptions SET status = $1 WHERE id = $2', ['expired', sub.id]);
    sub.status = 'expired';
  }

  return sub;
};

// Count current usage for a resource type in the current month
const countUsage = async (officeId, resource) => {
  const queries = {
    users: `SELECT COUNT(*) as count FROM users WHERE office_id = $1`,
    transactions: `SELECT COUNT(*) as count FROM transactions WHERE office_id = $1 AND date >= date_trunc('month', CURRENT_DATE)`,
    invoices: `SELECT COUNT(*) as count FROM invoices WHERE office_id = $1 AND date >= date_trunc('month', CURRENT_DATE)`,
    clients: `SELECT COUNT(*) as count FROM clients WHERE office_id = $1`,
    inventory: `SELECT COUNT(*) as count FROM inventory WHERE office_id = $1`,
  };

  if (!queries[resource]) throw new Error(`Unknown resource: ${resource}`);

  const res = await pool.query(queries[resource], [officeId]);
  return parseInt(res.rows[0].count);
};

// Check if office can create more of a resource
const checkResourceLimit = async (officeId, resource) => {
  const sub = await getSubscription(officeId);
  if (!sub) return { allowed: false, reason: 'no_subscription' };
  if (sub.status !== 'active') return { allowed: false, reason: sub.status === 'expired' ? 'expired' : 'inactive' };

  const limitKey = `max_${resource}`;
  const limit = parseInt(sub[limitKey]);
  if (limit === -1) return { allowed: true }; // unlimited

  const usage = await countUsage(officeId, resource);
  if (usage >= limit) {
    return { allowed: false, reason: 'limit_reached', usage, limit };
  }

  return { allowed: true, usage, limit };
};

// Get full usage summary for all resources
const getUsageSummary = async (officeId) => {
  const sub = await getSubscription(officeId);
  if (!sub) return null;

  const resources = ['users', 'transactions', 'invoices', 'clients', 'inventory'];
  const summary = { subscription: sub, resources: {} };

  for (const resource of resources) {
    const limitKey = `max_${resource}`;
    const limit = parseInt(sub[limitKey]);
    const usage = await countUsage(officeId, resource);
    summary.resources[resource] = {
      usage,
      limit,
      unlimited: limit === -1,
      remaining: limit === -1 ? -1 : Math.max(0, limit - usage),
    };
  }

  return summary;
};

// Express middleware: blocks if subscription is expired
const requireActiveSubscription = async (req, res, next) => {
  try {
    const sub = await getSubscription(req.officeId);
    if (!sub) {
      return res.status(403).json({ error: 'لا يوجد اشتراك نشط', code: 'no_subscription' });
    }
    if (sub.status === 'expired') {
      return res.status(403).json({ error: 'انتهت صلاحية الاشتراك', code: 'expired' });
    }
    if (sub.status !== 'active') {
      return res.status(403).json({ error: 'الاشتراك غير نشط', code: 'inactive' });
    }
    req.subscription = sub;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Express middleware: checks a specific resource limit
const requireResourceLimit = (resource) => {
  return async (req, res, next) => {
    try {
      const result = await checkResourceLimit(req.officeId, resource);
      if (!result.allowed) {
        const messages = {
          no_subscription: 'لا يوجد اشتراك نشط',
          expired: 'انتهت صلاحية الاشتراك',
          inactive: 'الاشتراك غير نشط',
          limit_reached: `لقد وصلت للحد الأقصى لـ ${resourceLabels[resource] || resource}. قم بترقية باقتك`,
        };
        return res.status(403).json({
          error: messages[result.reason] || 'غير مسموح به',
          code: result.reason,
          usage: result.usage,
          limit: result.limit,
        });
      }
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  };
};

const resourceLabels = {
  users: 'المستخدمين',
  transactions: 'المعاملات',
  invoices: 'الفواتير',
  clients: 'العملاء',
  inventory: 'الأصناف',
};

// Combined auth + active subscription check
const authWithSubscription = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.officeId = decoded.officeId;
    req.userId = decoded.userId || null;
    req.role = decoded.role || 'owner';
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const sub = await getSubscription(req.officeId);
    if (!sub) {
      return res.status(403).json({ error: 'لا يوجد اشتراك نشط', code: 'no_subscription' });
    }
    if (sub.status === 'expired') {
      return res.status(403).json({ error: 'انتهت صلاحية الاشتراك. جدد اشتراكك من صفحة الاشتراك', code: 'expired' });
    }
    if (sub.status !== 'active') {
      return res.status(403).json({ error: 'الاشتراك غير نشط', code: 'inactive' });
    }
    req.subscription = sub;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getSubscription,
  checkResourceLimit,
  getUsageSummary,
  requireActiveSubscription,
  requireResourceLimit,
  authWithSubscription,
};
