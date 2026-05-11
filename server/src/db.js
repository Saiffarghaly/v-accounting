const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch((err) => console.error('❌ Database connection error:', err));

module.exports = pool;