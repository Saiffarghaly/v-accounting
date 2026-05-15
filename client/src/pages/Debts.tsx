import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface Client {
  id: number;
  name: string;
}

interface Debt {
  id: number;
  client_id: number;
  client_name: string;
  amount: number;
  remaining: number;
  description: string;
  due_date: string;
  status: string;
}

interface Payment {
  id: number;
  amount: number;
  date: string;
  notes: string;
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const Debts = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState<"register" | "track" | "overdue">("register");
  const [clients, setClients] = useState<Client[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [overdue, setOverdue] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(false);

  // Register form
  const [form, setForm] = useState({ client_id: "", amount: "", description: "", due_date: "" });

  // Track
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payForm, setPayForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/api/clients`, { headers });
      setClients(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchDebts = async () => {
    try {
      const res = await axios.get(`${API}/api/debts`, { headers });
      setDebts(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchOverdue = async () => {
    try {
      const res = await axios.get(`${API}/api/debts/overdue`, { headers });
      setOverdue(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPayments = async (debtId: number) => {
    try {
      const res = await axios.get(`${API}/api/debts/${debtId}/payments`, { headers });
      setPayments(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchClients(); fetchDebts(); }, []);

  const handleRegister = async () => {
    if (!form.client_id || !form.amount) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/debts`, form, { headers });
      setForm({ client_id: "", amount: "", description: "", due_date: "" });
      fetchDebts();
      fetchOverdue();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePay = async () => {
    if (!selectedDebt || !payForm.amount) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/debts/${selectedDebt.id}/payments`, payForm, { headers });
      setPayForm({ amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
      fetchPayments(selectedDebt.id);
      fetchDebts();
      fetchOverdue();
      if (selectedDebt) {
        const updated = debts.find(d => d.id === selectedDebt.id);
        if (updated) setSelectedDebt(updated);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalRemaining = debts.reduce((s, d) => s + Number(d.remaining), 0);

  const tabs = [
    { id: "register" as const, label: "تسجيل دين", icon: "📝" },
    { id: "track" as const, label: "تتبع المدفوعات", icon: "💰" },
    { id: "overdue" as const, label: "ديون متأخرة", icon: "⚠️" },
  ];

  return (
    <div className="p-8 space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl p-1" style={{ background: "#f0f0f0" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "track") fetchDebts(); if (t.id === "overdue") fetchOverdue(); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? "#ffffff" : "transparent",
              color: tab === t.id ? "#217346" : "#888",
              boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: تسجيل دين */}
      {tab === "register" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border space-y-4" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold" style={{ color: "#1a1a1a" }}>تسجيل دين على عميل</h4>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>العميل *</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}>
                <option value="">اختر العميل</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>المبلغ *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>تاريخ الاستحقاق</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>البيان</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="سبب الدين" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <button onClick={handleRegister} disabled={loading || !form.client_id || !form.amount}
              className="text-white text-sm px-6 py-2.5 rounded-lg transition w-full"
              style={{ background: loading || !form.client_id || !form.amount ? "#81c784" : "#217346" }}>
              {loading ? "جاري الحفظ..." : "تسجيل الدين"}
            </button>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>إجمالي الديون</h4>
            <p className="text-3xl font-bold mb-2" style={{ color: "#c62828" }}>{totalRemaining.toLocaleString()} ج</p>
            <p className="text-sm" style={{ color: "#888" }}>{debts.length} دين نشط</p>
            <div className="mt-4 space-y-2 max-h-72 overflow-auto">
              {debts.filter(d => d.status === "active").map(d => (
                <div key={d.id} className="flex justify-between p-3 rounded-lg text-sm" style={{ background: "#f9f9f9" }}>
                  <span style={{ color: "#333" }}>{d.client_name}</span>
                  <span style={{ color: Number(d.remaining) > 0 ? "#c62828" : "#217346" }}>
                    {Number(d.remaining).toLocaleString()} ج
                  </span>
                </div>
              ))}
              {debts.filter(d => d.status === "active").length === 0 && (
                <p className="text-center py-4 text-sm" style={{ color: "#bbb" }}>لا توجد ديون نشطة</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: تتبع المدفوعات */}
      {tab === "track" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>اختر دين لتسديد</h4>
            {debts.filter(d => d.status === "active" || d.status === "paid").length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا توجد ديون</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {debts.map(d => (
                  <div key={d.id} onClick={() => { setSelectedDebt(d); fetchPayments(d.id); }}
                    className="p-3 rounded-lg cursor-pointer transition"
                    style={{
                      background: selectedDebt?.id === d.id ? "#e8f5e9" : "#f9f9f9",
                      border: selectedDebt?.id === d.id ? "1px solid #217346" : "1px solid transparent"
                    }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#333" }}>{d.client_name}</p>
                        <p className="text-xs" style={{ color: "#888" }}>{d.description || "—"} · {d.due_date ? new Date(d.due_date).toLocaleDateString('ar-EG') : "بدون تاريخ"}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold" style={{ color: Number(d.remaining) > 0 ? "#c62828" : "#217346" }}>
                          {Number(d.remaining).toLocaleString()} ج
                        </p>
                        <p className="text-xs" style={{ color: "#888" }}>من {Number(d.amount).toLocaleString()} ج</p>
                      </div>
                    </div>
                    {d.status === "paid" && <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full" style={{ background: "#e8f5e9", color: "#217346" }}>تم السداد</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedDebt && selectedDebt.status !== "paid" ? (
            <div className="rounded-xl p-6 border space-y-4" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
              <h4 className="font-semibold" style={{ color: "#1a1a1a" }}>
                تسديد: {selectedDebt.client_name}
              </h4>
              <p className="text-sm" style={{ color: "#888" }}>
                المتبقي: <span style={{ color: "#c62828", fontWeight: 600 }}>{Number(selectedDebt.remaining).toLocaleString()} ج</span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "#555" }}>المبلغ *</label>
                  <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    placeholder="0" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                    style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "#555" }}>التاريخ</label>
                  <input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                    className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                    style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
                </div>
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>ملاحظات</label>
                <input type="text" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="ملاحظات" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
              <button onClick={handlePay} disabled={loading || !payForm.amount}
                className="text-white text-sm px-6 py-2.5 rounded-lg transition w-full"
                style={{ background: loading || !payForm.amount ? "#81c784" : "#217346" }}>
                {loading ? "جاري الحفظ..." : "تسديد"}
              </button>

              {/* Payment history */}
              {payments.length > 0 && (
                <div className="border-t pt-4" style={{ borderColor: "#e0e0e0" }}>
                  <h5 className="text-sm font-medium mb-2" style={{ color: "#555" }}>سجل المدفوعات</h5>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {payments.map(p => (
                      <div key={p.id} className="flex justify-between p-2 rounded text-sm" style={{ background: "#f9f9f9" }}>
                        <span style={{ color: "#333" }}>{p.notes || "دفعة"} · {new Date(p.date).toLocaleDateString('ar-EG')}</span>
                        <span style={{ color: "#217346", fontWeight: 600 }}>-{Number(p.amount).toLocaleString()} ج</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : selectedDebt && selectedDebt.status === "paid" ? (
            <div className="rounded-xl p-6 border flex items-center justify-center" style={{ background: "#fafafa", borderColor: "#e0e0e0", minHeight: "300px" }}>
              <p className="text-sm" style={{ color: "#217346" }}>تم سداد هذا الدين بالكامل ✅</p>
            </div>
          ) : (
            <div className="rounded-xl p-6 border flex items-center justify-center" style={{ background: "#fafafa", borderColor: "#e0e0e0", minHeight: "300px" }}>
              <p className="text-sm" style={{ color: "#bbb" }}>اختر دين لتسديده</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: ديون متأخرة */}
      {tab === "overdue" && (
        <div className="space-y-4">
          <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <p className="text-sm mb-1" style={{ color: "#888" }}>إجمالي الديون المتأخرة</p>
            <p className="text-2xl font-bold" style={{ color: "#c62828" }}>
              {overdue.reduce((s, d) => s + Number(d.remaining), 0).toLocaleString()} ج
            </p>
          </div>

          {overdue.length === 0 ? (
            <div className="rounded-xl p-12 border flex items-center justify-center" style={{ background: "#fafafa", borderColor: "#e0e0e0" }}>
              <p className="text-sm" style={{ color: "#217346" }}>لا توجد ديون متأخرة 🎉</p>
            </div>
          ) : (
            <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
              <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>ديون تجاوزت تاريخ الاستحقاق</h4>
              <div className="space-y-2 max-h-96 overflow-auto">
                {overdue.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: "#fff3e0" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#333" }}>{d.client_name}</p>
                      <p className="text-xs" style={{ color: "#888" }}>{d.description || "—"} · مستحق: {new Date(d.due_date).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold" style={{ color: "#c62828" }}>
                        {Number(d.remaining).toLocaleString()} ج
                      </p>
                      <p className="text-xs" style={{ color: "#e65100" }}>متأخر</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Debts;
