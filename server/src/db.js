const { Pool } = require('pg');
require('dotenv').config();

const url = process.env.DATABASE_URL;
const isLocal = url && (url.includes('@localhost') || url.includes('@127.0.0.1'));
const pool = new Pool({
  connectionString: url,
  ssl: url && !isLocal ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

const waitForDb = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('✅ Database connected successfully');
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ Database connection attempt ${i + 1}/${retries}: ${err.message}`);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Failed to connect to database after retries');
};

module.exports = pool;
module.exports.waitForDb = waitForDb;