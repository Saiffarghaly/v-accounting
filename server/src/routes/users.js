const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { authWithSubscription: auth, requireResourceLimit } = require('../subscription-check');

const ownerOnly = (req, res, next) => {
  if (req.role !== 'owner') return res.status(403).json({ error: 'Owner only' });
  next();
};

const ensureAuditColumn = async () => {
  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL'
  );
};

// Get all users in office
router.get('/', auth, async (req, res) => {
  try {
    await ensureAuditColumn();

    const result = await pool.query(
      `SELECT users.id, users.name, users.email, users.role, users.created_at, COALESCE(creator.name, offices.name) as created_by_name
       FROM users
       LEFT JOIN users creator ON users.created_by_user_id = creator.id
       LEFT JOIN offices ON users.office_id = offices.id
       WHERE users.office_id = $1
       ORDER BY users.created_at DESC`,
      [req.officeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add user to office
router.post('/', auth, ownerOnly, requireResourceLimit('users'), async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    await ensureAuditColumn();

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (office_id, created_by_user_id, name, email, password, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role',
      [req.officeId, req.userId, name, email, hashedPassword, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/:id', auth, ownerOnly, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM users WHERE id = $1 AND office_id = $2',
      [req.params.id, req.officeId]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Get office info
    const officeResult = await pool.query('SELECT * FROM offices WHERE id = $1', [user.office_id]);
    const office = officeResult.rows[0];

    const token = jwt.sign(
      { officeId: user.office_id, userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, office: { id: office.id, name: office.name, email: office.email }, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
