const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db');

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: '🎉 V-ACCOUNTING API is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
const transactionRoutes = require('./routes/transactions');
app.use('/api/transactions', transactionRoutes);
const clientRoutes = require('./routes/clients');
app.use('/api/clients', clientRoutes);
const invoiceRoutes = require('./routes/invoices');
app.use('/api/invoices', invoiceRoutes);
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
const inventoryRoutes = require('./routes/inventory');
app.use('/api/inventory', inventoryRoutes);
const treasuryRoutes = require('./routes/treasury');
app.use('/api/treasury', treasuryRoutes);
const supplierRoutes = require('./suppliers');
app.use('/api/suppliers', supplierRoutes);
const salariesRoutes = require('./routes/salaries');
app.use('/api/salaries', salariesRoutes);
const debtsRoutes = require('./routes/debts');
app.use('/api/debts', debtsRoutes);
const alertsRoutes = require('./routes/alerts');
app.use('/api/alerts', alertsRoutes);