const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { waitForDb } = require('./db');
const migrate = require('./migrate');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const clientRoutes = require('./routes/clients');
const invoiceRoutes = require('./routes/invoices');
const statsRoutes = require('./routes/stats');
const userRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const treasuryRoutes = require('./routes/treasury');
const supplierRoutes = require('./suppliers');
const salariesRoutes = require('./routes/salaries');
const debtsRoutes = require('./routes/debts');
const alertsRoutes = require('./routes/alerts');
const reportsRoutes = require('./routes/reports');
const bankRoutes = require('./routes/bank');
const supplierDebtsRoutes = require('./routes/supplier-debts');
const employeeLoansRoutes = require('./routes/employee-loans');
const executiveDashboardRoutes = require('./routes/executive-dashboard');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/salaries', salariesRoutes);
app.use('/api/debts', debtsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/supplier-debts', supplierDebtsRoutes);
app.use('/api/employee-loans', employeeLoansRoutes);
app.use('/api/executive-dashboard', executiveDashboardRoutes);

app.get('/', (req, res) => {
  res.json({ message: '🎉 V-ACCOUNTING API is running!' });
});

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await waitForDb();
    await migrate();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();
