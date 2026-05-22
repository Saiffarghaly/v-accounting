const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.officeId = decoded.officeId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all debts
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cd.*, COALESCE(cd.client_name, c.name) as client_name FROM client_debts cd LEFT JOIN clients c ON cd.client_id = c.id WHERE cd.office_id = $1 ORDER BY cd.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create debt
router.post('/', auth, async (req, res) => {
  const { client_id, client_name, amount, description, due_date } = req.body;
  if ((!client_id && !client_name) || !amount) return res.status(400).json({ error: 'client_id or client_name, and amount required' });
  try {
    const result = await pool.query(
      'INSERT INTO client_debts (office_id, client_id, client_name, amount, remaining, description, due_date) VALUES ($1,$2,$3,$4,$4,$5,$6) RETURNING *',
      [req.officeId, client_id || null, client_name || null, amount, description, due_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payments for a debt
router.get('/:id/payments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM debt_payments WHERE debt_id = $1 AND office_id = $2 ORDER BY date DESC',
      [req.params.id, req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Record payment against debt
router.post('/:id/payments', auth, async (req, res) => {
  const { amount, date, notes } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  try {
    await pool.query(
      'INSERT INTO debt_payments (office_id, debt_id, amount, date, notes) VALUES ($1,$2,$3,$4,$5)',
      [req.officeId, req.params.id, amount, date || new Date().toISOString().split('T')[0], notes]
    );
    await pool.query(
      'UPDATE client_debts SET remaining = remaining - $1 WHERE id = $2 AND office_id = $3',
      [amount, req.params.id, req.officeId]
    );
    await pool.query(
      "UPDATE client_debts SET status = 'paid' WHERE id = $1 AND remaining <= 0 AND office_id = $2",
      [req.params.id, req.officeId]
    );
    res.status(201).json({ message: 'Payment recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get overdue debts
router.get('/overdue', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cd.*, COALESCE(cd.client_name, c.name) as client_name FROM client_debts cd LEFT JOIN clients c ON cd.client_id = c.id WHERE cd.office_id = $1 AND cd.status = 'active' AND cd.due_date < CURRENT_DATE AND cd.remaining > 0 ORDER BY cd.due_date ASC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
