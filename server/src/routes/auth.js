const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Register new office
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    // Check if email exists
    const exists = await pool.query('SELECT id FROM offices WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create office
    const result = await pool.query(
      'INSERT INTO offices (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
      [name, email, hashedPassword, phone]
    );

    const office = result.rows[0];

    // Auto-create free subscription
    await pool.query(
      `INSERT INTO subscriptions (office_id, plan_id)
       SELECT $1, id FROM subscription_plans WHERE code = 'free'
       WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE office_id = $1)`,
      [office.id]
    );

    // Generate token
    const token = jwt.sign(
      { officeId: office.id, email: office.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, office });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find office
    const result = await pool.query('SELECT * FROM offices WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const office = result.rows[0];

    // Check password
    const valid = await bcrypt.compare(password, office.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { officeId: office.id, email: office.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, office: { id: office.id, name: office.name, email: office.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;