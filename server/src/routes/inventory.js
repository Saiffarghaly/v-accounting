const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { requireResourceLimit } = require('../subscription-check');

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

const ensureAuditColumns = async () => {
  await pool.query(`
    ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE inventory_returns ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE inventory_damages ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);
};

// Get all items
router.get('/', auth, async (req, res) => {
  try {
    await ensureAuditColumns();

    const result = await pool.query(
      `SELECT i.*, COALESCE(u.name, o.name) as created_by_name, s.name as supplier_name
       FROM inventory i
       LEFT JOIN users u ON i.created_by_user_id = u.id
       LEFT JOIN offices o ON i.office_id = o.id
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       WHERE i.office_id = $1
       ORDER BY i.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add item (optionally record expense + treasury withdrawal)
router.post('/', auth, requireResourceLimit('inventory'), async (req, res) => {
  const { name, category, buy_price, sell_wholesale, sell_retail, quantity, min_quantity, unit, supplier_id, record_expense } = req.body;
  try {
    await ensureAuditColumns();

    const pgClient = await pool.connect();
    try {
      await pgClient.query('BEGIN');

      const result = await pgClient.query(
        'INSERT INTO inventory (office_id, created_by_user_id, name, category, buy_price, sell_wholesale, sell_retail, quantity, min_quantity, unit, supplier_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
        [req.officeId, req.userId, name, category, buy_price, sell_wholesale, sell_retail, quantity, min_quantity, unit, supplier_id || null]
      );
      const item = result.rows[0];

      if (record_expense && Number(buy_price) > 0 && Number(quantity) > 0) {
        const expAmount = Number(buy_price) * Number(quantity);
        const desc = `مشتريات مخزن: ${item.name} (${quantity} ${unit})`;
        await pgClient.query(
          "INSERT INTO transactions (office_id, created_by_user_id, amount, type, category, description) VALUES ($1,$2,$3,'مصروف','مشتريات',$4)",
          [req.officeId, req.userId, expAmount, desc]
        );
        await pgClient.query(
          "INSERT INTO treasury_movements (office_id, created_by_user_id, type, source, amount, description) VALUES ($1,$2,'withdraw','cash',$3,$4)",
          [req.officeId, req.userId, expAmount, desc]
        );
      }

      await pgClient.query('COMMIT');
      res.status(201).json(item);
    } catch (err) {
      await pgClient.query('ROLLBACK');
      throw err;
    } finally {
      pgClient.release();
    }
  } catch (err) {
    console.error(err);
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

// Link item to supplier
router.patch('/:id/supplier', auth, async (req, res) => {
  const { supplier_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE inventory SET supplier_id = $1 WHERE id = $2 AND office_id = $3 RETURNING *',
      [supplier_id || null, req.params.id, req.officeId]
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
    await ensureAuditColumns();

    await pool.query(
      'INSERT INTO inventory_returns (office_id, created_by_user_id, item_id, quantity, reason, type) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.officeId, req.userId, item_id, quantity, reason, type]
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
    await ensureAuditColumns();

    const result = await pool.query(
      `SELECT ir.*, i.name as item_name, COALESCE(u.name, o.name) as created_by_name FROM inventory_returns ir
       LEFT JOIN inventory i ON ir.item_id = i.id
       LEFT JOIN users u ON ir.created_by_user_id = u.id
       LEFT JOIN offices o ON ir.office_id = o.id
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
    await ensureAuditColumns();

    await pool.query(
      'INSERT INTO inventory_damages (office_id, created_by_user_id, item_id, quantity, reason) VALUES ($1,$2,$3,$4,$5)',
      [req.officeId, req.userId, item_id, quantity, reason]
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
    await ensureAuditColumns();

    const result = await pool.query(
      `SELECT id.*, i.name as item_name, COALESCE(u.name, o.name) as created_by_name FROM inventory_damages id
       LEFT JOIN inventory i ON id.item_id = i.id
       LEFT JOIN users u ON id.created_by_user_id = u.id
       LEFT JOIN offices o ON id.office_id = o.id
       WHERE id.office_id = $1 ORDER BY id.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
