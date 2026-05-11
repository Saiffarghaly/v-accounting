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

// Get all invoices
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT invoices.*, clients.name as client_name 
       FROM invoices 
       LEFT JOIN clients ON invoices.client_id = clients.id
       WHERE invoices.office_id = $1 
       ORDER BY invoices.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add invoice
router.post('/', auth, async (req, res) => {
  const { client_id, amount, status, due_date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO invoices (office_id, client_id, amount, status, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.officeId, client_id, amount, status, due_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update invoice status
router.patch('/:id', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE invoices SET status = $1 WHERE id = $2 AND office_id = $3 RETURNING *',
      [status, req.params.id, req.officeId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM invoices WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;