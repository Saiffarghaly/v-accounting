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

const allowedTypes = ['deposit', 'withdraw'];
const allowedSources = ['cash', 'vodafone_cash', 'instapay'];

const getSummary = async (officeId) => {
  const totals = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS total_deposits,
       COALESCE(SUM(CASE WHEN type = 'withdraw' THEN amount ELSE 0 END), 0) AS total_withdrawals,
       COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS balance
     FROM treasury_movements
     WHERE office_id = $1`,
    [officeId]
  );

  const bySource = await pool.query(
    `SELECT
       source,
       COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS balance,
       COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS deposits,
       COALESCE(SUM(CASE WHEN type = 'withdraw' THEN amount ELSE 0 END), 0) AS withdrawals
     FROM treasury_movements
     WHERE office_id = $1
     GROUP BY source`,
    [officeId]
  );

  const sources = allowedSources.reduce((acc, source) => {
    acc[source] = { balance: 0, deposits: 0, withdrawals: 0 };
    return acc;
  }, {});

  bySource.rows.forEach((row) => {
    sources[row.source] = {
      balance: Number(row.balance),
      deposits: Number(row.deposits),
      withdrawals: Number(row.withdrawals),
    };
  });

  return {
    totalDeposits: Number(totals.rows[0].total_deposits),
    totalWithdrawals: Number(totals.rows[0].total_withdrawals),
    balance: Number(totals.rows[0].balance),
    sources,
  };
};

router.get('/', auth, async (req, res) => {
  try {
    const movements = await pool.query(
      'SELECT * FROM treasury_movements WHERE office_id = $1 ORDER BY date DESC, created_at DESC',
      [req.officeId]
    );
    const summary = await getSummary(req.officeId);
    res.json({ movements: movements.rows, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  const { type, source, amount, description, date } = req.body;
  const value = Number(amount);

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid movement type' });
  }
  if (!allowedSources.includes(source)) {
    return res.status(400).json({ error: 'Invalid money source' });
  }
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero' });
  }

  try {
    if (type === 'withdraw') {
      const balanceResult = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS balance
         FROM treasury_movements
         WHERE office_id = $1 AND source = $2`,
        [req.officeId, source]
      );
      const sourceBalance = Number(balanceResult.rows[0].balance);
      if (value > sourceBalance) {
        return res.status(400).json({ error: 'Insufficient source balance' });
      }
    }

    const result = await pool.query(
      `INSERT INTO treasury_movements (office_id, type, source, amount, description, date)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE))
       RETURNING *`,
      [req.officeId, type, source, value, description || '', date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM treasury_movements WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
