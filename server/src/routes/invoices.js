const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authWithSubscription: auth, requireResourceLimit } = require('../subscription-check');

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
router.post('/', auth, requireResourceLimit('invoices'), async (req, res) => {
  const { client_id, client_name, amount, status, due_date, type, items, notes } = req.body;
  const invType = type || 'simple';
  const invStatus = status || 'pending';
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

  const pgClient = await pool.connect();
  try {
    await pgClient.query('BEGIN');

    const result = await pgClient.query(
      'INSERT INTO invoices (office_id, created_by_user_id, client_id, client_name, amount, status, due_date, type, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.officeId, req.userId, resolvedClientId, resolvedClientName, invAmount, invStatus, due_date, invType, notes]
    );
    const invoice = result.rows[0];

    if (invType === 'sales' && items?.length > 0) {
      for (const item of items) {
        const invItem = await pgClient.query(
          'SELECT id, name, quantity, sell_retail FROM inventory WHERE id = $1 AND office_id = $2',
          [item.item_id, req.officeId]
        );
        if (invItem.rows.length === 0) continue;
        const product = invItem.rows[0];
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || Number(product.sell_retail) || 0;
        const totalPrice = qty * unitPrice;

        await pgClient.query(
          'INSERT INTO invoice_items (office_id, invoice_id, item_id, item_name, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [req.officeId, invoice.id, product.id, product.name, qty, unitPrice, totalPrice]
        );

        await pgClient.query(
          'UPDATE inventory SET quantity = quantity - $1 WHERE id = $2 AND office_id = $3',
          [qty, product.id, req.officeId]
        );
      }
    }

    // If paid, record income + treasury
    if (invStatus === 'paid' && invAmount > 0) {
      const desc = `فاتورة مبيعات #${invoice.id} - ${resolvedClientName || ''}`;
      await pgClient.query(
        "INSERT INTO transactions (office_id, created_by_user_id, amount, type, category, description, invoice_id) VALUES ($1,$2,$3,'إيراد','مبيعات',$4,$5)",
        [req.officeId, req.userId, invAmount, desc, invoice.id]
      );
      await pgClient.query(
        "INSERT INTO treasury_movements (office_id, created_by_user_id, type, source, amount, description, invoice_id) VALUES ($1,$2,'deposit','cash',$3,$4,$5)",
        [req.officeId, req.userId, invAmount, desc, invoice.id]
      );
    }

    await pgClient.query('COMMIT');
    res.status(201).json(invoice);
  } catch (err) {
    await pgClient.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    pgClient.release();
  }
});

// Update invoice status (when changing to 'paid', record income + treasury)
router.patch('/:id', auth, async (req, res) => {
  const { status } = req.body;
  const pgClient = await pool.connect();
  try {
    await pgClient.query('BEGIN');

    const before = await pgClient.query(
      'SELECT id, amount, type, status, client_name, client_id FROM invoices WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );
    if (before.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const result = await pgClient.query(
      'UPDATE invoices SET status = $1 WHERE id = $2 AND office_id = $3 RETURNING *',
      [status, req.params.id, req.officeId]
    );
    const invoice = result.rows[0];

    // If transitioning from pending/unpaid to paid, record income + treasury
    const wasUnpaid = before.rows[0].status !== 'paid';
    if (wasUnpaid && status === 'paid' && invoice.type === 'sales' && Number(invoice.amount) > 0) {
      const name = invoice.client_name || '';
      const desc = `فاتورة مبيعات #${invoice.id} - ${name}`;
      await pgClient.query(
        "INSERT INTO transactions (office_id, created_by_user_id, amount, type, category, description, invoice_id) VALUES ($1,$2,$3,'إيراد','مبيعات',$4,$5)",
        [req.officeId, req.userId, invoice.amount, desc, invoice.id]
      );
      await pgClient.query(
        "INSERT INTO treasury_movements (office_id, created_by_user_id, type, source, amount, description, invoice_id) VALUES ($1,$2,'deposit','cash',$3,$4,$5)",
        [req.officeId, req.userId, invoice.amount, desc, invoice.id]
      );
    }

    await pgClient.query('COMMIT');
    res.json(invoice);
  } catch (err) {
    await pgClient.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    pgClient.release();
  }
});

// Delete invoice (also removes linked income + treasury entries + restores stock)
router.delete('/:id', auth, async (req, res) => {
  const pgClient = await pool.connect();
  try {
    await pgClient.query('BEGIN');

    const invResult = await pgClient.query(
      'SELECT id, type, amount FROM invoices WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );
    if (invResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const invoice = invResult.rows[0];

    // Restore stock for sales invoices
    if (invoice.type === 'sales') {
      const items = await pgClient.query(
        'SELECT item_id, quantity FROM invoice_items WHERE invoice_id = $1',
        [invoice.id]
      );
      for (const item of items.rows) {
        if (item.item_id) {
          await pgClient.query(
            'UPDATE inventory SET quantity = quantity + $1 WHERE id = $2',
            [item.quantity, item.item_id]
          );
        }
      }
    }

    // Delete linked treasury movement
    await pgClient.query(
      'DELETE FROM treasury_movements WHERE invoice_id = $1 AND office_id = $2',
      [invoice.id, req.officeId]
    );

    // Delete linked transaction
    await pgClient.query(
      'DELETE FROM transactions WHERE invoice_id = $1 AND office_id = $2',
      [invoice.id, req.officeId]
    );

    // Delete invoice
    await pgClient.query(
      'DELETE FROM invoices WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );

    await pgClient.query('COMMIT');
    res.json({ message: 'Deleted' });
  } catch (err) {
    await pgClient.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    pgClient.release();
  }
});

module.exports = router;
