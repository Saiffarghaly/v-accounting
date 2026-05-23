const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authWithSubscription: auth, requireResourceLimit } = require('../subscription-check');

router.get('/', auth, async (req, res) => {
  try {
    await ensureAuditColumn();

    const result = await pool.query(
      `SELECT t.*, COALESCE(u.name, o.name) as created_by_name
       FROM transactions t
       LEFT JOIN users u ON t.created_by_user_id = u.id
       LEFT JOIN offices o ON t.office_id = o.id
       WHERE t.office_id = $1
       ORDER BY t.date DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add transaction
router.post('/', auth, requireResourceLimit('transactions'), async (req, res) => {
  const { amount, type, category, description, date } = req.body;
  try {
    await ensureAuditColumn();

    const result = await pool.query(
      'INSERT INTO transactions (office_id, created_by_user_id, amount, type, category, description, date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.officeId, req.userId, amount, type, category, description, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
