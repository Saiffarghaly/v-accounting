const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authWithSubscription: auth } = require('../subscription-check');

router.get('/', auth, async (req, res) => {
  try {
    const [income, expenses, clients, pendingInvoices, recentTx, monthlyData, totalInvoices, overdueDebts, prevMonth, topCategories,
      inventoryCount, lowStockItems, supplierCount, supplierBalance, employeeCount, totalSalaries, treasuryBalance,
      bankAccounts, bankBalance
    ] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE office_id = $1 AND type = 'إيراد'`, [req.officeId]),
      pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE office_id = $1 AND type = 'مصروف'`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total FROM clients WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total FROM invoices WHERE office_id = $1 AND status = 'pending'`, [req.officeId]),
      pool.query(`SELECT t.*, COALESCE(u.name, o.name) as created_by_name FROM transactions t LEFT JOIN users u ON t.created_by_user_id = u.id LEFT JOIN offices o ON t.office_id = o.id WHERE t.office_id = $1 ORDER BY t.created_at DESC LIMIT 5`, [req.officeId]),
      pool.query(`SELECT TO_CHAR(date, 'Mon') as month, SUM(CASE WHEN type = 'إيراد' THEN amount ELSE 0 END) as income, SUM(CASE WHEN type = 'مصروف' THEN amount ELSE 0 END) as expenses FROM transactions WHERE office_id = $1 AND date >= NOW() - INTERVAL '6 months' GROUP BY TO_CHAR(date, 'Mon'), DATE_TRUNC('month', date) ORDER BY DATE_TRUNC('month', date)`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM invoices WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total FROM client_debts WHERE office_id = $1 AND status = 'active' AND due_date < CURRENT_DATE AND remaining > 0`, [req.officeId]),
      pool.query(`SELECT COALESCE(SUM(CASE WHEN type = 'إيراد' THEN amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN type = 'مصروف' THEN amount ELSE 0 END), 0) as expenses FROM transactions WHERE office_id = $1 AND date >= NOW() - INTERVAL '1 month' AND date < DATE_TRUNC('month', NOW())`, [req.officeId]),
      pool.query(`SELECT category, SUM(amount) as total FROM transactions WHERE office_id = $1 AND type = 'مصروف' GROUP BY category ORDER BY total DESC LIMIT 5`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total FROM inventory WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total FROM inventory WHERE office_id = $1 AND quantity <= min_quantity`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total FROM suppliers WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COALESCE(SUM(balance), 0) as total FROM suppliers WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total FROM employees WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COALESCE(SUM(salary), 0) as total FROM employees WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) as total FROM treasury_movements WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COUNT(*) as total FROM bank_accounts WHERE office_id = $1`, [req.officeId]),
      pool.query(`SELECT COALESCE(SUM(balance), 0) as total FROM bank_accounts WHERE office_id = $1`, [req.officeId]),
    ]);

    const totalIncome = Number(income.rows[0].total);
    const totalExpenses = Number(expenses.rows[0].total);
    const profit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? ((profit / totalIncome) * 100) : 0;

    const prevIncome = Number(prevMonth.rows[0].income);
    const prevExpenses = Number(prevMonth.rows[0].expenses);
    const incomeTrend = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;

    const numClients = Number(clients.rows[0].total);
    const numOverdue = Number(overdueDebts.rows[0].total);
    const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 1;

    /* Business Health Score (0-100) */
    let healthScore = 0;
    if (profitMargin >= 20) healthScore += 25;
    else if (profitMargin >= 10) healthScore += 15;
    else if (profitMargin > 0) healthScore += 8;

    if (incomeTrend > 10) healthScore += 15;
    else if (incomeTrend > 0) healthScore += 10;
    else if (incomeTrend === 0) healthScore += 8;
    else if (incomeTrend > -10) healthScore += 3;

    if (expenseRatio < 0.4) healthScore += 15;
    else if (expenseRatio < 0.6) healthScore += 10;
    else if (expenseRatio < 0.8) healthScore += 6;
    else healthScore += 3;

    if (numClients >= 50) healthScore += 10;
    else if (numClients >= 20) healthScore += 8;
    else if (numClients >= 10) healthScore += 5;
    else if (numClients > 0) healthScore += 2;

    if (numOverdue === 0) healthScore += 10;
    else if (numOverdue <= 2) healthScore += 6;
    else if (numOverdue <= 5) healthScore += 3;

    const lowStock = Number(lowStockItems.rows[0].total);
    const inventoryTotal = Number(inventoryCount.rows[0].total);
    if (lowStock === 0) healthScore += 10;
    else if (lowStock <= 3) healthScore += 6;
    else if (lowStock <= 10) healthScore += 3;

    const numSuppliers = Number(supplierCount.rows[0].total);
    if (numSuppliers >= 5) healthScore += 5;
    else if (numSuppliers >= 2) healthScore += 3;

    const numEmployees = Number(employeeCount.rows[0].total);
    if (numEmployees > 0) healthScore += 5;

    const numBankAccounts = Number(bankAccounts.rows[0].total);
    if (numBankAccounts > 0) healthScore += 5;

    healthScore = Math.min(100, Math.max(0, healthScore));

    res.json({
      income: totalIncome,
      expenses: totalExpenses,
      profit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      incomeTrend: Math.round(incomeTrend * 100) / 100,
      clients: numClients,
      pendingInvoices: Number(pendingInvoices.rows[0].total),
      totalInvoices: Number(totalInvoices.rows[0].total),
      invoicesAmount: Number(totalInvoices.rows[0].total_amount),
      overdueDebts: numOverdue,
      recentTransactions: recentTx.rows,
      monthlyData: monthlyData.rows,
      cashFlow: { income: totalIncome, expenses: totalExpenses, net: profit },
      healthScore,
      topCategories: topCategories.rows,
      inventory: { total: inventoryTotal, lowStock },
      suppliers: { total: numSuppliers, balance: Number(supplierBalance.rows[0].total) },
      employees: { total: numEmployees, totalSalaries: Number(totalSalaries.rows[0].total) },
      treasury: { balance: Number(treasuryBalance.rows[0].total) },
      bank: { totalAccounts: numBankAccounts, totalBalance: Number(bankBalance.rows[0].total) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
