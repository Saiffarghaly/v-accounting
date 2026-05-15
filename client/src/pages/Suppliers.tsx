import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  balance: number;
}

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  date: string;
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const Suppliers = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState<"add" | "purchase" | "debts">("add");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  // Add supplier form
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  // Purchase form
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: "", amount: "", description: "",
    date: new Date().toISOString().split("T")[0]
  });
  const [recentPurchases, setRecentPurchases] = useState<Transaction[]>([]);

  // Debts
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierTransactions, setSupplierTransactions] = useState<Transaction[]>([]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${API}/api/suppliers`, { headers });
      setSuppliers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchRecentPurchases = async () => {
    try {
      const res = await axios.get(`${API}/api/suppliers`, { headers });
      const all: Transaction[] = [];
      for (const s of res.data) {
        const txRes = await axios.get(`${API}/api/suppliers/${s.id}/transactions`, { headers });
        txRes.data.forEach((tx: Transaction) => {
          if (tx.type === "مشتريات") all.push({ ...tx, description: `${s.name} - ${tx.description}` });
        });
      }
      setRecentPurchases(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
    } catch (err) { console.error(err); }
  };

  const fetchTransactions = async (supplierId: number) => {
    try {
      const res = await axios.get(`${API}/api/suppliers/${supplierId}/transactions`, { headers });
      setSupplierTransactions(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleAddSupplier = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/suppliers`, form, { headers });
      setForm({ name: "", phone: "", email: "", address: "" });
      fetchSuppliers();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRecordPurchase = async () => {
    if (!purchaseForm.supplierId || !purchaseForm.amount) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/suppliers/${purchaseForm.supplierId}/transactions`, {
        amount: purchaseForm.amount,
        type: "مشتريات",
        description: purchaseForm.description,
        date: purchaseForm.date || new Date().toISOString().split("T")[0]
      }, { headers });
      setPurchaseForm({ supplierId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      fetchSuppliers();
      fetchRecentPurchases();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalDebt = suppliers.reduce((s, sup) => s + Number(sup.balance), 0);

  const tabs = [
    { id: "add" as const, label: "إضافة مورد", icon: "➕" },
    { id: "purchase" as const, label: "تسجيل مشتريات", icon: "🛒" },
    { id: "debts" as const, label: "مديونيات للموردين", icon: "📋" },
  ];

  return (
    <div className="p-8 space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl p-1" style={{ background: "#f0f0f0" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "purchase") fetchRecentPurchases(); if (t.id === "debts") { setSelectedSupplier(null); } }}
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

      {/* Tab: إضافة مورد */}
      {tab === "add" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border space-y-4" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold" style={{ color: "#1a1a1a" }}>إضافة مورد جديد</h4>
            {[
              { key: "name", label: "اسم المورد *", type: "text", placeholder: "اسم المورد" },
              { key: "phone", label: "رقم الهاتف", type: "tel", placeholder: "01000000000" },
              { key: "email", label: "البريد الإلكتروني", type: "email", placeholder: "email@example.com" },
              { key: "address", label: "العنوان", type: "text", placeholder: "العنوان" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>{f.label}</label>
                <input type={f.type} value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
            ))}
            <button onClick={handleAddSupplier} disabled={loading || !form.name}
              className="text-white text-sm px-6 py-2.5 rounded-lg transition w-full"
              style={{ background: loading || !form.name ? "#81c784" : "#217346" }}>
              {loading ? "جاري الحفظ..." : "حفظ المورد"}
            </button>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>الموردين المسجلين</h4>
            {suppliers.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا يوجد موردين بعد</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {suppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#f9f9f9" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: "#217346" }}>{s.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#333" }}>{s.name}</p>
                        {s.phone && <p className="text-xs" style={{ color: "#888" }}>{s.phone}</p>}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full" style={{
                      background: Number(s.balance) > 0 ? "#ffebee" : "#e8f5e9",
                      color: Number(s.balance) > 0 ? "#c62828" : "#217346"
                    }}>
                      {Number(s.balance) > 0 ? "عليه مديونية" : "مسوّى"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: تسجيل مشتريات */}
      {tab === "purchase" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border space-y-4" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold" style={{ color: "#1a1a1a" }}>تسجيل مشتريات جديدة</h4>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>المورد *</label>
              <select value={purchaseForm.supplierId}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}>
                <option value="">اختر المورد</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} - {Number(s.balance).toLocaleString()} ج</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>المبلغ *</label>
                <input type="number" value={purchaseForm.amount}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
                  placeholder="0" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>التاريخ</label>
                <input type="date" value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>البيان</label>
              <input type="text" value={purchaseForm.description}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
                placeholder="وصف المشتريات" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <button onClick={handleRecordPurchase}
              disabled={loading || !purchaseForm.supplierId || !purchaseForm.amount}
              className="text-white text-sm px-6 py-2.5 rounded-lg transition w-full"
              style={{ background: loading || !purchaseForm.supplierId || !purchaseForm.amount ? "#81c784" : "#217346" }}>
              {loading ? "جاري الحفظ..." : "تسجيل المشتريات"}
            </button>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>آخر المشتريات</h4>
            {recentPurchases.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا توجد مشتريات بعد</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {recentPurchases.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#f9f9f9" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#333" }}>{tx.description}</p>
                      <p className="text-xs" style={{ color: "#888" }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#c62828" }}>
                      +{Number(tx.amount).toLocaleString()} ج
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: مديونيات للموردين */}
      {tab === "debts" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
              <p className="text-sm mb-1" style={{ color: "#888" }}>إجمالي الموردين</p>
              <p className="text-2xl font-bold" style={{ color: "#217346" }}>{suppliers.length}</p>
            </div>
            <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
              <p className="text-sm mb-1" style={{ color: "#888" }}>إجمالي المديونيات</p>
              <p className="text-2xl font-bold" style={{ color: totalDebt > 0 ? "#c62828" : "#217346" }}>
                {totalDebt.toLocaleString()} ج
              </p>
            </div>
            <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
              <p className="text-sm mb-1" style={{ color: "#888" }}>موردين عليهم ديون</p>
              <p className="text-2xl font-bold" style={{ color: "#e65100" }}>
                {suppliers.filter(s => Number(s.balance) > 0).length}
              </p>
            </div>
          </div>

          {/* Suppliers debts list */}
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
              <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>قائمة المديونيات</h4>
              {suppliers.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا يوجد موردين</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {suppliers.map(s => (
                    <div key={s.id} onClick={() => { setSelectedSupplier(s); fetchTransactions(s.id); }}
                      className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition"
                      style={{
                        background: selectedSupplier?.id === s.id ? "#e8f5e9" : "#f9f9f9",
                        border: selectedSupplier?.id === s.id ? "1px solid #217346" : "1px solid transparent"
                      }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: Number(s.balance) > 0 ? "#c62828" : "#217346" }}>
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#333" }}>{s.name}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold" style={{ color: Number(s.balance) > 0 ? "#c62828" : "#217346" }}>
                          {Number(s.balance).toLocaleString()} ج
                        </p>
                        <p className="text-xs" style={{ color: "#888" }}>
                          {Number(s.balance) > 0 ? "مديونية" : "مسوّى"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected supplier transactions */}
            {selectedSupplier ? (
              <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                <h4 className="font-semibold mb-1" style={{ color: "#1a1a1a" }}>{selectedSupplier.name}</h4>
                <p className="text-sm mb-4" style={{
                  color: Number(selectedSupplier.balance) > 0 ? "#c62828" : "#217346",
                  fontWeight: 600
                }}>
                  الرصيد: {Number(selectedSupplier.balance).toLocaleString()} ج
                  {Number(selectedSupplier.balance) > 0 ? " (مديونية)" : " (مسوّى)"}
                </p>
                <div className="space-y-2 max-h-80 overflow-auto">
                  {supplierTransactions.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا توجد معاملات</p>
                  ) : (
                    supplierTransactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: "#f9f9f9" }}>
                        <div>
                          <p className="text-sm" style={{ color: "#333" }}>{tx.description || tx.type}</p>
                          <p className="text-xs" style={{ color: "#888" }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold"
                            style={{ color: tx.type === "مدفوع" ? "#217346" : "#c62828" }}>
                            {tx.type === "مدفوع" ? "-" : "+"}{Number(tx.amount).toLocaleString()} ج
                          </p>
                          <p className="text-xs" style={{ color: "#888" }}>{tx.type}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-6 border flex items-center justify-center"
                style={{ background: "#fafafa", borderColor: "#e0e0e0", minHeight: "300px" }}>
                <p className="text-sm" style={{ color: "#bbb" }}>اختر مورد لعرض تفاصيل مديونيته</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Suppliers;
