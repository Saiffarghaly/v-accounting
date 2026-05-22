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

// Get all invoices (with items if sales type)
router.get('/', auth, async (req, res) => {
  try {
    const invoices = await pool.query(
      `SELECT invoices.*, COALESCE(invoices.client_name, clients.name) as client_name, COALESCE(users.name, offices.name) as created_by_name
       FROM invoices
       LEFT JOIN clients ON invoices.client_id = clients.id
       LEFT JOIN users ON invoices.created_by_user_id = users.id
       LEFT JOIN offices ON invoices.office_id = offices.id
       WHERE invoices.office_id = $1 
       ORDER BY invoices.created_at DESC`,
      [req.officeId]
    );

    const result = invoices.rows;
    for (const inv of result) {
      if (inv.type === 'sales') {
        const items = await pool.query(
          'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id',
          [inv.id]
        );
        inv.items = items.rows;
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add invoice (supports both simple and sales types)
router.post('/', auth, async (req, res) => {
  const { client_id, client_name, amount, status, due_date, type, items, notes } = req.body;
  const invType = type || 'simple';
  const client = await pool.query('SELECT id FROM clients WHERE office_id = $1 AND LOWER(name) = LOWER($2)', [req.officeId, client_name]);
  let resolvedClientId = client_id || null;
  let resolvedClientName = client_name || null;
  if (client.rows.length > 0) {
    resolvedClientId = client.rows[0].id;
    resolvedClientName = null;
  }

  const invAmount = invType === 'sales' && items?.length > 0
    ? items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0)
    : (amount || 0);

  try {
    const result = await pool.query(
      'INSERT INTO invoices (office_id, created_by_user_id, client_id, client_name, amount, status, due_date, type, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.officeId, req.userId, resolvedClientId, resolvedClientName, invAmount, status || 'pending', due_date, invType, notes]
    );
    const invoice = result.rows[0];

    if (invType === 'sales' && items?.length > 0) {
      for (const item of items) {
        const invItem = await pool.query(
          'SELECT id, name, quantity, sell_retail FROM inventory WHERE id = $1 AND office_id = $2',
          [item.item_id, req.officeId]
        );
        if (invItem.rows.length === 0) continue;
        const product = invItem.rows[0];
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || Number(product.sell_retail) || 0;
        const totalPrice = qty * unitPrice;

        await pool.query(
          'INSERT INTO invoice_items (office_id, invoice_id, item_id, item_name, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [req.officeId, invoice.id, product.id, product.name, qty, unitPrice, totalPrice]
        );

        await pool.query(
          'UPDATE inventory SET quantity = quantity - $1 WHERE id = $2 AND office_id = $3',
          [qty, product.id, req.officeId]
        );
      }
    }

    res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update invoice status
router.patch('/:id', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE invoices SET status = $1 WHERE id = $2 AND office_id = $3 RETURNING *',
      [status, req.params.id, req.officeId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete invoice
router.delete('/:id', auth, async (req, res) => {
  const client = await pool.query('SELECT id, type FROM invoices WHERE id = $1 AND office_id = $2', [req.params.id, req.officeId]);
  if (client.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const invoice = client.rows[0];

  if (invoice.type === 'sales') {
    const items = await pool.query('SELECT item_id, quantity FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
    for (const item of items.rows) {
      if (item.item_id) {
        await pool.query('UPDATE inventory SET quantity = quantity + $1 WHERE id = $2', [item.quantity, item.item_id]);
      }
    }
  }

  try {
    await pool.query('DELETE FROM invoices WHERE id = $1 AND office_id = $2', [req.params.id, req.officeId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
