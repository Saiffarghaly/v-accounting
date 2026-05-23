const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authWithSubscription: auth } = require('../subscription-check');

/* Profit & Loss — date range */
router.get('/profit-loss', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = from && to ? `AND t.date >= $2 AND t.date <= $3` : `AND t.date >= NOW() - INTERVAL '30 days'`;
    const params = from && to ? [req.officeId, from, to] : [req.officeId];

    const summary = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'إيراد' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'مصروف' THEN amount ELSE 0 END), 0) as expenses,
        COUNT(*) as tx_count
       FROM transactions t WHERE t.office_id = $1 ${dateFilter}`,
      params
    );

    const details = await pool.query(
      `SELECT t.date, t.amount, t.type, t.category, t.description,
              COALESCE(u.name, o.name) as created_by_name
       FROM transactions t
       LEFT JOIN users u ON t.created_by_user_id = u.id
       LEFT JOIN offices o ON t.office_id = o.id
       WHERE t.office_id = $1 ${dateFilter}
       ORDER BY t.date DESC`,
      params
    );

    const row = summary.rows[0];
    const income = Number(row.income);
    const expenses = Number(row.expenses);
    res.json({
      income,
      expenses,
      profit: income - expenses,
      profitMargin: income > 0 ? Math.round(((income - expenses) / income) * 10000) / 100 : 0,
      txCount: Number(row.tx_count),
      details: details.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Monthly report — full year */
router.get('/monthly', auth, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const data = await pool.query(
      `SELECT
        TO_CHAR(date, 'Mon') as month,
        EXTRACT(MONTH FROM date) as month_num,
        COALESCE(SUM(CASE WHEN type = 'إيراد' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'مصروف' THEN amount ELSE 0 END), 0) as expenses,
        COUNT(*) as tx_count
       FROM transactions
       WHERE office_id = $1 AND EXTRACT(YEAR FROM date) = $2
       GROUP BY month_num, month
       ORDER BY month_num`,
      [req.officeId, year]
    );

    const totals = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'إيراد' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'مصروف' THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as total_tx
       FROM transactions
       WHERE office_id = $1 AND EXTRACT(YEAR FROM date) = $2`,
      [req.officeId, year]
    );

    res.json({
      year: Number(year),
      months: data.rows,
      totals: {
        income: Number(totals.rows[0].total_income),
        expenses: Number(totals.rows[0].total_expenses),
        txCount: Number(totals.rows[0].total_tx),
        profit: Number(totals.rows[0].total_income) - Number(totals.rows[0].total_expenses),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* Client statement */
router.get('/client-statement', auth, async (req, res) => {
  try {
    const { client_id, from, to } = req.query;
    if (!client_id) return res.status(400).json({ error: 'client_id required' });

    const client = await pool.query(
      `SELECT id, name, email, phone FROM clients WHERE id = $1 AND office_id = $2`,
      [client_id, req.officeId]
    );
    if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });

    const dateFilter = from && to ? `AND i.due_date >= $3 AND i.due_date <= $4` : '';
    const params = from && to ? [req.officeId, client_id, from, to] : [req.officeId, client_id];

    const invoices = await pool.query(
      `SELECT i.id, i.amount, i.status, i.due_date, i.created_at
       FROM invoices i
       WHERE i.office_id = $1 AND i.client_id = $2 ${dateFilter}
       ORDER BY i.due_date DESC NULLS LAST, i.created_at DESC`,
      params
    );

    const summary = await pool.query(
      `SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
       FROM invoices
       WHERE office_id = $1 AND client_id = $2 ${dateFilter}`,
      params
    );

    res.json({
      client: client.rows[0],
      summary: summary.rows[0],
      invoices: invoices.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
