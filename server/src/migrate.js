const pool = require('./db');

const migrate = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS offices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        subscription_plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'accountant',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
        amount DECIMAL(12,2) NOT NULL,
        type VARCHAR(20) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        due_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee';
      CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  buy_price DECIMAL(12,2) DEFAULT 0,
  sell_wholesale DECIMAL(12,2) DEFAULT 0,
  sell_retail DECIMAL(12,2) DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  unit VARCHAR(50) DEFAULT 'قطعة',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_returns (
  id SERIAL PRIMARY KEY,
  office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT,
  type VARCHAR(20) DEFAULT 'return',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_damages (
  id SERIAL PRIMARY KEY,
  office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treasury_movements (
  id SERIAL PRIMARY KEY,
  office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  source VARCHAR(30) NOT NULL CHECK (source IN ('cash', 'vodafone_cash', 'instapay')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
    `);

    console.log('✅ All tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
};

migrate();
