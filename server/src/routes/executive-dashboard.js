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

  const past6 = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];

  try {
    // ── KPI queries ──
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
    const salesRevenueP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE office_id=$1 AND type='إيراد' AND category='مبيعات' AND date>=$2 AND date<=$3`,
      [req.officeId, sDate, eDate]
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

    // ── Analytical queries ──

    // Expenses by category
    const expByCatP = pool.query(
      `SELECT category, COALESCE(SUM(amount),0) as total
       FROM transactions WHERE office_id=$1 AND type='مصروف' AND date>=$2 AND date<=$3
       GROUP BY category ORDER BY total DESC`,
      [req.officeId, sDate, eDate]
    );
    // Income by category
    const incByCatP = pool.query(
      `SELECT category, COALESCE(SUM(amount),0) as total
       FROM transactions WHERE office_id=$1 AND type='إيراد' AND date>=$2 AND date<=$3
       GROUP BY category ORDER BY total DESC`,
      [req.officeId, sDate, eDate]
    );
    // Monthly trend (last 6 months)
    const monthlyTrendP = pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') as month,
              COALESCE(SUM(CASE WHEN type='إيراد' THEN amount ELSE 0 END),0) as income,
              COALESCE(SUM(CASE WHEN type='مصروف' THEN amount ELSE 0 END),0) as expenses
       FROM transactions WHERE office_id=$1 AND date>=$2 AND date<=$3
       GROUP BY month ORDER BY month`,
      [req.officeId, past6, eDate]
    );
    // Top 5 clients by invoice total
    const topClientsP = pool.query(
      `SELECT COALESCE(client_name, c.name) as name, SUM(amount) as total
       FROM invoices LEFT JOIN clients c ON invoices.client_id=c.id
       WHERE invoices.office_id=$1 AND invoices.date>=$2 AND invoices.date<=$3
       GROUP BY name ORDER BY total DESC LIMIT 5`,
      [req.officeId, sDate, eDate]
    );
    // Inventory value by category
    const invByCatP = pool.query(
      `SELECT COALESCE(category,'أخرى') as category, SUM(quantity * buy_price) as value, SUM(quantity) as items
       FROM inventory WHERE office_id=$1
       GROUP BY category ORDER BY value DESC`,
      [req.officeId]
    );
    // Invoice status breakdown
    const invoiceStatusP = pool.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(amount),0) as total
       FROM invoices WHERE office_id=$1 AND date>=$2 AND date<=$3
       GROUP BY status`,
      [req.officeId, sDate, eDate]
    );
    // Treasury daily trend for period
    const treasuryDailyP = pool.query(
      `SELECT date,
              COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END),0) as deposits,
              COALESCE(SUM(CASE WHEN type='withdraw' THEN amount ELSE 0 END),0) as withdrawals
       FROM treasury_movements WHERE office_id=$1 AND date>=$2 AND date<=$3
       GROUP BY date ORDER BY date`,
      [req.officeId, sDate, eDate]
    );
    // Debt aging
    const debtAgingP = pool.query(
      `SELECT
         COUNT(*) as total_debts,
         COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN remaining ELSE 0 END),0) as overdue,
         COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE+7 THEN remaining ELSE 0 END),0) as due_soon,
         COALESCE(SUM(CASE WHEN due_date > CURRENT_DATE+7 OR due_date IS NULL THEN remaining ELSE 0 END),0) as future
       FROM supplier_debts WHERE office_id=$1 AND status='active'`,
      [req.officeId]
    );
    // Top suppliers by balance
    const topSuppliersP = pool.query(
      `SELECT name, balance FROM suppliers WHERE office_id=$1 AND balance!=0 ORDER BY balance DESC LIMIT 5`,
      [req.officeId]
    );
    // Salaries by employee for period
    const salariesByEmpP = pool.query(
      `SELECT e.name, COALESCE(SUM(ep.amount),0) as total
       FROM employee_payments ep JOIN employees e ON ep.employee_id=e.id
       WHERE ep.office_id=$1 AND ep.date>=$2 AND ep.date<=$3
       GROUP BY e.name ORDER BY total DESC`,
      [req.officeId, sDate, eDate]
    );

    const results = await Promise.all([
      incomeP, expensesP, salariesP, damagesP,
      treasuryP, bankTotalP, receivablesP, payablesP, salesRevenueP,
      cashBySourceP, banksP,
      expByCatP, incByCatP, monthlyTrendP, topClientsP, invByCatP,
      invoiceStatusP, treasuryDailyP, debtAgingP, topSuppliersP, salariesByEmpP,
    ]);

    const [
      incomeRes, expensesRes, salariesRes, damagesRes,
      treasuryRes, bankTotalRes, receivablesRes, payablesRes, salesRevenueRes,
      cashBySourceRes, banksRes,
      expByCatRes, incByCatRes, monthlyTrendRes, topClientsRes, invByCatRes,
      invoiceStatusRes, treasuryDailyRes, debtAgingRes, topSuppliersRes, salariesByEmpRes,
    ] = results;

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
      id: b.id, bank_name: b.bank_name, account_name: b.account_name, balance: Number(b.balance),
    }));

    res.json({
      netProfitLoss: income - expenses - salaries - damages,
      totalLiquidCash: treasuryBalance + bankTotal,
      totalReceivables,
      totalPayables,
      cashBreakdown,
      monthlyActivity: { salesRevenue, expenses, salaries },
      analysis: {
        expensesByCategory: expByCatRes.rows.map(r => ({ category: r.category || 'أخرى', total: Number(r.total) })),
        incomeByCategory: incByCatRes.rows.map(r => ({ category: r.category || 'أخرى', total: Number(r.total) })),
        monthlyTrend: monthlyTrendRes.rows.map(r => ({ month: r.month, income: Number(r.income), expenses: Number(r.expenses) })),
        topClients: topClientsRes.rows.map(r => ({ name: r.name, total: Number(r.total) })),
        inventoryByCategory: invByCatRes.rows.map(r => ({ category: r.category, value: Number(r.value), items: Number(r.items) })),
        invoiceStatus: invoiceStatusRes.rows.map(r => ({ status: r.status, count: Number(r.count), total: Number(r.total) })),
        treasuryDaily: treasuryDailyRes.rows.map(r => ({ date: r.date, deposits: Number(r.deposits), withdrawals: Number(r.withdrawals) })),
        debtAging: {
          overdue: Number(debtAgingRes.rows[0]?.overdue || 0),
          dueSoon: Number(debtAgingRes.rows[0]?.due_soon || 0),
          future: Number(debtAgingRes.rows[0]?.future || 0),
        },
        topSuppliers: topSuppliersRes.rows.map(r => ({ name: r.name, balance: Number(r.balance) })),
        salariesByEmployee: salariesByEmpRes.rows.map(r => ({ name: r.name, total: Number(r.total) })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
