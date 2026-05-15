const { Pool } = require('pg');
require('dotenv').config();

const url = process.env.DATABASE_URL;
const isLocal = url && (url.includes('@localhost') || url.includes('@127.0.0.1'));
let pool = new Pool({
  connectionString: url,
  ssl: url && !isLocal ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

module.exports = pool;