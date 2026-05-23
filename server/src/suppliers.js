const express = require('express');
const router = express.Router();
const pool = require('./db');
const { authWithSubscription: auth } = require('./subscription-check');

// Get all suppliers
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM suppliers WHERE office_id = $1 ORDER BY created_at DESC',
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add supplier
router.post('/', auth, async (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO suppliers (office_id, name, email, phone, address) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.officeId, name, email, phone, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete supplier
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM suppliers WHERE id=$1 AND office_id=$2', [req.params.id, req.officeId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add transaction for supplier
router.post('/:id/transactions', auth, async (req, res) => {
  const { amount, type, description, date } = req.body;
  try {
    await pool.query(
      'INSERT INTO supplier_transactions (office_id, supplier_id, amount, type, description, date) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.officeId, req.params.id, amount, type, description, date]
    );
    // Update balance
    const balanceChange = type === 'مدفوع' ? -Number(amount) : Number(amount);
    await pool.query(
      'UPDATE suppliers SET balance = balance + $1 WHERE id=$2 AND office_id=$3',
      [balanceChange, req.params.id, req.officeId]
    );
    res.status(201).json({ message: 'Transaction added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get supplier transactions
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM supplier_transactions WHERE supplier_id=$1 AND office_id=$2 ORDER BY created_at DESC',
      [req.params.id, req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;