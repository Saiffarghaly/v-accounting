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

router.get('/', auth, async (req, res) => {
  const { startDate, endDate } = req.query;

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const sDate = startDate || defaultStart;
  const eDate = endDate || defaultEnd;

  try {
    const incomeP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE office_id=$1 AND type='إيراد' AND date>=$2 AND date<=$3`,
      [req.officeId, sDate, eDate]
    );
    const expensesP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE office_id=$1 AND type='مصروف' AND date>=$2 AND date<=$3`,
      [req.officeId, sDate, eDate]
    );
    const salariesP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM employee_payments WHERE office_id=$1 AND date>=$2 AND date<=$3`,
      [req.officeId, sDate, eDate]
    );
    const damagesP = pool.query(
      `SELECT COALESCE(SUM(d.quantity * i.buy_price),0) as total
       FROM inventory_damages d JOIN inventory i ON d.item_id=i.id
       WHERE d.office_id=$1 AND d.date>=$2 AND d.date<=$3`,
      [req.officeId, sDate, eDate]
    );

    const treasuryP = pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END),0) as balance
       FROM treasury_movements WHERE office_id=$1`,
      [req.officeId]
    );
    const bankTotalP = pool.query(
      `SELECT COALESCE(SUM(balance),0) as total FROM bank_accounts WHERE office_id=$1`,
      [req.officeId]
    );

    const receivablesP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM invoices WHERE office_id=$1 AND status NOT IN ('paid','cancelled')`,
      [req.officeId]
    );
    const payablesP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM supplier_debts WHERE office_id=$1 AND status='active'`,
      [req.officeId]
    );

    const cashBySourceP = pool.query(
      `SELECT source, COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END),0) as balance
       FROM treasury_movements WHERE office_id=$1 GROUP BY source`,
      [req.officeId]
    );
    const banksP = pool.query(
      `SELECT id, bank_name, account_name, balance FROM bank_accounts WHERE office_id=$1 ORDER BY bank_name`,
      [req.officeId]
    );

    const salesRevenueP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM transactions WHERE office_id=$1 AND type='إيراد' AND category='مبيعات' AND date>=$2 AND date<=$3`,
      [req.officeId, sDate, eDate]
    );

    const [
      incomeRes, expensesRes, salariesRes, damagesRes,
      treasuryRes, bankTotalRes,
      receivablesRes, payablesRes,
      cashBySourceRes, banksRes,
      salesRevenueRes
    ] = await Promise.all([
      incomeP, expensesP, salariesP, damagesP,
      treasuryP, bankTotalP,
      receivablesP, payablesP,
      cashBySourceP, banksP,
      salesRevenueP
    ]);

    const income = Number(incomeRes.rows[0].total);
    const expenses = Number(expensesRes.rows[0].total);
    const salaries = Number(salariesRes.rows[0].total);
    const damages = Number(damagesRes.rows[0].total);
    const treasuryBalance = Number(treasuryRes.rows[0].balance);
    const bankTotal = Number(bankTotalRes.rows[0].total);
    const totalReceivables = Number(receivablesRes.rows[0].total);
    const totalPayables = Number(payablesRes.rows[0].total);
    const salesRevenue = Number(salesRevenueRes.rows[0].total);

    const cashBreakdown = { cash: 0, vodafone_cash: 0, instapay: 0 };
    cashBySourceRes.rows.forEach(r => { cashBreakdown[r.source] = Number(r.balance); });
    cashBreakdown.banks = banksRes.rows.map(b => ({
      id: b.id, bank_name: b.bank_name, account_name: b.account_name, balance: Number(b.balance)
    }));

    res.json({
      netProfitLoss: income - expenses - salaries - damages,
      totalLiquidCash: treasuryBalance + bankTotal,
      totalReceivables,
      totalPayables,
      cashBreakdown,
      monthlyActivity: { salesRevenue, expenses, salaries },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
