const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authWithSubscription: auth } = require('../subscription-check');

const INCOME_TYPE = 'إيراد';
const EXPENSE_TYPE = 'مصروف';
const SALES_CATEGORY = 'مبيعات';
const OTHER_CATEGORY = 'أخرى';
const SUPPLIER_PAID_TYPE = 'مدفوع';

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = ({ startDate, endDate }) => {
  const now = new Date();
  const defaultStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const defaultEnd = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const validDate = /^\d{4}-\d{2}-\d{2}$/;

  let sDate = typeof startDate === 'string' && validDate.test(startDate) ? startDate : defaultStart;
  let eDate = typeof endDate === 'string' && validDate.test(endDate) ? endDate : defaultEnd;

  if (sDate > eDate) {
    [sDate, eDate] = [eDate, sDate];
  }

  return { sDate, eDate };
};

const getSixMonthKeys = (endDate) => {
  const end = new Date(`${endDate}T00:00:00`);
  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(end.getFullYear(), end.getMonth() - 5 + index, 1);
    return `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
  });
};

router.get('/', auth, async (req, res) => {
  const { sDate, eDate } = getDateRange(req.query);
  const trendMonths = getSixMonthKeys(eDate);
  const trendStart = `${trendMonths[0]}-01`;

  try {
    const incomeP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE office_id=$1 AND type=$4 AND date >= $2::date AND date <= $3::date`,
      [req.officeId, sDate, eDate, INCOME_TYPE]
    );
    const expensesP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE office_id=$1 AND type=$4 AND date >= $2::date AND date <= $3::date`,
      [req.officeId, sDate, eDate, EXPENSE_TYPE]
    );
    const salariesP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM employee_payments
       WHERE office_id=$1 AND date >= $2::date AND date <= $3::date`,
      [req.officeId, sDate, eDate]
    );
    const damagesP = pool.query(
      `SELECT COALESCE(SUM(d.quantity * i.buy_price),0) as total
       FROM inventory_damages d
       JOIN inventory i ON d.item_id=i.id
       WHERE d.office_id=$1 AND d.date >= $2::date AND d.date <= $3::date`,
      [req.officeId, sDate, eDate]
    );
    const treasuryP = pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END),0) as balance
       FROM treasury_movements
       WHERE office_id=$1`,
      [req.officeId]
    );
    const bankTotalP = pool.query(
      `SELECT COALESCE(SUM(balance),0) as total
       FROM bank_accounts
       WHERE office_id=$1`,
      [req.officeId]
    );
    const receivablesP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM invoices
       WHERE office_id=$1
         AND status NOT IN ('paid','cancelled')
         AND created_at::date >= $2::date
         AND created_at::date <= $3::date`,
      [req.officeId, sDate, eDate]
    );
    const payablesP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM supplier_debts
       WHERE office_id=$1
         AND status='active'
         AND created_at::date >= $2::date
         AND created_at::date <= $3::date`,
      [req.officeId, sDate, eDate]
    );
    const salesRevenueP = pool.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE office_id=$1 AND type=$4 AND category=$5 AND date >= $2::date AND date <= $3::date`,
      [req.officeId, sDate, eDate, INCOME_TYPE, SALES_CATEGORY]
    );
    const cashBySourceP = pool.query(
      `SELECT source, COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE -amount END),0) as balance
       FROM treasury_movements
       WHERE office_id=$1
       GROUP BY source`,
      [req.officeId]
    );
    const banksP = pool.query(
      `SELECT id, bank_name, account_name, balance
       FROM bank_accounts
       WHERE office_id=$1
       ORDER BY bank_name`,
      [req.officeId]
    );

    const expByCatP = pool.query(
      `SELECT COALESCE(category,$4) as category, COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE office_id=$1 AND type=$5 AND date >= $2::date AND date <= $3::date
       GROUP BY COALESCE(category,$4)
       ORDER BY total DESC`,
      [req.officeId, sDate, eDate, OTHER_CATEGORY, EXPENSE_TYPE]
    );
    const incByCatP = pool.query(
      `SELECT COALESCE(category,$4) as category, COALESCE(SUM(amount),0) as total
       FROM transactions
       WHERE office_id=$1 AND type=$5 AND date >= $2::date AND date <= $3::date
       GROUP BY COALESCE(category,$4)
       ORDER BY total DESC`,
      [req.officeId, sDate, eDate, OTHER_CATEGORY, INCOME_TYPE]
    );
    const monthlyTrendP = pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM') as month,
              COALESCE(SUM(CASE WHEN type=$4 THEN amount ELSE 0 END),0) as income,
              COALESCE(SUM(CASE WHEN type=$5 THEN amount ELSE 0 END),0) as expenses
       FROM transactions
       WHERE office_id=$1 AND date >= $2::date AND date <= $3::date
       GROUP BY TO_CHAR(date, 'YYYY-MM')
       ORDER BY TO_CHAR(date, 'YYYY-MM')`,
      [req.officeId, trendStart, eDate, INCOME_TYPE, EXPENSE_TYPE]
    );
    const topClientsP = pool.query(
      `SELECT COALESCE(i.client_name, c.name, 'عميل غير مسمى') as name,
              COALESCE(SUM(i.amount),0) as total
       FROM invoices i
       LEFT JOIN clients c ON i.client_id=c.id
       WHERE i.office_id=$1
         AND i.created_at::date >= $2::date
         AND i.created_at::date <= $3::date
       GROUP BY COALESCE(i.client_name, c.name, 'عميل غير مسمى')
       ORDER BY total DESC
       LIMIT 5`,
      [req.officeId, sDate, eDate]
    );
    const invByCatP = pool.query(
      `SELECT COALESCE(category,$4) as category,
              COALESCE(SUM(quantity * buy_price),0) as value,
              COALESCE(SUM(quantity),0) as items
       FROM inventory
       WHERE office_id=$1
         AND created_at::date >= $2::date
         AND created_at::date <= $3::date
       GROUP BY COALESCE(category,$4)
       ORDER BY value DESC`,
      [req.officeId, sDate, eDate, OTHER_CATEGORY]
    );
    const invoiceStatusP = pool.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(amount),0) as total
       FROM invoices
       WHERE office_id=$1
         AND created_at::date >= $2::date
         AND created_at::date <= $3::date
       GROUP BY status`,
      [req.officeId, sDate, eDate]
    );
    const treasuryDailyP = pool.query(
      `SELECT date,
              COALESCE(SUM(CASE WHEN type='deposit' THEN amount ELSE 0 END),0) as deposits,
              COALESCE(SUM(CASE WHEN type='withdraw' THEN amount ELSE 0 END),0) as withdrawals
       FROM treasury_movements
       WHERE office_id=$1 AND date >= $2::date AND date <= $3::date
       GROUP BY date
       ORDER BY date`,
      [req.officeId, sDate, eDate]
    );
    const debtAgingP = pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN due_date < $3::date THEN amount ELSE 0 END),0) as overdue,
         COALESCE(SUM(CASE WHEN due_date >= $3::date AND due_date <= ($3::date + INTERVAL '7 days') THEN amount ELSE 0 END),0) as due_soon,
         COALESCE(SUM(CASE WHEN due_date > ($3::date + INTERVAL '7 days') OR due_date IS NULL THEN amount ELSE 0 END),0) as future
       FROM supplier_debts
       WHERE office_id=$1
         AND status='active'
         AND created_at::date >= $2::date
         AND created_at::date <= $3::date`,
      [req.officeId, sDate, eDate]
    );
    const topSuppliersP = pool.query(
      `WITH supplier_tx AS (
         SELECT supplier_id,
                COALESCE(SUM(CASE WHEN type=$4 THEN -amount ELSE amount END),0) as balance
         FROM supplier_transactions
         WHERE office_id=$1 AND date >= $2::date AND date <= $3::date
         GROUP BY supplier_id
       ),
       supplier_debt AS (
         SELECT supplier_id, COALESCE(SUM(amount),0) as balance
         FROM supplier_debts
         WHERE office_id=$1
           AND status='active'
           AND created_at::date >= $2::date
           AND created_at::date <= $3::date
         GROUP BY supplier_id
       )
       SELECT s.name,
              COALESCE(supplier_tx.balance,0) + COALESCE(supplier_debt.balance,0) as balance
       FROM suppliers s
       LEFT JOIN supplier_tx ON supplier_tx.supplier_id=s.id
       LEFT JOIN supplier_debt ON supplier_debt.supplier_id=s.id
       WHERE s.office_id=$1
         AND ABS(COALESCE(supplier_tx.balance,0) + COALESCE(supplier_debt.balance,0)) > 0
       ORDER BY ABS(COALESCE(supplier_tx.balance,0) + COALESCE(supplier_debt.balance,0)) DESC
       LIMIT 5`,
      [req.officeId, sDate, eDate, SUPPLIER_PAID_TYPE]
    );
    const salariesByEmpP = pool.query(
      `SELECT e.name, COALESCE(SUM(ep.amount),0) as total
       FROM employee_payments ep
       JOIN employees e ON ep.employee_id=e.id
       WHERE ep.office_id=$1 AND ep.date >= $2::date AND ep.date <= $3::date
       GROUP BY e.name
       ORDER BY total DESC`,
      [req.officeId, sDate, eDate]
    );
    const bankDistributionP = pool.query(
      `SELECT ba.id,
              ba.bank_name,
              ba.account_name,
              COALESCE(SUM(bt.amount),0) as value
       FROM bank_transactions bt
       JOIN bank_accounts ba ON ba.id=bt.account_id AND ba.office_id=bt.office_id
       WHERE bt.office_id=$1 AND bt.date >= $2::date AND bt.date <= $3::date
       GROUP BY ba.id, ba.bank_name, ba.account_name
       ORDER BY value DESC`,
      [req.officeId, sDate, eDate]
    );

    const results = await Promise.all([
      incomeP, expensesP, salariesP, damagesP,
      treasuryP, bankTotalP, receivablesP, payablesP, salesRevenueP,
      cashBySourceP, banksP,
      expByCatP, incByCatP, monthlyTrendP, topClientsP, invByCatP,
      invoiceStatusP, treasuryDailyP, debtAgingP, topSuppliersP, salariesByEmpP,
      bankDistributionP,
    ]);

    const [
      incomeRes, expensesRes, salariesRes, damagesRes,
      treasuryRes, bankTotalRes, receivablesRes, payablesRes, salesRevenueRes,
      cashBySourceRes, banksRes,
      expByCatRes, incByCatRes, monthlyTrendRes, topClientsRes, invByCatRes,
      invoiceStatusRes, treasuryDailyRes, debtAgingRes, topSuppliersRes, salariesByEmpRes,
      bankDistributionRes,
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

    const cashBreakdown = { cash: 0, vodafone_cash: 0, instapay: 0, banks: [] };
    cashBySourceRes.rows.forEach((r) => {
      if (Object.prototype.hasOwnProperty.call(cashBreakdown, r.source)) {
        cashBreakdown[r.source] = Number(r.balance);
      }
    });
    cashBreakdown.banks = banksRes.rows.map((b) => ({
      id: b.id,
      bank_name: b.bank_name,
      account_name: b.account_name,
      balance: Number(b.balance),
    }));

    const trendMap = new Map(
      monthlyTrendRes.rows.map((r) => [r.month, { income: Number(r.income), expenses: Number(r.expenses) }])
    );
    const monthlyTrend = trendMonths.map((month) => ({
      month,
      income: trendMap.get(month)?.income || 0,
      expenses: trendMap.get(month)?.expenses || 0,
    }));

    res.json({
      dateRange: { startDate: sDate, endDate: eDate },
      netProfitLoss: income - expenses - salaries - damages,
      totalLiquidCash: treasuryBalance + bankTotal,
      totalReceivables,
      totalPayables,
      cashBreakdown,
      monthlyActivity: { salesRevenue, expenses, salaries },
      analysis: {
        expensesByCategory: expByCatRes.rows.map((r) => ({ category: r.category || OTHER_CATEGORY, total: Number(r.total) })),
        incomeByCategory: incByCatRes.rows.map((r) => ({ category: r.category || OTHER_CATEGORY, total: Number(r.total) })),
        monthlyTrend,
        topClients: topClientsRes.rows.map((r) => ({ name: r.name, total: Number(r.total) })),
        inventoryByCategory: invByCatRes.rows.map((r) => ({ category: r.category || OTHER_CATEGORY, value: Number(r.value), items: Number(r.items) })),
        invoiceStatus: invoiceStatusRes.rows.map((r) => ({ status: r.status, count: Number(r.count), total: Number(r.total) })),
        treasuryDaily: treasuryDailyRes.rows.map((r) => ({ date: formatDate(new Date(r.date)), deposits: Number(r.deposits), withdrawals: Number(r.withdrawals) })),
        debtAging: {
          overdue: Number(debtAgingRes.rows[0]?.overdue || 0),
          dueSoon: Number(debtAgingRes.rows[0]?.due_soon || 0),
          future: Number(debtAgingRes.rows[0]?.future || 0),
        },
        topSuppliers: topSuppliersRes.rows.map((r) => ({ name: r.name, balance: Number(r.balance) })),
        salariesByEmployee: salariesByEmpRes.rows.map((r) => ({ name: r.name, total: Number(r.total) })),
        bankDistribution: bankDistributionRes.rows.map((r) => ({
          id: r.id,
          bank_name: r.bank_name,
          account_name: r.account_name,
          value: Number(r.value),
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
