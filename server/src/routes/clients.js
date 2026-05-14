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
    req.userId = decoded.userId || null;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const ensureAuditColumn = async () => {
  await pool.query(
    'ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL'
  );
};

// Get all clients
router.get('/', auth, async (req, res) => {
  try {
    await ensureAuditColumn();

    const result = await pool.query(
      `SELECT c.*, COALESCE(u.name, o.name) as created_by_name
       FROM clients c
       LEFT JOIN users u ON c.created_by_user_id = u.id
       LEFT JOIN offices o ON c.office_id = o.id
       WHERE c.office_id = $1
       ORDER BY c.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add client
router.post('/', auth, async (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    await ensureAuditColumn();

    const result = await pool.query(
      'INSERT INTO clients (office_id, created_by_user_id, name, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.officeId, req.userId, name, email, phone, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete client
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM clients WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
