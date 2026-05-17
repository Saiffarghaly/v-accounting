import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { exportToExcel } from "../utils/exportExcel";
import jsPDF from "jspdf";

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
}

const Reports = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState<"pl" | "monthly" | "client">("pl");

  /* P&L */
  const [plFrom, setPlFrom] = useState("");
  const [plTo, setPlTo] = useState("");
  const [plData, setPlData] = useState<any>(null);
  const [plLoading, setPlLoading] = useState(false);

  /* Monthly */
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  /* Client Statement */
  const [clients, setClients] = useState<Client[]>([]);
  const [selClient, setSelClient] = useState("");
  const [csFrom, setCsFrom] = useState("");
  const [csTo, setCsTo] = useState("");
  const [csData, setCsData] = useState<any>(null);
  const [csLoading, setCsLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  /* Fetch clients for dropdown */
  useEffect(() => {
    axios.get(`${API}/api/clients`, { headers }).then(r => setClients(r.data)).catch(console.error);
  }, []);

  /* Fetch P&L */
  const fetchPL = async () => {
    setPlLoading(true);
    try {
      const params = new URLSearchParams();
      if (plFrom) params.set("from", plFrom);
      if (plTo) params.set("to", plTo);
      const res = await axios.get(`${API}/api/reports/profit-loss?${params}`, { headers });
      setPlData(res.data);
    } catch (e) { console.error(e); }
    finally { setPlLoading(false); }
  };

  /* Fetch Monthly */
  const fetchMonthly = async () => {
    setMonthlyLoading(true);
    try {
      const res = await axios.get(`${API}/api/reports/monthly?year=${year}`, { headers });
      setMonthlyData(res.data);
    } catch (e) { console.error(e); }
    finally { setMonthlyLoading(false); }
  };

  /* Fetch Client Statement */
  const fetchCS = async () => {
    if (!selClient) return;
    setCsLoading(true);
    try {
      const params = new URLSearchParams({ client_id: selClient });
      if (csFrom) params.set("from", csFrom);
      if (csTo) params.set("to", csTo);
      const res = await axios.get(`${API}/api/reports/client-statement?${params}`, { headers });
      setCsData(res.data);
    } catch (e) { console.error(e); }
    finally { setCsLoading(false); }
  };

  /* Auto-fetch on mount and when year changes for monthly */
  useEffect(() => { if (tab === "monthly") fetchMonthly(); }, [year, tab]);

  /* Export current view to PDF */
  const exportPDF = (title: string) => {
    const content = document.getElementById("report-content");
    if (!content) return;
    import("html2canvas").then((html2canvas) => {
      html2canvas.default(content).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pw = pdf.internal.pageSize.getWidth();
        const ph = (canvas.height * pw) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pw, ph);
        pdf.save(`${title}.pdf`);
      });
    });
  };

  const months = ["يناير","فبراير","مارس","إبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const tabs = [
    { id: "pl", label: "الأرباح والخسائر" },
    { id: "monthly", label: "تقرير شهري" },
    { id: "client", label: "كشف حساب عميل" },
  ];

  return (
    <div className="p-8 space-y-6">

      {/* Tabs */}
      <div className="flex gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition"
            style={{
              borderColor: tab === t.id ? "var(--color-accent)" : "transparent",
              color: tab === t.id ? "var(--color-accent)" : "var(--color-text-muted)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div id="report-content" className="space-y-6">

        {/* ======================== P&L TAB ======================== */}
        {tab === "pl" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>من تاريخ</label>
                <input type="date" value={plFrom} onChange={(e) => setPlFrom(e.target.value)}
                  className="border rounded-lg px-4 py-2 text-sm" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>إلى تاريخ</label>
                <input type="date" value={plTo} onChange={(e) => setPlTo(e.target.value)}
                  className="border rounded-lg px-4 py-2 text-sm" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
              </div>
              <button onClick={fetchPL} className="text-white text-sm px-6 py-2.5 rounded-lg transition" style={{ background: "var(--color-accent)" }}>
                عرض التقرير
              </button>
            </div>

            {plLoading ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>جاري التحميل...</div>
            ) : plData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي الإيرادات</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-success)" }}>{plData.income.toLocaleString()} ج</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي المصروفات</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>{plData.expenses.toLocaleString()} ج</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>صافي الربح</p>
                    <p className="text-2xl font-bold" style={{ color: plData.profit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{plData.profit.toLocaleString()} ج</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>هامش الربح</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-info)" }}>{plData.profitMargin}%</p>
                  </div>
                </div>

                <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                  <h3 className="font-medium mb-4" style={{ color: "var(--color-text-primary)" }}>تفاصيل المعاملات ({plData.txCount})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                          <th className="text-right pb-3 px-1">التاريخ</th>
                          <th className="text-right pb-3 px-1">البيان</th>
                          <th className="text-right pb-3 px-1">التصنيف</th>
                          <th className="text-right pb-3 px-1">المبلغ</th>
                          <th className="text-right pb-3 px-1">النوع</th>
                          <th className="text-right pb-3 px-1">بواسطة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plData.details.map((tx: any, i: number) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                            <td className="py-2 px-1" style={{ color: "var(--color-text-secondary)" }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                            <td className="py-2 px-1" style={{ color: "var(--color-text-primary)" }}>{tx.description || "—"}</td>
                            <td className="py-2 px-1" style={{ color: "var(--color-text-secondary)" }}>{tx.category}</td>
                            <td className="py-2 px-1 font-medium" style={{ color: "var(--color-text-primary)" }}>{Number(tx.amount).toLocaleString()} ج</td>
                            <td className="py-2 px-1">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                                background: tx.type === "إيراد" ? "var(--color-success-light)" : "var(--color-danger-light)",
                                color: tx.type === "إيراد" ? "var(--color-success)" : "var(--color-danger)",
                              }}>{tx.type}</span>
                            </td>
                            <td className="py-2 px-1" style={{ color: "var(--color-text-muted)" }}>{tx.created_by_name || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => exportPDF("تقرير-الأرباح-والخسائر")}
                    className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-danger)" }}>📄 PDF</button>
                  <button onClick={() => {
                    const data = plData.details.map((tx: any) => ({
                      "التاريخ": new Date(tx.date).toLocaleDateString('ar-EG'),
                      "البيان": tx.description || "—",
                      "التصنيف": tx.category,
                      "المبلغ": tx.amount,
                      "النوع": tx.type,
                      "بواسطة": tx.created_by_name || "—",
                    }));
                    exportToExcel(data, "تقرير-الأرباح-والخسائر", "الأرباح والخسائر");
                  }} className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-accent)" }}>⬇ Excel</button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-4xl mb-3">📊</p>
                <p>اختر نطاق تاريخ واضغط "عرض التقرير"</p>
              </div>
            )}
          </div>
        )}

        {/* ======================== MONTHLY TAB ======================== */}
        {tab === "monthly" && (
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div>
                <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>السنة</label>
                <select value={year} onChange={(e) => setYear(e.target.value)}
                  className="border rounded-lg px-4 py-2 text-sm" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {monthlyLoading ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>جاري التحميل...</div>
            ) : monthlyData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي الإيرادات</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-success)" }}>{monthlyData.totals.income.toLocaleString()} ج</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي المصروفات</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>{monthlyData.totals.expenses.toLocaleString()} ج</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>صافي الربح</p>
                    <p className="text-2xl font-bold" style={{ color: monthlyData.totals.profit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{monthlyData.totals.profit.toLocaleString()} ج</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>عدد المعاملات</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-info)" }}>{monthlyData.totals.txCount}</p>
                  </div>
                </div>

                <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                  <h3 className="font-medium mb-4" style={{ color: "var(--color-text-primary)" }}>التفاصيل الشهرية — {year}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                          <th className="text-right pb-3 px-1">الشهر</th>
                          <th className="text-right pb-3 px-1">الإيرادات</th>
                          <th className="text-right pb-3 px-1">المصروفات</th>
                          <th className="text-right pb-3 px-1">صافي الربح</th>
                          <th className="text-right pb-3 px-1">عدد المعاملات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.months.map((m: any) => {
                          const profit = Number(m.income) - Number(m.expenses);
                          return (
                            <tr key={m.month_num} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                              <td className="py-2 px-1 font-medium" style={{ color: "var(--color-text-primary)" }}>{m.month}</td>
                              <td className="py-2 px-1" style={{ color: "var(--color-success)" }}>{Number(m.income).toLocaleString()} ج</td>
                              <td className="py-2 px-1" style={{ color: "var(--color-danger)" }}>{Number(m.expenses).toLocaleString()} ج</td>
                              <td className="py-2 px-1 font-medium" style={{ color: profit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{profit.toLocaleString()} ج</td>
                              <td className="py-2 px-1" style={{ color: "var(--color-text-secondary)" }}>{m.tx_count}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => exportPDF(`تقرير-شهري-${year}`)}
                    className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-danger)" }}>📄 PDF</button>
                  <button onClick={() => {
                    const data = monthlyData.months.map((m: any) => ({
                      "الشهر": m.month,
                      "الإيرادات": Number(m.income),
                      "المصروفات": Number(m.expenses),
                      "صافي الربح": Number(m.income) - Number(m.expenses),
                      "عدد المعاملات": m.tx_count,
                    }));
                    exportToExcel(data, `تقرير-شهري-${year}`, "التقرير الشهري");
                  }} className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-accent)" }}>⬇ Excel</button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-4xl mb-3">📅</p>
                <p>اختر السنة لعرض التقرير</p>
              </div>
            )}
          </div>
        )}

        {/* ======================== CLIENT STATEMENT TAB ======================== */}
        {tab === "client" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>العميل</label>
                <select value={selClient} onChange={(e) => setSelClient(e.target.value)}
                  className="border rounded-lg px-4 py-2 text-sm min-w-[14rem]" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                  <option value="">اختر عميل</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>من تاريخ</label>
                <input type="date" value={csFrom} onChange={(e) => setCsFrom(e.target.value)}
                  className="border rounded-lg px-4 py-2 text-sm" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>إلى تاريخ</label>
                <input type="date" value={csTo} onChange={(e) => setCsTo(e.target.value)}
                  className="border rounded-lg px-4 py-2 text-sm" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
              </div>
              <button onClick={fetchCS} className="text-white text-sm px-6 py-2.5 rounded-lg transition" style={{ background: "var(--color-accent)" }}>
                عرض كشف الحساب
              </button>
            </div>

            {csLoading ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>جاري التحميل...</div>
            ) : csData ? (
              <div className="space-y-4">
                <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                  <h3 className="font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>بيانات العميل</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    <p><strong style={{ color: "var(--color-text-primary)" }}>الاسم:</strong> {csData.client.name}</p>
                    <p><strong style={{ color: "var(--color-text-primary)" }}>البريد:</strong> {csData.client.email || "—"}</p>
                    <p><strong style={{ color: "var(--color-text-primary)" }}>الهاتف:</strong> {csData.client.phone || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي الفواتير</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-info)" }}>{csData.summary.total_invoices}</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي المبالغ</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-warning)" }}>{Number(csData.summary.total_amount).toLocaleString()} ج</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>المدفوع</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-success)" }}>{Number(csData.summary.paid_amount).toLocaleString()} ج</p>
                  </div>
                  <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                    <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>المتبقي</p>
                    <p className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>{Number(csData.summary.pending_amount).toLocaleString()} ج</p>
                  </div>
                </div>

                <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
                  <h3 className="font-medium mb-4" style={{ color: "var(--color-text-primary)" }}>سجل الفواتير</h3>
                  {csData.invoices.length === 0 ? (
                    <p className="text-center py-4" style={{ color: "var(--color-text-muted)" }}>لا توجد فواتير في النطاق المحدد</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                            <th className="text-right pb-3 px-1">#</th>
                            <th className="text-right pb-3 px-1">المبلغ</th>
                            <th className="text-right pb-3 px-1">الحالة</th>
                            <th className="text-right pb-3 px-1">تاريخ الاستحقاق</th>
                            <th className="text-right pb-3 px-1">تاريخ الإنشاء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csData.invoices.map((inv: any) => (
                            <tr key={inv.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                              <td className="py-2 px-1" style={{ color: "var(--color-text-muted)" }}>#{inv.id}</td>
                              <td className="py-2 px-1 font-medium" style={{ color: "var(--color-text-primary)" }}>{Number(inv.amount).toLocaleString()} ج</td>
                              <td className="py-2 px-1">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                                  background: inv.status === "paid" ? "var(--color-success-light)" : inv.status === "overdue" ? "var(--color-danger-light)" : "var(--color-warning-light)",
                                  color: inv.status === "paid" ? "var(--color-success)" : inv.status === "overdue" ? "var(--color-danger)" : "var(--color-warning)",
                                }}>
                                  {inv.status === "paid" ? "مدفوع" : inv.status === "overdue" ? "متأخر" : "معلق"}
                                </span>
                              </td>
                              <td className="py-2 px-1" style={{ color: "var(--color-text-secondary)" }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : "—"}</td>
                              <td className="py-2 px-1" style={{ color: "var(--color-text-secondary)" }}>{new Date(inv.created_at).toLocaleDateString('ar-EG')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => exportPDF(`كشف-حساب-${csData.client.name}`)}
                    className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-danger)" }}>📄 PDF</button>
                  <button onClick={() => {
                    const data = csData.invoices.map((inv: any) => ({
                      "رقم الفاتورة": `#${inv.id}`,
                      "المبلغ": Number(inv.amount),
                      "الحالة": inv.status === "paid" ? "مدفوع" : inv.status === "overdue" ? "متأخر" : "معلق",
                      "تاريخ الاستحقاق": inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : "—",
                      "تاريخ الإنشاء": new Date(inv.created_at).toLocaleDateString('ar-EG'),
                    }));
                    exportToExcel(data, `كشف-حساب-${csData.client.name}`, "كشف حساب");
                  }} className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-accent)" }}>⬇ Excel</button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-4xl mb-3">👤</p>
                <p>اختر عميل واضغط "عرض كشف الحساب"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
