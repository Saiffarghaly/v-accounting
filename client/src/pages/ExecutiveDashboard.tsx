import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface CashBreakdown {
  cash: number;
  vodafone_cash: number;
  instapay: number;
  banks: { id: number; bank_name: string; account_name: string; balance: number }[];
}

interface MonthlyActivity {
  salesRevenue: number;
  expenses: number;
  salaries: number;
}

interface DashboardData {
  netProfitLoss: number;
  totalLiquidCash: number;
  totalReceivables: number;
  totalPayables: number;
  cashBreakdown: CashBreakdown;
  monthlyActivity: MonthlyActivity;
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const DateFilter = ({
  value,
  customStart,
  customEnd,
  onChange,
  onCustomStartChange,
  onCustomEndChange,
}: {
  value: string;
  customStart: string;
  customEnd: string;
  onChange: (v: string) => void;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}) => {
  const today = new Date().toISOString().split("T")[0];
  const options = [
    { id: "today", label: "اليوم" },
    { id: "week", label: "هذا الأسبوع" },
    { id: "month", label: "هذا الشهر" },
    { id: "custom", label: "مخصص" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className="px-4 py-2 text-sm rounded-lg border transition font-medium"
          style={{
            background: value === o.id ? "var(--color-accent)" : "var(--color-bg-input)",
            color: value === o.id ? "#fff" : "var(--color-text-secondary)",
            borderColor: value === o.id ? "var(--color-accent)" : "var(--color-border)",
          }}
        >
          {o.label}
        </button>
      ))}
      {value === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={(e) => onCustomStartChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
          <span style={{ color: "var(--color-text-muted)" }}>إلى</span>
          <input type="date" value={customEnd} onChange={(e) => onCustomEndChange(e.target.value)}
            max={today}
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
        </div>
      )}
    </div>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg ${className || ""}`} style={{ background: "var(--color-border)" }} />
);

const StatCard = ({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) => (
  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>{label}</p>
    <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    {sub && <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{sub}</p>}
  </div>
);

const WalletCard = ({ label, amount, icon }: { label: string; amount: string; icon: string }) => (
  <div className="rounded-xl p-4 border flex items-center gap-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
    <span className="text-2xl">{icon}</span>
    <div>
      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{amount}</p>
    </div>
  </div>
);

const ExecutiveDashboard = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const getDateRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    switch (dateFilter) {
      case "today":
        return {
          startDate: now.toISOString().split("T")[0],
          endDate: now.toISOString().split("T")[0],
        };
      case "week": {
        const start = new Date(now);
        start.setDate(d - now.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        };
      }
      case "month":
        return {
          startDate: `${y}-${String(m + 1).padStart(2, "0")}-01`,
          endDate: new Date(y, m + 1, 0).toISOString().split("T")[0],
        };
      case "custom":
        return { startDate: customStart || `${y}-${String(m + 1).padStart(2, "0")}-01`, endDate: customEnd || now.toISOString().split("T")[0] };
      default:
        return {
          startDate: `${y}-${String(m + 1).padStart(2, "0")}-01`,
          endDate: new Date(y, m + 1, 0).toISOString().split("T")[0],
        };
    }
  }, [dateFilter, customStart, customEnd]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/executive-dashboard`, {
          params: getDateRange,
          headers,
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getDateRange]);

  const activityChartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "الإيرادات", المبيعات: data.monthlyActivity.salesRevenue },
      { name: "المصروفات", المصروفات: data.monthlyActivity.expenses },
      { name: "الرواتب", الرواتب: data.monthlyActivity.salaries },
    ];
  }, [data]);

  const netColor = data ? (data.netProfitLoss >= 0 ? "var(--color-success)" : "var(--color-danger)") : "var(--color-text-primary)";
  const netPrefix = data ? (data.netProfitLoss >= 0 ? "" : "-") : "";
  const netAbs = data ? Math.abs(data.netProfitLoss) : 0;

  return (
    <div className="p-8 space-y-6">
      {/* Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>لوحة القيادة التنفيذية</h3>
        <DateFilter value={dateFilter} customStart={customStart} customEnd={customEnd}
          onChange={setDateFilter} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard label="صافي الربح / الخسارة" value={`${netPrefix}${netAbs.toLocaleString()} ج`} color={netColor}
              sub={dateFilter === "today" ? "اليوم" : dateFilter === "week" ? "هذا الأسبوع" : dateFilter === "month" ? "هذا الشهر" : "المدة المحددة"} />
            <StatCard label="إجمالي السيولة" value={`${data?.totalLiquidCash.toLocaleString() || "0"} ج`} color="var(--color-info)" />
            <StatCard label="المستحقات (عملاء)" value={`${data?.totalReceivables.toLocaleString() || "0"} ج`} color="var(--color-warning)" />
            <StatCard label="المديونيات (موردين)" value={`${data?.totalPayables.toLocaleString() || "0"} ج`} color="var(--color-danger)" />
          </>
        )}
      </div>

      {/* Cash & Wallets + Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Breakdown */}
        <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <h4 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>💳 الخزنة والمحافظ</h4>
          {loading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <WalletCard label="كاش" amount={`${(data?.cashBreakdown.cash ?? 0).toLocaleString()} ج`} icon="💵" />
              <WalletCard label="فودافون كاش" amount={`${(data?.cashBreakdown.vodafone_cash ?? 0).toLocaleString()} ج`} icon="📱" />
              <WalletCard label="انستا باي" amount={`${(data?.cashBreakdown.instapay ?? 0).toLocaleString()} ج`} icon="🏦" />
              {data?.cashBreakdown.banks?.map((b) => (
                <WalletCard key={b.id} label={`بنك ${b.bank_name} - ${b.account_name}`} amount={`${b.balance.toLocaleString()} ج`} icon="🏛️" />
              ))}
            </div>
          )}
        </div>

        {/* Monthly Activity Summary */}
        <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <h4 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>📊 نشاط الفترة</h4>
          {loading ? (
            <Skeleton className="h-48" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} width={90} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                    labelStyle={{ color: "var(--color-text-secondary)" }}
                    formatter={(value: number) => `${value.toLocaleString()} ج`}
                  />
                  <Bar dataKey="المبيعات" fill="var(--color-success)" radius={[0, 4, 4, 0]} name="المبيعات" />
                  <Bar dataKey="المصروفات" fill="var(--color-danger)" radius={[0, 4, 4, 0]} name="المصروفات" />
                  <Bar dataKey="الرواتب" fill="var(--color-warning)" radius={[0, 4, 4, 0]} name="الرواتب" />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>إجمالي المبيعات</p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-success)" }}>{data?.monthlyActivity.salesRevenue.toLocaleString()} ج</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>إجمالي المصروفات</p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-danger)" }}>{data?.monthlyActivity.expenses.toLocaleString()} ج</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>إجمالي الرواتب</p>
                  <p className="text-lg font-bold" style={{ color: "var(--color-warning)" }}>{data?.monthlyActivity.salaries.toLocaleString()} ج</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
