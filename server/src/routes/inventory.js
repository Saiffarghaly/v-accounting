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

// Get all items
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM inventory WHERE office_id = $1 ORDER BY created_at DESC',
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add item
router.post('/', auth, async (req, res) => {
  const { name, category, buy_price, sell_wholesale, sell_retail, quantity, min_quantity, unit } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO inventory (office_id, name, category, buy_price, sell_wholesale, sell_retail, quantity, min_quantity, unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.officeId, name, category, buy_price, sell_wholesale, sell_retail, quantity, min_quantity, unit]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update item
router.put('/:id', auth, async (req, res) => {
  const { name, category, buy_price, sell_wholesale, sell_retail, quantity, min_quantity, unit } = req.body;
  try {
    const result = await pool.query(
      'UPDATE inventory SET name=$1, category=$2, buy_price=$3, sell_wholesale=$4, sell_retail=$5, quantity=$6, min_quantity=$7, unit=$8 WHERE id=$9 AND office_id=$10 RETURNING *',
      [name, category, buy_price, sell_wholesale, sell_retail, quantity, min_quantity, unit, req.params.id, req.officeId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete item
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id=$1 AND office_id=$2', [req.params.id, req.officeId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add return
router.post('/returns', auth, async (req, res) => {
  const { item_id, quantity, reason, type } = req.body;
  try {
    await pool.query(
      'INSERT INTO inventory_returns (office_id, item_id, quantity, reason, type) VALUES ($1,$2,$3,$4,$5)',
      [req.officeId, item_id, quantity, reason, type]
    );
    // Update quantity
    if (type === 'return') {
      await pool.query('UPDATE inventory SET quantity = quantity + $1 WHERE id=$2 AND office_id=$3', [quantity, item_id, req.officeId]);
    }
    res.status(201).json({ message: 'Return added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get returns
router.get('/returns', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ir.*, i.name as item_name FROM inventory_returns ir
       LEFT JOIN inventory i ON ir.item_id = i.id
       WHERE ir.office_id = $1 ORDER BY ir.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add damage
router.post('/damages', auth, async (req, res) => {
  const { item_id, quantity, reason } = req.body;
  try {
    await pool.query(
      'INSERT INTO inventory_damages (office_id, item_id, quantity, reason) VALUES ($1,$2,$3,$4)',
      [req.officeId, item_id, quantity, reason]
    );
    await pool.query('UPDATE inventory SET quantity = quantity - $1 WHERE id=$2 AND office_id=$3', [quantity, item_id, req.officeId]);
    res.status(201).json({ message: 'Damage recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get damages
router.get('/damages', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id.*, i.name as item_name FROM inventory_damages id
       LEFT JOIN inventory i ON id.item_id = i.id
       WHERE id.office_id = $1 ORDER BY id.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;