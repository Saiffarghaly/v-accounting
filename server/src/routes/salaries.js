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

// Get all employees
router.get('/employees', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM employees WHERE office_id = $1 ORDER BY created_at DESC',
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add employee
router.post('/employees', auth, async (req, res) => {
  const { name, phone, salary, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO employees (office_id, created_by_user_id, name, phone, salary, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.officeId, req.userId, name, phone, salary || 0, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete employee
router.delete('/employees/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id=$1 AND office_id=$2', [req.params.id, req.officeId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payments (optional ?month=YYYY-MM filter)
router.get('/payments', auth, async (req, res) => {
  try {
    let query = `
      SELECT ep.*, e.name as employee_name
      FROM employee_payments ep
      JOIN employees e ON ep.employee_id = e.id
      WHERE ep.office_id = $1
    `;
    const params = [req.officeId];
    if (req.query.month) {
      query += ' AND ep.month = $2';
      params.push(req.query.month);
    }
    query += ' ORDER BY ep.date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Record salary payment
router.post('/payments', auth, async (req, res) => {
  const { employee_id, amount, month, date, notes } = req.body;
  if (!employee_id || !amount || !month) {
    return res.status(400).json({ error: 'employee_id, amount, and month are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO employee_payments (office_id, created_by_user_id, employee_id, amount, month, date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.officeId, req.userId, employee_id, amount, month, date || new Date().toISOString().split('T')[0], notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Monthly report
router.get('/report/:month', auth, async (req, res) => {
  const { month } = req.params;
  try {
    const employees = await pool.query(
      'SELECT * FROM employees WHERE office_id = $1',
      [req.officeId]
    );
    const payments = await pool.query(
      'SELECT ep.*, e.name as employee_name FROM employee_payments ep JOIN employees e ON ep.employee_id = e.id WHERE ep.office_id = $1 AND ep.month = $2',
      [req.officeId, month]
    );
    const report = employees.rows.map(emp => {
      const paid = payments.rows
        .filter(p => p.employee_id === emp.id)
        .reduce((s, p) => s + Number(p.amount), 0);
      return {
        employee_id: emp.id,
        employee_name: emp.name,
        salary: Number(emp.salary),
        paid,
        remaining: Number(emp.salary) - paid,
      };
    });
    res.json({
      month,
      total_employees: employees.rows.length,
      total_salaries: report.reduce((s, r) => s + r.salary, 0),
      total_paid: report.reduce((s, r) => s + r.paid, 0),
      total_remaining: report.reduce((s, r) => s + r.remaining, 0),
      details: report,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
