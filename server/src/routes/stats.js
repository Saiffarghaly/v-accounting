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
    const income = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE office_id = $1 AND type = 'إيراد'`,
      [req.officeId]
    );
    const expenses = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE office_id = $1 AND type = 'مصروف'`,
      [req.officeId]
    );
    const clients = await pool.query(
      `SELECT COUNT(*) as total FROM clients WHERE office_id = $1`,
      [req.officeId]
    );
    const pendingInvoices = await pool.query(
      `SELECT COUNT(*) as total FROM invoices WHERE office_id = $1 AND status = 'pending'`,
      [req.officeId]
    );
    const recentTransactions = await pool.query(
      `SELECT * FROM transactions WHERE office_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [req.officeId]
    );
    const monthlyData = await pool.query(
      `SELECT 
        TO_CHAR(date, 'Mon') as month,
        SUM(CASE WHEN type = 'إيراد' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'مصروف' THEN amount ELSE 0 END) as expenses
       FROM transactions 
       WHERE office_id = $1 AND date >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(date, 'Mon'), DATE_TRUNC('month', date)
       ORDER BY DATE_TRUNC('month', date)`,
      [req.officeId]
    );

    res.json({
      income: Number(income.rows[0].total),
      expenses: Number(expenses.rows[0].total),
      profit: Number(income.rows[0].total) - Number(expenses.rows[0].total),
      clients: Number(clients.rows[0].total),
      pendingInvoices: Number(pendingInvoices.rows[0].total),
      recentTransactions: recentTransactions.rows,
      monthlyData: monthlyData.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;