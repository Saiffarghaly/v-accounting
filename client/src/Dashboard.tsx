import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import Transactions from "./pages/Transactions";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import axios from "axios";
import ImportExcel from "./pages/ImportExcel";
import Users from "./pages/Users";
import Inventory from "./pages/Inventory";
import Treasury from "./pages/Treasury";
import { BrandWordmark } from "./components/BrandWordmark";
import Suppliers from "./pages/Suppliers";
import Salaries from "./pages/Salaries";
import Debts from "./pages/Debts";
import Reports from "./pages/Reports";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend
} from "recharts";

interface AlertData {
  due_invoices: { id: number; amount: number; due_date: string }[];
  low_inventory: { id: number; name: string; quantity: number; min_quantity: number; unit: string }[];
  daily_summary: { income: number; expenses: number };
  overdue_debts: { id: number; client_name: string; remaining: number; due_date: string }[];
}

interface Stats {
  income: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  incomeTrend: number;
  clients: number;
  pendingInvoices: number;
  totalInvoices: number;
  invoicesAmount: number;
  overdueDebts: number;
  recentTransactions: any[];
  monthlyData: { month: string; income: number; expenses: number }[];
  cashFlow: { income: number; expenses: number; net: number };
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

/* ---------- Reusable Mini Components ---------- */
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg ${className || ""}`} style={{ background: "var(--color-border)" }} />
);

const StatCard = ({ label, value, sub, trend, color }: { label: string; value: string; sub?: string; trend?: { value: number; positive: boolean }; color: string }) => (
  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>{label}</p>
    <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    <div className="flex items-center gap-2 mt-2">
      {trend !== undefined && (
        <span className="text-xs font-medium" style={{ color: trend.positive ? "var(--color-success)" : "var(--color-danger)" }}>
          {trend.positive ? "▲" : "▼"} {Math.abs(trend.value)}%
        </span>
      )}
      {sub && <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{sub}</span>}
    </div>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--color-text-muted)" }}>
    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
    <p className="text-sm">{text}</p>
  </div>
);

/* ---------- Chart Tooltip Style ---------- */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-lg border text-sm" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toLocaleString()} ج</p>
      ))}
    </div>
  );
};

/* ---------- Main Dashboard ---------- */
const Dashboard = () => {
  const { office, logout, token, canManageUsers } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (activePage === "dashboard") fetchStats();
  }, [activePage]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`${API}/api/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAlerts(res.data);
      } catch (err) { console.error(err); }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activePage === "users" && !canManageUsers) {
      setActivePage("dashboard");
    }
  }, [activePage, canManageUsers]);

  const totalAlerts = (alerts?.due_invoices?.length || 0) + (alerts?.low_inventory?.length || 0) + (alerts?.overdue_debts?.length || 0);

  /* Compute anomaly: expenses this month vs avg of last 3 months */
  const anomaly = (() => {
    if (!stats?.monthlyData || stats.monthlyData.length < 2) return null;
    const sorted = [...stats.monthlyData].slice(-3);
    if (sorted.length < 2) return null;
    const avg = sorted.slice(0, -1).reduce((s, m) => s + Number(m.expenses), 0) / (sorted.length - 1);
    const current = Number(sorted[sorted.length - 1].expenses);
    if (avg > 0 && current > avg * 1.2) return { current, avg, ratio: Math.round((current / avg) * 100) };
    return null;
  })();

  const navItems = [
    { id: "dashboard", label: "الرئيسية", icon: "📊" },
    { id: "income", label: "الإيرادات", icon: "💰" },
    { id: "expenses", label: "المصروفات", icon: "💸" },
    { id: "invoices", label: "الفواتير", icon: "🧾" },
    { id: "import", label: "استيراد Excel", icon: "📁" },
    { id: "clients", label: "العملاء", icon: "👥" },
    { id: "treasury", label: "الخزنة", icon: "💳" },
    { id: "users", label: "المستخدمون", icon: "👤" },
    { id: "inventory", label: "المخزن", icon: "📦" },
    { id: "reports", label: "التقارير", icon: "📈" },
    { id: "suppliers", label: "الموردين", icon: "🚚" },
    { id: "salaries", label: "الرواتب", icon: "👨‍💼" },
    { id: "debts", label: "الديون", icon: "💳" },
  ].filter((item) => item.id !== "users" || canManageUsers);

  const isDashboard = activePage === "dashboard";
  const incomeColor = "var(--color-success)";
  const expenseColor = "var(--color-danger)";
  const profitColor = "var(--color-info)";

  return (
    <div className="flex h-screen" style={{ background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>

      {/* ===== Sidebar ===== */}
      <aside className="w-64 flex flex-col shrink-0" style={{ background: "var(--color-bg-sidebar)", boxShadow: "var(--shadow-sidebar)" }}>
        <div className="p-4 flex justify-center" style={{ borderBottom: "1px solid var(--color-bg-sidebar-hover)" }}>
          <BrandWordmark variant="onDarkGreen" size="md" />
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-right text-sm font-medium transition-all duration-200"
              style={{
                background: activePage === item.id ? "var(--color-bg-sidebar-active)" : "transparent",
                color: activePage === item.id ? "var(--color-text-sidebar-active)" : "var(--color-text-sidebar)",
                borderRight: activePage === item.id ? "3px solid var(--color-accent)" : "3px solid transparent",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4" style={{ borderTop: "1px solid var(--color-bg-sidebar-hover)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--color-bg-sidebar-active)", color: "#fff" }}>
                {office?.name?.charAt(0) || "م"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{office?.name || "المكتب"}</p>
                <p className="text-xs" style={{ color: "var(--color-text-sidebar)" }}>مدير النظام</p>
              </div>
            </div>
            <button onClick={logout} className="text-xs shrink-0" style={{ color: "var(--color-text-sidebar)" }}>
              خروج
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="flex-1 overflow-auto" style={{ background: "var(--color-bg-primary)" }}>

        {/* ===== Header ===== */}
        <header className="px-8 py-4 flex items-center justify-between" style={{
          background: "var(--color-bg-card)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)"
        }}>
          <div className="flex items-center gap-4">
            {isDashboard && <BrandWordmark variant="onLight" size="sm" />}
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {activePage === "dashboard" && "لوحة التحكم"}
              {activePage === "income" && "الإيرادات"}
              {activePage === "expenses" && "المصروفات"}
              {activePage === "invoices" && "الفواتير"}
              {activePage === "clients" && "العملاء"}
              {activePage === "reports" && "التقارير"}
              {activePage === "import" && "استيراد Excel"}
              {activePage === "treasury" && "الخزنة"}
              {activePage === "users" && "المستخدمون"}
              {activePage === "inventory" && "المخزن"}
              {activePage === "suppliers" && "الموردين"}
              {activePage === "salaries" && "الرواتب"}
              {activePage === "debts" && "الديون"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>

            {/* Theme Toggle */}
            <button onClick={toggleTheme}
              className="p-2 rounded-lg text-lg transition" title={theme === "dark" ? "مضيء" : "مظلم"}
              style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Alert Bell */}
            <div className="relative">
              <button onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-2 rounded-lg text-lg transition"
                style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>
                🔔
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--color-danger)", color: "#fff" }}>
                    {totalAlerts}
                  </span>
                )}
              </button>
              {showAlerts && (
                <div className="absolute left-0 top-full mt-2 w-80 rounded-xl shadow-lg border z-50"
                  style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-dropdown)" }}>
                  <div className="p-3 border-b font-semibold text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                    الإشعارات
                  </div>
                  <div className="max-h-80 overflow-auto p-2 space-y-2">
                    {alerts?.due_invoices?.length > 0 && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: "var(--color-warning-light)" }}>
                        <p className="font-medium" style={{ color: "var(--color-warning)" }}>📄 فواتير اقتربت من الاستحقاق</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{alerts.due_invoices.length} فاتورة مستحقة خلال 3 أيام</p>
                      </div>
                    )}
                    {alerts?.low_inventory?.length > 0 && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: "var(--color-danger-light)" }}>
                        <p className="font-medium" style={{ color: "var(--color-danger)" }}>📦 مخزن وصل للحد الأدنى</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{alerts.low_inventory.length} صنف يحتاج لإعادة توريد</p>
                      </div>
                    )}
                    {alerts?.overdue_debts?.length > 0 && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: "var(--color-danger-light)" }}>
                        <p className="font-medium" style={{ color: "var(--color-danger)" }}>💳 ديون متأخرة</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{alerts.overdue_debts.length} دين تجاوز تاريخ الاستحقاق</p>
                      </div>
                    )}
                    {alerts?.daily_summary && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: "var(--color-success-light)" }}>
                        <p className="font-medium" style={{ color: "var(--color-success)" }}>📊 ملخص اليوم</p>
                        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                          إيرادات: {Number(alerts.daily_summary.income).toLocaleString()} ج · مصروفات: {Number(alerts.daily_summary.expenses).toLocaleString()} ج
                        </p>
                      </div>
                    )}
                    {!totalAlerts && <p className="text-center py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>لا توجد إشعارات جديدة</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ===== Dashboard Content ===== */}
        {isDashboard && (
          <div className="p-8 space-y-6">

            {/* --- Stat Cards Row --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
              ) : (
                <>
                  <StatCard label="إجمالي الإيرادات" value={stats ? `${stats.income.toLocaleString()} ج` : "—"}
                    trend={stats ? { value: Math.abs(stats.incomeTrend), positive: stats.incomeTrend >= 0 } : undefined}
                    sub="الشهر الماضي" color={incomeColor} />
                  <StatCard label="إجمالي المصروفات" value={stats ? `${stats.expenses.toLocaleString()} ج` : "—"} color={expenseColor} />
                  <StatCard label="صافي الربح" value={stats ? `${stats.profit.toLocaleString()} ج` : "—"}
                    sub={stats ? `${stats.profitMargin}% هامش ربح` : undefined} color={profitColor} />
                  <StatCard label="التدفق النقدي" value={stats ? `${stats.cashFlow.net.toLocaleString()} ج` : "—"}
                    sub={`داخل ${stats?.cashFlow.income.toLocaleString() || 0} / خارج ${stats?.cashFlow.expenses.toLocaleString() || 0}`}
                    color={stats?.cashFlow.net && stats.cashFlow.net >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
                </>
              )}
            </div>

            {/* --- Charts + Insights Row --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Monthly Bar Chart */}
              <div className="lg:col-span-2 rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
                <h3 className="text-sm font-medium mb-4" style={{ color: "var(--color-text-secondary)" }}>الإيرادات والمصروفات — شهري</h3>
                {loading ? (
                  <Skeleton className="h-64 rounded-lg" />
                ) : stats?.monthlyData && stats.monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.monthlyData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="month" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
                      <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend formatter={(value) => <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>{value}</span>} />
                      <Bar dataKey="income" name="الإيرادات" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="المصروفات" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="لا توجد بيانات مالية بعد" />
                )}
              </div>

              {/* Smart Insights */}
              <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
                <h3 className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>مؤشرات ذكية</h3>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
                ) : (
                  <>
                    {/* Profit Margin */}
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--color-accent-lighter)" }}>
                      <div>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>هامش الربح</p>
                        <p className="text-lg font-bold" style={{ color: "var(--color-success)" }}>{stats?.profitMargin || 0}%</p>
                      </div>
                      <span className="text-2xl">📈</span>
                    </div>

                    {/* Income Trend */}
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--color-info-light)" }}>
                      <div>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>اتجاه الإيرادات</p>
                        <p className="text-lg font-bold" style={{ color: "var(--color-info)" }}>
                          {stats?.incomeTrend !== undefined ? `${stats.incomeTrend >= 0 ? "+" : ""}${stats.incomeTrend}%` : "—"}
                        </p>
                      </div>
                      <span className="text-2xl">{stats?.incomeTrend && stats.incomeTrend >= 0 ? "🚀" : "📉"}</span>
                    </div>

                    {/* Expense Anomaly Alert */}
                    {anomaly ? (
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--color-danger-light)" }}>
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>⚠️ المصروفات مرتفعة</p>
                          <p className="text-sm font-bold" style={{ color: "var(--color-danger)" }}>{anomaly.ratio}% من المعدل</p>
                        </div>
                        <span className="text-2xl">🔥</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--color-success-light)" }}>
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>المصروفات طبيعية</p>
                          <p className="text-sm font-bold" style={{ color: "var(--color-success)" }}>ضمن الحدود المتوقعة ✓</p>
                        </div>
                        <span className="text-2xl">✅</span>
                      </div>
                    )}

                    {/* Overdue Debts */}
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: (stats?.overdueDebts || 0) > 0 ? "var(--color-danger-light)" : "var(--color-success-light)" }}>
                      <div>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>الديون المتأخرة</p>
                        <p className="text-lg font-bold" style={{ color: (stats?.overdueDebts || 0) > 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                          {stats?.overdueDebts || 0} دين
                        </p>
                      </div>
                      <span className="text-2xl">{stats?.overdueDebts && stats.overdueDebts > 0 ? "⚠️" : "🎯"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* --- Recent Transactions Table --- */}
            <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: "var(--color-text-secondary)" }}>آخر المعاملات المالية</h3>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table dir="rtl" lang="ar" className="w-full min-w-[40rem] border-collapse text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <th className="text-right pb-3 px-2 font-medium" style={{ color: "var(--color-text-muted)" }}>البيان</th>
                        <th className="text-right pb-3 px-2 font-medium" style={{ color: "var(--color-text-muted)" }}>التصنيف</th>
                        <th className="text-right pb-3 px-2 font-medium" style={{ color: "var(--color-text-muted)" }}>التاريخ</th>
                        <th className="text-right pb-3 px-2 font-medium" style={{ color: "var(--color-text-muted)" }}>المبلغ</th>
                        <th className="text-right pb-3 px-2 font-medium" style={{ color: "var(--color-text-muted)" }}>النوع</th>
                        <th className="text-right pb-3 px-2 font-medium" style={{ color: "var(--color-text-muted)" }}>بواسطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentTransactions.map((tx: any) => (
                        <tr key={tx.id} className="transition" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                          <td className="py-3 px-2" style={{ color: "var(--color-text-primary)" }}>{tx.description ?? "—"}</td>
                          <td className="py-3 px-2" style={{ color: "var(--color-text-secondary)" }}>{tx.category}</td>
                          <td className="py-3 px-2" style={{ color: "var(--color-text-secondary)" }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                          <td className="py-3 px-2 font-medium" style={{ color: "var(--color-text-primary)" }}>{Number(tx.amount).toLocaleString()} ج</td>
                          <td className="py-3 px-2">
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                              background: tx.type === "إيراد" ? "var(--color-success-light)" : "var(--color-danger-light)",
                              color: tx.type === "إيراد" ? "var(--color-success)" : "var(--color-danger)"
                            }}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{tx.created_by_name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="لا توجد معاملات مالية بعد. ابدأ بإضافة أول عملية!" />
              )}
            </div>
          </div>
        )}

        {/* ===== Pages ===== */}
        {activePage === "income" && <Transactions />}
        {activePage === "expenses" && <Transactions />}
        {activePage === "clients" && <Clients />}
        {activePage === "invoices" && <Invoices />}
        {activePage === "import" && <ImportExcel />}
        {activePage === "treasury" && <Treasury />}
        {canManageUsers && activePage === "users" && <Users />}
        {activePage === "inventory" && <Inventory />}
        {activePage === "suppliers" && <Suppliers />}
        {activePage === "salaries" && <Salaries />}
        {activePage === "debts" && <Debts />}
        {activePage === "reports" && <Reports />}

        {!["dashboard","income","expenses","clients","invoices","import","treasury","users","inventory","suppliers","salaries","debts","reports"].includes(activePage) && (
          <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)" }}>
            <div className="text-center">
              <p className="text-4xl mb-3">🚧</p>
              <p className="text-lg">قريباً...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
