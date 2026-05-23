const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authWithSubscription: auth } = require('../subscription-check');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT sd.*, s.name as supplier_name FROM supplier_debts sd JOIN suppliers s ON sd.supplier_id = s.id WHERE sd.office_id = $1 ORDER BY sd.created_at DESC',
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  const { supplier_id, amount, description, due_date } = req.body;
  if (!supplier_id || !amount) return res.status(400).json({ error: 'supplier_id and amount required' });
  try {
    const result = await pool.query(
      'INSERT INTO supplier_debts (office_id, supplier_id, amount, description, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.officeId, supplier_id, amount, description, due_date]
    );
    await pool.query(
      'UPDATE suppliers SET balance = balance + $1 WHERE id = $2 AND office_id = $3',
      [amount, supplier_id, req.officeId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
