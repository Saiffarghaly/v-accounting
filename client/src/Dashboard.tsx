import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import Transactions from "./pages/Transactions";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import axios from "axios";
import ImportExcel from "./pages/ImportExcel";
import Users from "./pages/Users";
import Inventory from "./pages/Inventory";

interface Stats {
  income: number;
  expenses: number;
  profit: number;
  clients: number;
  pendingInvoices: number;
  recentTransactions: any[];
  monthlyData: any[];
}

const Dashboard = () => {
  const { office, logout, token } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (activePage === "dashboard") fetchStats();
  }, [activePage]);

  return (
    <div className="flex h-screen bg-[#0a1628] text-white">
      <aside className="w-64 bg-[#1a2840] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-amber-400">💼 V-ACCOUNTING</h1>
          <p className="text-xs text-gray-500 mt-1">نظام المحاسبة</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: "dashboard", label: "الرئيسية", icon: "📊" },
            { id: "income", label: "الإيرادات", icon: "💰" },
            { id: "expenses", label: "المصروفات", icon: "💸" },
            { id: "invoices", label: "الفواتير", icon: "🧾" },
            { id: "import", label: "استيراد Excel", icon: "📁" },
            { id: "clients", label: "العملاء", icon: "👥" },
            { id: "reports", label: "التقارير", icon: "📈" },
            { id: "users", label: "المستخدمون", icon: "👥" },
            { id: "inventory", label: "المخزن", icon: "📦" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all ${
                activePage === item.id
                  ? "bg-amber-500ue-600 text-white"
                  : "text-gray-400 hover:bg-[#0f1f3d] hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500ue-600 flex items-center justify-center text-sm">
                {office?.name?.charAt(0) || "م"}
              </div>
              <div>
                <p className="text-sm font-medium">{office?.name || "المكتب"}</p>
                <p className="text-xs text-gray-500">مدير النظام</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 text-xs transition">
              خروج
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-[#1a2840] border-b border-gray-800 px-8 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {activePage === "dashboard" && "لوحة التحكم"}
            {activePage === "income" && "الإيرادات"}
            {activePage === "expenses" && "المصروفات"}
            {activePage === "invoices" && "الفواتير"}
            {activePage === "clients" && "العملاء"}
            {activePage === "reports" && "التقارير"}
            {activePage === "import" && "استيراد Excel"}
            {activePage === "users" && "المستخدمون"}
            {activePage === "inventory" && "المخزن"}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">الجمعة، 9 مايو 2026</span>
            <button className="bg-amber-500ue-600 hover:bg-amber-500ue-700 text-white text-sm px-4 py-2 rounded-lg transition">
              + جديد
            </button>
          </div>
        </header>

        {activePage === "dashboard" && (
          <div className="p-8 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "إجمالي الإيرادات", value: stats ? `${stats.income.toLocaleString()} ج` : "...", color: "text-green-400", bg: "bg-green-400/10" },
                { label: "إجمالي المصروفات", value: stats ? `${stats.expenses.toLocaleString()} ج` : "...", color: "text-red-400", bg: "bg-red-400/10" },
                { label: "صافي الربح", value: stats ? `${stats.profit.toLocaleString()} ج` : "...", color: "text-amber-400", bg: "bg-amber-500ue-400/10" },
                { label: "الفواتير المعلقة", value: stats ? `${stats.pendingInvoices} فاتورة` : "...", color: "text-yellow-400", bg: "bg-yellow-400/10" },
              ].map((stat, i) => (
                <div key={i} className="bg-[#1a2840] border border-gray-800 rounded-xl p-5">
                  <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1a2840] border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-4">الإيرادات والمصروفات — آخر 6 شهور</h3>
                {stats?.monthlyData && stats.monthlyData.length > 0 ? (
                  <div className="flex items-end gap-3 h-32">
                    {stats.monthlyData.map((m, i) => {
                      const maxVal = Math.max(...stats.monthlyData.map(x => Math.max(Number(x.income), Number(x.expenses))));
                      return (
                        <div key={i} className="flex-1 flex flex-col gap-1 items-center">
                          <div className="w-full bg-amber-500ue-500 rounded-t" style={{ height: `${maxVal ? (Number(m.income) / maxVal) * 100 : 0}%` }} />
                          <div className="w-full bg-red-400/50 rounded-t" style={{ height: `${maxVal ? (Number(m.expenses) / maxVal) * 100 : 0}%` }} />
                          <span className="text-xs text-gray-600 mt-1">{m.month}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-600 text-sm">لا توجد بيانات بعد</div>
                )}
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500ue-500 rounded-full inline-block" /> إيرادات</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full inline-block" /> مصروفات</span>
                </div>
              </div>

              <div className="bg-[#1a2840] border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-4">ملخص</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">العملاء</span>
                    <span className="text-white font-bold">{stats?.clients || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">الفواتير المعلقة</span>
                    <span className="text-yellow-400 font-bold">{stats?.pendingInvoices || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">صافي الربح</span>
                    <span className={`font-bold ${(stats?.profit || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {stats?.profit.toLocaleString() || 0} ج
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-[#1a2840] border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4">آخر المعاملات</h3>
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-right pb-3">البيان</th>
                      <th className="text-right pb-3">التصنيف</th>
                      <th className="text-right pb-3">التاريخ</th>
                      <th className="text-right pb-3">المبلغ</th>
                      <th className="text-right pb-3">النوع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {stats.recentTransactions.map((tx: any) => (
                      <tr key={tx.id} className="text-gray-300">
                        <td className="py-3">{tx.description}</td>
                        <td className="py-3 text-gray-500">{tx.category}</td>
                        <td className="py-3 text-gray-500">{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                        <td className="py-3 font-medium">{Number(tx.amount).toLocaleString()} ج</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${tx.type === "إيراد" ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
                            {tx.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-600 py-6">
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
        {activePage === "users" && <Users />}
        {activePage === "inventory" && <Inventory />}
        

{activePage !== "dashboard" && activePage !== "income" && activePage !== "expenses" && activePage !== "clients" && activePage !== "invoices" && activePage !== "import" && activePage !== "users" &&activePage !== "inventory" && (  
          
          <div className="flex items-center justify-center h-full text-gray-600">
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