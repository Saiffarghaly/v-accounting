const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { requireResourceLimit } = require('../subscription-check');

// Middleware to verify token
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

const ensureAuditColumn = async () => {
  await pool.query(
    'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL'
  );
};

// Get all transactions for this office
router.get('/', auth, async (req, res) => {
  try {
    await ensureAuditColumn();

    const result = await pool.query(
      `SELECT t.*, COALESCE(u.name, o.name) as created_by_name
       FROM transactions t
       LEFT JOIN users u ON t.created_by_user_id = u.id
       LEFT JOIN offices o ON t.office_id = o.id
       WHERE t.office_id = $1
       ORDER BY t.date DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add transaction
router.post('/', auth, requireResourceLimit('transactions'), async (req, res) => {
  const { amount, type, category, description, date } = req.body;
  try {
    await ensureAuditColumn();

    const result = await pool.query(
      'INSERT INTO transactions (office_id, created_by_user_id, amount, type, category, description, date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.officeId, req.userId, amount, type, category, description, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
