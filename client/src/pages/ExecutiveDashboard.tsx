import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

interface CashBreakdown {
  cash: number; vodafone_cash: number; instapay: number;
  banks: { id: number; bank_name: string; account_name: string; balance: number }[];
}
interface MonthlyActivity { salesRevenue: number; expenses: number; salaries: number }
interface Analysis {
  expensesByCategory: { category: string; total: number }[];
  incomeByCategory: { category: string; total: number }[];
  monthlyTrend: { month: string; income: number; expenses: number }[];
  topClients: { name: string; total: number }[];
  inventoryByCategory: { category: string; value: number; items: number }[];
  invoiceStatus: { status: string; count: number; total: number }[];
  treasuryDaily: { date: string; deposits: number; withdrawals: number }[];
  debtAging: { overdue: number; dueSoon: number; future: number };
  topSuppliers: { name: string; balance: number }[];
  salariesByEmployee: { name: string; total: number }[];
  bankDistribution: { id: number; bank_name: string; account_name: string; value: number }[];
}
interface DashboardData {
  netProfitLoss: number; totalLiquidCash: number; totalReceivables: number; totalPayables: number;
  cashBreakdown: CashBreakdown; monthlyActivity: MonthlyActivity; analysis: Analysis;
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";
const COLORS = ["#217346", "#c62828", "#f9a825", "#1565c0", "#6a1b9a", "#e65100", "#00838f", "#2e7d32", "#ad1457", "#283593"];
const STATUS_LABELS: Record<string, string> = { paid: "مدفوعة", pending: "معلقة", cancelled: "ملغية", unpaid: "غير مدفوعة" };
const formatCurrencyTooltip = (value: unknown) => `${Number(value || 0).toLocaleString()} ج`;
const makePieLabel = (key: string) => (props: any) => {
  const label = props?.payload?.[key] ?? props?.[key] ?? "";
  const percent = typeof props?.percent === "number" ? props.percent : 0;
  return `${label} ${(percent * 100).toFixed(0)}%`;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DateFilter = ({ value, customStart, customEnd, onChange, onCustomStartChange, onCustomEndChange }: {
  value: string; customStart: string; customEnd: string; onChange: (v: string) => void;
  onCustomStartChange: (v: string) => void; onCustomEndChange: (v: string) => void;
}) => {
  const today = formatLocalDate(new Date());
  const options = [
    { id: "today", label: "اليوم" }, { id: "week", label: "هذا الأسبوع" },
    { id: "month", label: "هذا الشهر" }, { id: "custom", label: "مخصص" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className="px-4 py-2 text-sm rounded-lg border transition font-medium"
          style={{ background: value === o.id ? "var(--color-accent)" : "var(--color-bg-input)",
            color: value === o.id ? "#fff" : "var(--color-text-secondary)",
            borderColor: value === o.id ? "var(--color-accent)" : "var(--color-border)" }}>
          {o.label}
        </button>
      ))}
      {value === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={(e) => onCustomStartChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
          <span style={{ color: "var(--color-text-muted)" }}>إلى</span>
          <input type="date" value={customEnd} onChange={(e) => onCustomEndChange(e.target.value)} max={today}
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

const ChartCard = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
  <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
    <h4 className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{icon} {title}</h4>
    {children}
  </div>
);

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

const ExecutiveDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const getDateRange = useMemo(() => {
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth(); const d = now.getDate();
    switch (dateFilter) {
      case "today": return { startDate: formatLocalDate(now), endDate: formatLocalDate(now) };
      case "week": {
        const start = new Date(now); start.setDate(d - now.getDay());
        const end = new Date(start); end.setDate(start.getDate() + 6);
        return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
      }
      case "month": return { startDate: `${y}-${String(m + 1).padStart(2, "0")}-01`, endDate: formatLocalDate(new Date(y, m + 1, 0)) };
      case "custom": return { startDate: customStart || `${y}-${String(m + 1).padStart(2, "0")}-01`, endDate: customEnd || formatLocalDate(now) };
      default: return { startDate: `${y}-${String(m + 1).padStart(2, "0")}-01`, endDate: formatLocalDate(new Date(y, m + 1, 0)) };
    }
  }, [dateFilter, customStart, customEnd]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/executive-dashboard`, {
          params: getDateRange,
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [getDateRange, token]);

  const netColor = data ? (data.netProfitLoss >= 0 ? "var(--color-success)" : "var(--color-danger)") : "var(--color-text-primary)";
  const netPrefix = data ? (data.netProfitLoss >= 0 ? "" : "-") : "";
  const netAbs = data ? Math.abs(data.netProfitLoss) : 0;
  const a = data?.analysis;

  const statusData = useMemo(() => a?.invoiceStatus.map(s => ({ ...s, label: STATUS_LABELS[s.status] || s.status })) || [], [a]);
  const pieSize = { outerRadius: 80, innerRadius: 40, cx: "50%", cy: "50%" };
  const debtAgingTotal = a ? a.debtAging.overdue + a.debtAging.dueSoon + a.debtAging.future : 0;
  const receivablesPayablesMax = Math.max(data?.totalReceivables ?? 0, data?.totalPayables ?? 0, 1);
  const bankDistributionData = a?.bankDistribution ?? [];

  return (
    <div dir="rtl" lang="ar" className="p-8 space-y-6">
      {/* Header + Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>لوحة القيادة التنفيذية</h3>
        <DateFilter value={dateFilter} customStart={customStart} customEnd={customEnd}
          onChange={setDateFilter} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) : (
          <>
            <StatCard label="صافي الربح / الخسارة" value={`${netPrefix}${netAbs.toLocaleString()} ج`} color={netColor}
              sub={dateFilter === "today" ? "اليوم" : dateFilter === "week" ? "هذا الأسبوع" : dateFilter === "month" ? "هذا الشهر" : "المدة المحددة"} />
            <StatCard label="إجمالي السيولة" value={`${data?.totalLiquidCash.toLocaleString() || "0"} ج`} color="var(--color-info)" />
            <StatCard label="المستحقات (عملاء)" value={`${data?.totalReceivables.toLocaleString() || "0"} ج`} color="var(--color-warning)" />
            <StatCard label="المديونيات (موردين)" value={`${data?.totalPayables.toLocaleString() || "0"} ج`} color="var(--color-danger)" />
          </>
        )}
      </div>

      {/* Cash & Wallets + Monthly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="الخزنة والمحافظ" icon="💳">
          {loading ? <Skeleton className="h-40" /> : (
            <div className="grid grid-cols-2 gap-3">
              <WalletCard label="كاش" amount={`${(data?.cashBreakdown.cash ?? 0).toLocaleString()} ج`} icon="💵" />
              <WalletCard label="فودافون كاش" amount={`${(data?.cashBreakdown.vodafone_cash ?? 0).toLocaleString()} ج`} icon="📱" />
              <WalletCard label="انستا باي" amount={`${(data?.cashBreakdown.instapay ?? 0).toLocaleString()} ج`} icon="🏦" />
              {data?.cashBreakdown.banks?.map((b) => (
                <WalletCard key={b.id} label={`${b.bank_name} - ${b.account_name}`} amount={`${b.balance.toLocaleString()} ج`} icon="🏛️" />
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard title="نشاط الفترة" icon="📊">
          {loading ? <Skeleton className="h-48" /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: "المبيعات", value: data?.monthlyActivity.salesRevenue || 0 },
                  { name: "المصروفات", value: data?.monthlyActivity.expenses || 0 },
                  { name: "الرواتب", value: data?.monthlyActivity.salaries || 0 },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {[
                      { value: data?.monthlyActivity.salesRevenue || 0, fill: "var(--color-success)" },
                      { value: data?.monthlyActivity.expenses || 0, fill: "var(--color-danger)" },
                      { value: data?.monthlyActivity.salaries || 0, fill: "var(--color-warning)" },
                    ].map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-xs" style={{ color: "var(--color-text-muted)" }}>المبيعات</p><p className="text-lg font-bold" style={{ color: "var(--color-success)" }}>{(data?.monthlyActivity.salesRevenue ?? 0).toLocaleString()} ج</p></div>
                <div><p className="text-xs" style={{ color: "var(--color-text-muted)" }}>المصروفات</p><p className="text-lg font-bold" style={{ color: "var(--color-danger)" }}>{(data?.monthlyActivity.expenses ?? 0).toLocaleString()} ج</p></div>
                <div><p className="text-xs" style={{ color: "var(--color-text-muted)" }}>الرواتب</p><p className="text-lg font-bold" style={{ color: "var(--color-warning)" }}>{(data?.monthlyActivity.salaries ?? 0).toLocaleString()} ج</p></div>
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* ═══════════════ Analysis Grid ═══════════════ */}
      {!loading && a && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* ── 1. Income by Category ── */}
          <ChartCard title="الإيرادات حسب التصنيف" icon="💰">
            {a.incomeByCategory.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={a.incomeByCategory} dataKey="total" nameKey="category" {...pieSize} label={makePieLabel("category")}>
                    {a.incomeByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={formatCurrencyTooltip} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 2. Expenses by Category ── */}
          <ChartCard title="المصروفات حسب التصنيف" icon="💸">
            {a.expensesByCategory.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={a.expensesByCategory} dataKey="total" nameKey="category" {...pieSize} label={makePieLabel("category")}>
                    {a.expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={formatCurrencyTooltip} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 3. Monthly Trend ── */}
          <ChartCard title="الاتجاه الشهري (آخر 6 أشهر)" icon="📈">
            {a.monthlyTrend.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={a.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="var(--color-success)" fill="var(--color-success)" fillOpacity={0.15} name="الإيرادات" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" stroke="var(--color-danger)" fill="var(--color-danger)" fillOpacity={0.15} name="المصروفات" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 4. Top Clients ── */}
          <ChartCard title="أفضل 5 عملاء" icon="👥">
            {a.topClients.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={a.topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} width={100} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" fill="var(--color-info)" radius={[0, 4, 4, 0]} name="الإجمالي" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 5. Inventory by Category ── */}
          <ChartCard title="قيمة المخزن حسب الفئة" icon="📦">
            {a.inventoryByCategory.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={a.inventoryByCategory} dataKey="value" nameKey="category" {...pieSize} label={makePieLabel("category")}>
                    {a.inventoryByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={formatCurrencyTooltip} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 6. Invoice Status ── */}
          <ChartCard title="حالة الفواتير" icon="🧾">
            {statusData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="total" nameKey="label" {...pieSize} label={makePieLabel("label")}>
                    {statusData.map((s) => (
                      <Cell key={s.status} fill={s.status === "paid" ? "var(--color-success)" : s.status === "pending" ? "var(--color-warning)" : "var(--color-text-muted)"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={formatCurrencyTooltip} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {statusData.length > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                {statusData.map((s) => (
                  <div key={s.status}>{STATUS_LABELS[s.status] || s.status}: {s.count} فاتورة</div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* ── 7. Treasury Daily ── */}
          <ChartCard title="حركة الخزنة اليومية" icon="💳">
            {a.treasuryDaily.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={a.treasuryDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="deposits" fill="var(--color-success)" radius={[2, 2, 0, 0]} name="إيداع" />
                  <Bar dataKey="withdrawals" fill="var(--color-danger)" radius={[2, 2, 0, 0]} name="سحب" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 8. Debt Aging ── */}
          <ChartCard title="تحليل ديون الموردين" icon="💳">
            <div className="space-y-3">
              <DebtBar label="متأخرة" value={a.debtAging.overdue} color="var(--color-danger)" max={debtAgingTotal || 1} />
              <DebtBar label="مستحقة قريباً (7 أيام)" value={a.debtAging.dueSoon} color="var(--color-warning)" max={debtAgingTotal || 1} />
              <DebtBar label="مستقبلية" value={a.debtAging.future} color="var(--color-success)" max={debtAgingTotal || 1} />
              <div className="pt-2 text-center">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  إجمالي الديون النشطة: {debtAgingTotal.toLocaleString()} ج
                </span>
              </div>
            </div>
          </ChartCard>

          {/* ── 9. Top Suppliers ── */}
          <ChartCard title="أفضل 5 موردين (رصيد)" icon="🚚">
            {a.topSuppliers.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={a.topSuppliers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} width={100} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="balance" fill="var(--color-warning)" radius={[0, 4, 4, 0]} name="الرصيد" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 10. Salaries by Employee ── */}
          <ChartCard title="الرواتب حسب الموظف" icon="👨‍💼">
            {a.salariesByEmployee.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={a.salariesByEmployee} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} width={100} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" fill="var(--color-accent)" radius={[0, 4, 4, 0]} name="الإجمالي" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* ── 11. Bank Distribution ── */}
          <ChartCard title="توزيع البنوك" icon="🏦">
            {bankDistributionData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={bankDistributionData} dataKey="value" nameKey="bank_name" {...pieSize}
                    label={makePieLabel("bank_name")}>
                    {bankDistributionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={formatCurrencyTooltip} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>

          {/* ── 12. Client Receivables vs Supplier Payables ── */}
          <ChartCard title="مقارنة الذمم" icon="⚖️">
            <div className="space-y-3">
              <DebtBar label="المستحقات للعملاء" value={data?.totalReceivables ?? 0} color="var(--color-warning)" max={receivablesPayablesMax} />
              <DebtBar label="المديونيات للموردين" value={data?.totalPayables ?? 0} color="var(--color-danger)" max={receivablesPayablesMax} />
              <div className="pt-2 text-center">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  صافي الذمم: {((data?.totalReceivables ?? 0) - (data?.totalPayables ?? 0)).toLocaleString()} ج
                </span>
              </div>
            </div>
          </ChartCard>

        </div>
      )}
    </div>
  );
};

const EmptyChart = () => (
  <div className="flex items-center justify-center h-48 text-sm" style={{ color: "var(--color-text-muted)" }}>
    لا توجد بيانات كافية
  </div>
);

const DebtBar = ({ label, value, color, max = 1 }: { label: string; value: number; color: string; max?: number }) => {
  const pct = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
        <span className="font-medium" style={{ color }}>{value.toLocaleString()} ج</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: "var(--color-border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
