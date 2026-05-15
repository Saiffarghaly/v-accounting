import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
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
  clients: number;
  pendingInvoices: number;
  recentTransactions: any[];
  monthlyData: any[];
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const Dashboard = () => {
  const { office, logout, token, canManageUsers } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API}/api/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (err) {
        console.error(err);
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

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">

      {/* Sidebar - Excel Green */}
      <aside className="w-64 flex flex-col" style={{ background: "#217346" }}>
        <div className="p-4" style={{ borderBottom: "1px solid #1a5c38" }}>
          <div className="mx-auto flex justify-center">
            <BrandWordmark variant="onDarkGreen" size="md" />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
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
          ].filter((item) => item.id !== "users" || canManageUsers).map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all"
              style={{
                background: activePage === item.id ? "#1a5c38" : "transparent",
                color: activePage === item.id ? "#ffffff" : "#a8d5b5",
                borderRight: activePage === item.id ? "3px solid #4CAF50" : "3px solid transparent",
              }}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: "1px solid #1a5c38" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "#1a5c38", color: "#ffffff" }}>
                {office?.name?.charAt(0) || "م"}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{office?.name || "المكتب"}</p>
                <p className="text-xs" style={{ color: "#a8d5b5" }}>مدير النظام</p>
              </div>
            </div>
            <button onClick={logout} className="text-xs transition"
              style={{ color: "#a8d5b5" }}
              onMouseOver={e => (e.currentTarget.style.color = "#ff6b6b")}
              onMouseOut={e => (e.currentTarget.style.color = "#a8d5b5")}>
              خروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">

        {/* Header - Excel Green */}
        <header className="px-8 py-4 flex items-center justify-between text-white"
          style={{ background: "#217346", borderBottom: "1px solid #1a5c38" }}>
          <div className="flex items-center gap-4 min-w-0">
            {activePage === "dashboard" && (
              <div className="shrink-0">
                <BrandWordmark variant="onDarkGreen" size="sm" />
              </div>
            )}
            <h2 className="text-lg font-semibold truncate">
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
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: "#a8d5b5" }}>
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'day' })}
            </span>

            {/* Alert Bell */}
            <div className="relative">
              <button onClick={() => setShowAlerts(!showAlerts)}
                className="relative text-white text-lg p-2 rounded-lg transition"
                style={{ background: "#1a5c38" }}>
                🔔
                {(alerts?.due_invoices?.length || alerts?.low_inventory?.length || alerts?.overdue_debts?.length) ? (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#c62828", color: "#fff", fontSize: "10px" }}>
                    {(alerts?.due_invoices?.length || 0) + (alerts?.low_inventory?.length || 0) + (alerts?.overdue_debts?.length || 0)}
                  </span>
                ) : null}
              </button>

              {showAlerts && (
                <div className="absolute left-0 top-full mt-2 w-80 rounded-xl shadow-lg border z-50"
                  style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                  <div className="p-3 border-b" style={{ borderColor: "#e0e0e0" }}>
                    <p className="font-semibold text-sm" style={{ color: "#333" }}>الإشعارات</p>
                  </div>
                  <div className="max-h-80 overflow-auto p-2 space-y-2">
                    {alerts?.due_invoices?.length > 0 && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: "#fff3e0" }}>
                        <p className="font-medium" style={{ color: "#e65100" }}>📄 فواتير اقتربت من الاستحقاق</p>
                        <p className="text-xs mt-1" style={{ color: "#888" }}>{alerts.due_invoices.length} فاتورة مستحقة خلال 3 أيام</p>
                      </div>
                    )}
                    {alerts?.low_inventory?.length > 0 && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: "#ffebee" }}>
                        <p className="font-medium" style={{ color: "#c62828" }}>📦 مخزن وصل للحد الأدنى</p>
                        <p className="text-xs mt-1" style={{ color: "#888" }}>{alerts.low_inventory.length} صنف يحتاج لإعادة توريد</p>
                      </div>
                    )}
                    {alerts?.overdue_debts?.length > 0 && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: "#fce4ec" }}>
                        <p className="font-medium" style={{ color: "#c62828" }}>💳 ديون متأخرة</p>
                        <p className="text-xs mt-1" style={{ color: "#888" }}>{alerts.overdue_debts.length} دين تجاوز تاريخ الاستحقاق</p>
                      </div>
                    )}
                    {alerts?.daily_summary && (
                      <div className="p-3 rounded-lg text-sm" style={{ background: "#e8f5e9" }}>
                        <p className="font-medium" style={{ color: "#217346" }}>📊 ملخص اليوم</p>
                        <p className="text-xs mt-1" style={{ color: "#888" }}>
                          إيرادات: {Number(alerts.daily_summary.income).toLocaleString()} ج · مصروفات: {Number(alerts.daily_summary.expenses).toLocaleString()} ج
                        </p>
                      </div>
                    )}
                    {!alerts?.due_invoices?.length && !alerts?.low_inventory?.length && !alerts?.overdue_debts?.length && (
                      <p className="text-center py-4 text-sm" style={{ color: "#bbb" }}>لا توجد إشعارات جديدة</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        {activePage === "dashboard" && (
          <div className="p-8 space-y-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "إجمالي الإيرادات", value: stats ? `${stats.income.toLocaleString()} ج` : "...", color: "#217346", bg: "#e8f5e9" },
                { label: "إجمالي المصروفات", value: stats ? `${stats.expenses.toLocaleString()} ج` : "...", color: "#c62828", bg: "#ffebee" },
                { label: "صافي الربح", value: stats ? `${Number(stats.profit).toLocaleString()} ج` : "...", color: "#1565c0", bg: "#e3f2fd" },
                { label: "الفواتير المعلقة", value: stats ? `${stats.pendingInvoices} فاتورة` : "...", color: "#e65100", bg: "#fff3e0" },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl p-5 border"
                  style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                  <p className="text-sm mb-2" style={{ color: "#666" }}>{stat.label}</p>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                <h3 className="text-sm font-medium mb-4" style={{ color: "#555" }}>الإيرادات والمصروفات — آخر 6 شهور</h3>
                {stats?.monthlyData && stats.monthlyData.length > 0 ? (
                  <div className="flex items-end gap-3 h-32">
                    {stats.monthlyData.map((m, i) => {
                      const maxVal = Math.max(...stats.monthlyData.map(x => Math.max(Number(x.income), Number(x.expenses))));
                      return (
                        <div key={i} className="flex-1 flex flex-col gap-1 items-center">
                          <div className="w-full rounded-t" style={{ height: `${maxVal ? (Number(m.income) / maxVal) * 100 : 0}%`, background: "#217346" }} />
                          <div className="w-full rounded-t" style={{ height: `${maxVal ? (Number(m.expenses) / maxVal) * 100 : 0}%`, background: "#ef9a9a" }} />
                          <span className="text-xs mt-1" style={{ color: "#999" }}>{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm" style={{ color: "#bbb" }}>لا توجد بيانات بعد</div>
                )}
                <div className="flex gap-4 mt-3 text-xs" style={{ color: "#888" }}>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#217346" }} /> إيرادات
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#ef9a9a" }} /> مصروفات
                  </span>
                </div>
              </div>

              <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                <h3 className="text-sm font-medium mb-4" style={{ color: "#555" }}>ملخص</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "#666" }}>العملاء</span>
                    <span className="font-bold" style={{ color: "#217346" }}>{stats?.clients || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "#666" }}>الفواتير المعلقة</span>
                    <span className="font-bold" style={{ color: "#e65100" }}>{stats?.pendingInvoices || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "#666" }}>صافي الربح</span>
                    <span className="font-bold" style={{ color: (stats?.profit || 0) >= 0 ? "#217346" : "#c62828" }}>
                      {stats?.profit ? Number(stats.profit).toLocaleString() : 0} ج
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
              <h3 className="text-sm font-medium mb-4" style={{ color: "#555" }}>آخر المعاملات</h3>
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table dir="rtl" lang="ar" className="w-full min-w-[40rem] border-collapse text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                        <th className="text-right pb-3 px-1" style={{ color: "#888" }}>البيان</th>
                        <th className="text-right pb-3 px-1" style={{ color: "#888" }}>التصنيف</th>
                        <th className="text-right pb-3 px-1" style={{ color: "#888" }}>التاريخ</th>
                        <th className="text-right pb-3 px-1" style={{ color: "#888" }}>المبلغ</th>
                        <th className="text-right pb-3 px-1" style={{ color: "#888" }}>النوع</th>
                        <th className="text-right pb-3 px-1" style={{ color: "#888" }}>بواسطة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentTransactions.map((tx: any) => (
                        <tr key={tx.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td className="py-3 px-1 align-top" style={{ color: "#333" }}>{tx.description ?? "—"}</td>
                          <td className="py-3 px-1 align-top" style={{ color: "#888" }}>{tx.category}</td>
                          <td className="py-3 px-1 align-top" style={{ color: "#888" }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                          <td className="py-3 px-1 align-top font-medium" style={{ color: "#333" }}>{Number(tx.amount).toLocaleString()} ج</td>
                          <td className="py-3 px-1 align-top">
                            <span className="text-xs px-2 py-1 rounded-full"
                              style={{
                                background: tx.type === "إيراد" ? "#e8f5e9" : "#ffebee",
                                color: tx.type === "إيراد" ? "#217346" : "#c62828"
                              }}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "#888" }}>{tx.created_by_name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6" style={{ color: "#bbb" }}>
                  <p>لا توجد معاملات بعد</p>
                </div>
              )}
            </div>
          </div>
        )}

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

        {activePage !== "dashboard" && activePage !== "income" && activePage !== "expenses" && activePage !== "clients" && activePage !== "invoices" && activePage !== "import" && activePage !== "treasury" && activePage !== "users" && activePage !== "inventory" && activePage !== "suppliers" && activePage !== "salaries" && activePage !== "debts" &&(
          <div className="flex items-center justify-center h-full" style={{ color: "#bbb" }}>
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
