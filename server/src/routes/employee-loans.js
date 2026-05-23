const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authWithSubscription: auth } = require('../subscription-check');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT el.*, e.name as employee_name FROM employee_loans el JOIN employees e ON el.employee_id = e.id WHERE el.office_id = $1 ORDER BY el.created_at DESC',
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  const { employee_id, amount, description, date } = req.body;
  if (!employee_id || !amount) return res.status(400).json({ error: 'employee_id and amount required' });
  try {
    const result = await pool.query(
      'INSERT INTO employee_loans (office_id, employee_id, amount, remaining, description, date) VALUES ($1,$2,$3,$3,$4,$5) RETURNING *',
      [req.officeId, employee_id, amount, description, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/payments', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM employee_loan_payments WHERE loan_id = $1 AND office_id = $2 ORDER BY date DESC',
      [req.params.id, req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
