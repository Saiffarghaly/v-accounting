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

router.get('/', auth, async (req, res) => {
  try {
    const dueInvoices = await pool.query(
      "SELECT id, client_id, COALESCE(client_name, '') as client_name, amount, due_date FROM invoices WHERE office_id = $1 AND status = 'pending' AND due_date IS NOT NULL AND due_date <= CURRENT_DATE + INTERVAL '3 days' ORDER BY due_date ASC",
      [req.officeId]
    );

    const lowInventory = await pool.query(
      'SELECT id, name, quantity, min_quantity, unit FROM inventory WHERE office_id = $1 AND quantity <= min_quantity ORDER BY quantity ASC',
      [req.officeId]
    );

    const todaySummary = await pool.query(
      "SELECT COALESCE(SUM(CASE WHEN type = 'إيراد' THEN amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN type = 'مصروفات' THEN amount ELSE 0 END), 0) as expenses FROM transactions WHERE office_id = $1 AND date = CURRENT_DATE",
      [req.officeId]
    );

    const overdueDebts = await pool.query(
      "SELECT cd.id, COALESCE(cd.client_name, c.name) as client_name, cd.amount, cd.remaining, cd.due_date FROM client_debts cd LEFT JOIN clients c ON cd.client_id = c.id WHERE cd.office_id = $1 AND cd.status = 'active' AND cd.due_date < CURRENT_DATE AND cd.remaining > 0 ORDER BY cd.due_date ASC",
      [req.officeId]
    );

    res.json({
      due_invoices: dueInvoices.rows,
      low_inventory: lowInventory.rows,
      daily_summary: todaySummary.rows[0] || { income: 0, expenses: 0 },
      overdue_debts: overdueDebts.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
