import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

interface BankAccount {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  iban: string;
  swift: string;
  currency: string;
  balance: number;
  created_at: string;
}

interface BankTx {
  id: number;
  type: "deposit" | "withdraw";
  amount: number;
  description: string;
  date: string;
  reference: string;
}

const BankSync = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ bank_name: "", account_name: "", account_number: "", iban: "", swift: "", currency: "EGP", balance: "0" });
  const [selAccount, setSelAccount] = useState<number | null>(null);
  const [txs, setTxs] = useState<BankTx[]>([]);
  const [txForm, setTxForm] = useState({ type: "deposit", amount: "", description: "", date: "", reference: "" });
  const [showTxForm, setShowTxForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

  const fetchAccounts = async () => {
    const res = await axios.get(`${API}/api/bank`, { headers });
    setAccounts(res.data);
  };

  const fetchTxs = async (id: number) => {
    const res = await axios.get(`${API}/api/bank/transactions/${id}`, { headers });
    setTxs(res.data);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleAddAccount = async () => {
    if (!form.bank_name || !form.account_name) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/bank`, form, { headers });
      setForm({ bank_name: "", account_name: "", account_number: "", iban: "", swift: "", currency: "EGP", balance: "0" });
      setShowForm(false);
      fetchAccounts();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDeleteAccount = async (id: number) => {
    await axios.delete(`${API}/api/bank/${id}`, { headers });
    if (selAccount === id) { setSelAccount(null); setTxs([]); }
    fetchAccounts();
  };

  const handleAddTx = async () => {
    if (!selAccount || !txForm.amount) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/bank/transactions`, { account_id: selAccount, ...txForm }, { headers });
      setTxForm({ type: "deposit", amount: "", description: "", date: "", reference: "" });
      setShowTxForm(false);
      fetchTxs(selAccount);
      fetchAccounts();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selAccount) return;
    setImporting(true);
    setImportResult("");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        const transactions = lines.slice(1).map(line => {
          const parts = line.split(',');
          return {
            type: parts[2]?.trim()?.toLowerCase() === 'withdrawal' ? 'withdraw' : 'deposit',
            amount: Math.abs(parseFloat(parts[3]?.trim() || '0')),
            description: parts[4]?.trim() || '',
            date: parts[0]?.trim() || new Date().toISOString().split('T')[0],
            reference: parts[1]?.trim() || '',
          };
        }).filter(t => t.amount > 0);
        const res = await axios.post(`${API}/api/bank/upload-csv`, { account_id: selAccount, transactions }, { headers });
        setImportResult(`✅ تم استيراد ${res.data.imported} معاملة بنجاح`);
        fetchTxs(selAccount);
        fetchAccounts();
      } catch (err) {
        setImportResult("❌ فشل الاستيراد. تأكد من صيغة الملف (CSV)");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="p-8 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>ربط البنوك 🏦</h3>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{accounts.length} حساب · الرصيد الكلي: {totalBalance.toLocaleString()} ج</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-accent)" }}>
          + إضافة حساب
        </button>
      </div>

      {/* Add Account Form */}
      {showForm && (
        <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>حساب بنكي جديد</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>اسم البنك *</label>
              <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="بنك مصر" className="w-full border rounded-lg px-4 py-3 text-sm"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>اسم الحساب *</label>
              <input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                placeholder="الحساب الجاري" className="w-full border rounded-lg px-4 py-3 text-sm"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>رقم الحساب</label>
              <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="123456789" className="w-full border rounded-lg px-4 py-3 text-sm"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>IBAN</label>
              <input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })}
                placeholder="EG..." className="w-full border rounded-lg px-4 py-3 text-sm"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>SWIFT</label>
              <input value={form.swift} onChange={(e) => setForm({ ...form, swift: e.target.value })}
                placeholder="BANKEG..." className="w-full border rounded-lg px-4 py-3 text-sm"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الرصيد الافتتاحي</label>
              <input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0" className="w-full border rounded-lg px-4 py-3 text-sm"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddAccount} disabled={loading}
              className="text-white text-sm px-6 py-2 rounded-lg transition disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
              {loading ? "جاري الحفظ..." : "إضافة"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-lg transition text-sm" style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="grid grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className={`rounded-xl p-5 border cursor-pointer transition ${
            selAccount === acc.id ? "ring-2" : ""
          }`} style={{
            background: "var(--color-bg-card)",
            borderColor: selAccount === acc.id ? "var(--color-accent)" : "var(--color-border)",
          }} onClick={() => { setSelAccount(acc.id); fetchTxs(acc.id); }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🏦</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id); }}
                className="text-xs" style={{ color: "var(--color-text-muted)" }}>حذف</button>
            </div>
            <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{acc.bank_name}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{acc.account_name}</p>
            <p className="text-xl font-bold mt-2" style={{ color: Number(acc.balance) >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
              {Number(acc.balance).toLocaleString()} {acc.currency}
            </p>
            {acc.account_number && <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>•••• {acc.account_number.slice(-4)}</p>}
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-3 text-center py-12" style={{ color: "var(--color-text-muted)" }}>
            <p className="text-4xl mb-3">🏦</p>
            <p>لا توجد حسابات بنكية بعد. أضف حسابك الأول!</p>
          </div>
        )}
      </div>

      {/* Account Transactions */}
      {selAccount && (
        <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between">
            <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>المعاملات البنكية</h4>
            <div className="flex gap-2">
              <label className="text-white text-sm px-3 py-2 rounded-lg transition cursor-pointer" style={{ background: "var(--color-accent)" }}>
                {importing ? "جاري الاستيراد..." : "📥 استيراد CSV"}
                <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" disabled={importing} />
              </label>
              <button onClick={() => setShowTxForm(!showTxForm)}
                className="text-white text-sm px-3 py-2 rounded-lg transition" style={{ background: "#1a5c38" }}>
                + إضافة معاملة
              </button>
            </div>
          </div>

          {importResult && (
            <p className="text-sm" style={{ color: importResult.includes("✅") ? "var(--color-success)" : "var(--color-danger)" }}>{importResult}</p>
          )}

          {showTxForm && (
            <div className="grid grid-cols-5 gap-3 p-4 rounded-lg border" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)" }}>
              <select value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}>
                <option value="deposit">إيداع</option>
                <option value="withdraw">سحب</option>
              </select>
              <input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                placeholder="المبلغ" className="border rounded-lg px-3 py-2 text-sm" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
              <input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                placeholder="الوصف" className="border rounded-lg px-3 py-2 text-sm" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
              <input type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
              <button onClick={handleAddTx} disabled={loading || !txForm.amount}
                className="text-white text-sm px-4 py-2 rounded-lg transition disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
                {loading ? "..." : "حفظ"}
              </button>
            </div>
          )}

          {txs.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: "var(--color-text-muted)" }}>لا توجد معاملات بنكية بعد</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                  <th className="text-right pb-3">التاريخ</th>
                  <th className="text-right pb-3">النوع</th>
                  <th className="text-right pb-3">البيان</th>
                  <th className="text-right pb-3">المبلغ</th>
                  <th className="text-right pb-3">مرجع</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                    <td className="py-2" style={{ color: "var(--color-text-secondary)" }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                    <td className="py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                        background: tx.type === "deposit" ? "var(--color-success-light)" : "var(--color-danger-light)",
                        color: tx.type === "deposit" ? "var(--color-success)" : "var(--color-danger)",
                      }}>{tx.type === "deposit" ? "إيداع" : "سحب"}</span>
                    </td>
                    <td className="py-2" style={{ color: "var(--color-text-primary)" }}>{tx.description || "—"}</td>
                    <td className="py-2 font-medium" style={{ color: tx.type === "deposit" ? "var(--color-success)" : "var(--color-danger)" }}>
                      {tx.type === "deposit" ? "+" : "-"}{Number(tx.amount).toLocaleString()} ج
                    </td>
                    <td className="py-2" style={{ color: "var(--color-text-muted)" }}>{tx.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            💡 CSV format: <code>date, reference, type (deposit/withdrawal), amount, description</code>
          </p>
        </div>
      )}
    </div>
  );
};

export default BankSync;
