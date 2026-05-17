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

/* GET /api/bank — list accounts */
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, bank_name, account_name, account_number, iban, swift, currency, balance, created_at
       FROM bank_accounts WHERE office_id = $1 ORDER BY created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* POST /api/bank — add account */
router.post('/', auth, async (req, res) => {
  try {
    const { bank_name, account_name, account_number, iban, swift, currency, balance } = req.body;
    if (!bank_name || !account_name) return res.status(400).json({ error: 'bank_name and account_name required' });
    const result = await pool.query(
      `INSERT INTO bank_accounts (office_id, bank_name, account_name, account_number, iban, swift, currency, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.officeId, bank_name, account_name, account_number || null, iban || null, swift || null, currency || 'EGP', balance || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* DELETE /api/bank/:id */
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM bank_accounts WHERE id = $1 AND office_id = $2', [req.params.id, req.officeId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/bank/transactions/:account_id */
router.get('/transactions/:account_id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bank_transactions WHERE account_id = $1 AND office_id = $2 ORDER BY date DESC`,
      [req.params.account_id, req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* POST /api/bank/transactions — add transaction */
router.post('/transactions', auth, async (req, res) => {
  try {
    const { account_id, type, amount, description, date, reference } = req.body;
    if (!account_id || !type || !amount) return res.status(400).json({ error: 'account_id, type, amount required' });
    const result = await pool.query(
      `INSERT INTO bank_transactions (account_id, office_id, type, amount, description, date, reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [account_id, req.officeId, type, amount, description || null, date || new Date(), reference || null]
    );
    /* update account balance */
    const sign = type === 'deposit' ? 1 : -1;
    await pool.query(
      `UPDATE bank_accounts SET balance = balance + ($1 * $2) WHERE id = $3 AND office_id = $4`,
      [sign, amount, account_id, req.officeId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* POST /api/bank/upload-csv — bulk import CSV transactions */
router.post('/upload-csv', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { account_id, transactions } = req.body;
    if (!account_id || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'account_id and transactions array required' });
    }
    let count = 0;
    await client.query('BEGIN');
    for (const tx of transactions) {
      const { type, amount, description, date, reference } = tx;
      if (!type || !amount) continue;
      await client.query(
        `INSERT INTO bank_transactions (account_id, office_id, type, amount, description, date, reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [account_id, req.officeId, type, amount, description || null, date || new Date(), reference || null]
      );
      const sign = type === 'deposit' ? 1 : -1;
      await client.query(
        `UPDATE bank_accounts SET balance = balance + ($1 * $2) WHERE id = $3 AND office_id = $4`,
        [sign, amount, account_id, req.officeId]
      );
      count++;
    }
    await client.query('COMMIT');
    res.json({ success: true, imported: count });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
