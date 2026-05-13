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
        const res = await axios.get(
          "https://v-accounting-production.up.railway.app/api/stats",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    if (activePage === "dashboard") fetchStats();
  }, [activePage]);

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">

      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col"
        style={{ background: "#217346" }}
      >
        <div
          className="p-6"
          style={{ borderBottom: "1px solid #1a5c38" }}
        >
          <h1 className="text-xl font-bold text-white">
            💼 V-ACCOUNTING
          </h1>

          <p
            className="text-xs mt-1"
            style={{ color: "#a8d5b5" }}
          >
            نظام المحاسبة
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: "dashboard", label: "الرئيسية", icon: "📊" },
            { id: "income", label: "الإيرادات", icon: "💰" },
            { id: "expenses", label: "المصروفات", icon: "💸" },
            { id: "invoices", label: "الفواتير", icon: "🧾" },
            { id: "import", label: "استيراد Excel", icon: "📁" },
            { id: "clients", label: "العملاء", icon: "👥" },
            { id: "users", label: "المستخدمون", icon: "👤" },
            { id: "inventory", label: "المخزن", icon: "📦" },
            { id: "reports", label: "التقارير", icon: "📈" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all"
              style={{
                background:
                  activePage === item.id
                    ? "#1a5c38"
                    : "transparent",

                color:
                  activePage === item.id
                    ? "#ffffff"
                    : "#a8d5b5",

                borderRight:
                  activePage === item.id
                    ? "3px solid #4CAF50"
                    : "3px solid transparent",
              }}
            >
              <span>{item.icon}</span>

              <span className="text-sm font-medium">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div
          className="p-4"
          style={{ borderTop: "1px solid #1a5c38" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: "#1a5c38",
                  color: "#ffffff",
                }}
              >
                {office?.name?.charAt(0) || "م"}
              </div>

              <div>
                <p className="text-sm font-medium text-white">
                  {office?.name || "المكتب"}
                </p>

                <p
                  className="text-xs"
                  style={{ color: "#a8d5b5" }}
                >
                  مدير النظام
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="text-xs transition"
              style={{ color: "#a8d5b5" }}
            >
              خروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header
          className="px-8 py-4 flex items-center justify-between text-white"
          style={{
            background: "#217346",
            borderBottom: "1px solid #1a5c38",
          }}
        >
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
            <span
              className="text-sm"
              style={{ color: "#d7f0dd" }}
            >
              {new Date().toLocaleDateString("ar-EG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>

            <button
              className="text-white text-sm px-4 py-2 rounded-lg transition"
              style={{ background: "#1a5c38" }}
            >
              + جديد
            </button>
          </div>
        </header>

        {/* Dashboard */}
        {activePage === "dashboard" && (
          <div className="p-8 space-y-6">

            {/* Cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  label: "إجمالي الإيرادات",
                  value: stats
                    ? `${stats.income.toLocaleString()} ج`
                    : "...",
                  color: "#217346",
                },
                {
                  label: "إجمالي المصروفات",
                  value: stats
                    ? `${stats.expenses.toLocaleString()} ج`
                    : "...",
                  color: "#c62828",
                },
                {
                  label: "صافي الربح",
                  value: stats
                    ? `${Number(stats.profit).toLocaleString()} ج`
                    : "...",
                  color: "#1565c0",
                },
                {
                  label: "الفواتير المعلقة",
                  value: stats
                    ? `${stats.pendingInvoices} فاتورة`
                    : "...",
                  color: "#e65100",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm"
                >
                  <p className="text-sm text-gray-500 mb-3">
                    {stat.label}
                  </p>

                  <p
                    className="text-3xl font-bold"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-4">

              {/* Chart Box */}
              <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-6">
                  الإيرادات والمصروفات — آخر 6 شهور
                </h3>

                {stats?.monthlyData &&
                stats.monthlyData.length > 0 ? (
                  <div className="flex items-end gap-3 h-40">
                    {stats.monthlyData.map((m, i) => {
                      const maxVal = Math.max(
                        ...stats.monthlyData.map((x) =>
                          Math.max(
                            Number(x.income),
                            Number(x.expenses)
                          )
                        )
                      );

                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col gap-1 items-center"
                        >
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${
                                maxVal
                                  ? (Number(m.income) / maxVal) *
                                    100
                                  : 0
                              }%`,
                              background: "#217346",
                            }}
                          />

                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${
                                maxVal
                                  ? (Number(m.expenses) /
                                      maxVal) *
                                    100
                                  : 0
                              }%`,
                              background: "#ef9a9a",
                            }}
                          />

                          <span className="text-xs text-gray-500 mt-2">
                            {m.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                    لا توجد بيانات بعد
                  </div>
                )}

                <div className="flex gap-4 mt-5 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: "#217346" }}
                    />
                    إيرادات
                  </span>

                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: "#ef9a9a" }}
                    />
                    مصروفات
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-6">
                  ملخص
                </h3>

                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      العملاء
                    </span>

                    <span
                      className="font-bold"
                      style={{ color: "#217346" }}
                    >
                      {stats?.clients || 0}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      الفواتير المعلقة
                    </span>

                    <span
                      className="font-bold"
                      style={{ color: "#e65100" }}
                    >
                      {stats?.pendingInvoices || 0}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      صافي الربح
                    </span>

                    <span
                      className="font-bold"
                      style={{
                        color:
                          (stats?.profit || 0) >= 0
                            ? "#217346"
                            : "#c62828",
                      }}
                    >
                      {stats?.profit
                        ? Number(
                            stats.profit
                          ).toLocaleString()
                        : 0}{" "}
                      ج
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-6">
                آخر المعاملات
              </h3>

              {stats?.recentTransactions &&
              stats.recentTransactions.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right pb-3 text-gray-500">
                        البيان
                      </th>

                      <th className="text-right pb-3 text-gray-500">
                        التصنيف
                      </th>

                      <th className="text-right pb-3 text-gray-500">
                        التاريخ
                      </th>

                      <th className="text-right pb-3 text-gray-500">
                        المبلغ
                      </th>

                      <th className="text-right pb-3 text-gray-500">
                        النوع
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {stats.recentTransactions.map((tx: any) => (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-100"
                      >
                        <td className="py-4 text-gray-800">
                          {tx.description}
                        </td>

                        <td className="py-4 text-gray-500">
                          {tx.category}
                        </td>

                        <td className="py-4 text-gray-500">
                          {new Date(
                            tx.date
                          ).toLocaleDateString("ar-EG")}
                        </td>

                        <td className="py-4 font-medium text-gray-800">
                          {Number(
                            tx.amount
                          ).toLocaleString()}{" "}
                          ج
                        </td>

                        <td className="py-4">
                          <span
                            className="text-xs px-3 py-1 rounded-full"
                            style={{
                              background:
                                tx.type === "إيراد"
                                  ? "#e8f5e9"
                                  : "#ffebee",

                              color:
                                tx.type === "إيراد"
                                  ? "#217346"
                                  : "#c62828",
                            }}
                          >
                            {tx.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  لا توجد معاملات بعد
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

        {activePage !== "dashboard" &&
          activePage !== "income" &&
          activePage !== "expenses" &&
          activePage !== "clients" &&
          activePage !== "invoices" &&
          activePage !== "import" &&
          activePage !== "users" &&
          activePage !== "inventory" && (
            <div className="flex items-center justify-center h-full text-gray-400">
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