import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { exportToExcel } from "../utils/exportExcel";

interface Transaction {
  id: number;
  amount: number;
  type: string;
  category: string;
  description: string;
  date: string;
  created_by_name?: string;
}

const categories = ["مبيعات", "إيجار", "مرتبات", "خامات", "فواتير", "أخرى"];
const API = "https://v-accounting-production.up.railway.app";

const Transactions = () => {
  const { token, canEdit, canDelete } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    type: "إيراد",
    category: "مبيعات",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/api/transactions`, { headers });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleAdd = async () => {
    if (!form.amount || !form.description) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/transactions`, form, { headers });
      setForm({ amount: "", type: "إيراد", category: "مبيعات", description: "", date: new Date().toISOString().split("T")[0] });
      setShowForm(false);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API}/api/transactions/${id}`, { headers });
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = () => {
    const data = transactions.map(t => ({
      "البيان": t.description,
      "المبلغ": t.amount,
      "النوع": t.type,
      "التصنيف": t.category,
      "التاريخ": new Date(t.date).toLocaleDateString('ar-EG'),
    }));
    exportToExcel(data, "المعاملات", "المعاملات");
  };

  const totalIncome = transactions.filter(t => t.type === "إيراد").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "مصروف").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="p-8 space-y-6">

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <p className="text-sm mb-1" style={{ color: "#888" }}>إجمالي الإيرادات</p>
          <p className="text-2xl font-bold" style={{ color: "#217346" }}>{totalIncome.toLocaleString()} ج</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <p className="text-sm mb-1" style={{ color: "#888" }}>إجمالي المصروفات</p>
          <p className="text-2xl font-bold" style={{ color: "#c62828" }}>{totalExpense.toLocaleString()} ج</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <p className="text-sm mb-1" style={{ color: "#888" }}>صافي الربح</p>
          <p className="text-2xl font-bold" style={{ color: totalIncome - totalExpense >= 0 ? "#217346" : "#c62828" }}>
            {(totalIncome - totalExpense).toLocaleString()} ج
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>كل المعاملات</h3>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="text-white text-sm px-4 py-2 rounded-lg transition"
            style={{ background: "#388e3c" }}>
            تصدير Excel ⬇
          </button>
          {canEdit && (
            <button onClick={() => setShowForm(!showForm)}
              className="text-white text-sm px-4 py-2 rounded-lg transition"
              style={{ background: "#217346" }}>
              + إضافة معاملة
            </button>
          )}
        </div>
      </div>

      {canEdit && showForm && (
        <div className="rounded-xl p-6 space-y-4 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <h4 className="font-medium" style={{ color: "#333" }}>معاملة جديدة</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}>
                <option>إيراد</option>
                <option>مصروف</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>التصنيف</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>المبلغ</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>التاريخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <div className="col-span-2">
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>البيان</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="وصف المعاملة" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={loading}
              className="text-white text-sm px-6 py-2 rounded-lg transition"
              style={{ background: loading ? "#81c784" : "#217346" }}>
              {loading ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="text-sm px-6 py-2 rounded-lg transition"
              style={{ background: "#f5f5f5", color: "#555", border: "1px solid #ddd" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
        {transactions.length === 0 ? (
          <div className="text-center py-8" style={{ color: "#bbb" }}>
            <p className="text-3xl mb-2">📭</p>
            <p>لا توجد معاملات بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                <th className="text-right pb-3" style={{ color: "#888" }}>البيان</th>
                <th className="text-right pb-3" style={{ color: "#888" }}>التصنيف</th>
                <th className="text-right pb-3" style={{ color: "#888" }}>التاريخ</th>
                <th className="text-right pb-3" style={{ color: "#888" }}>المبلغ</th>
                <th className="text-right pb-3" style={{ color: "#888" }}>النوع</th>
                <th className="text-right pb-3" style={{ color: "#888" }}>بواسطة</th>
                <th className="text-right pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td className="py-3" style={{ color: "#333" }}>{tx.description}</td>
                  <td className="py-3" style={{ color: "#888" }}>{tx.category}</td>
                  <td className="py-3" style={{ color: "#888" }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                  <td className="py-3 font-medium" style={{ color: "#333" }}>{Number(tx.amount).toLocaleString()} ج</td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: tx.type === "إيراد" ? "#e8f5e9" : "#ffebee",
                        color: tx.type === "إيراد" ? "#217346" : "#c62828"
                      }}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3" style={{ color: "#888" }}>{tx.created_by_name || "—"}</td>
                  <td className="py-3">
                    {canDelete && (
                      <button onClick={() => handleDelete(tx.id)}
                        className="text-xs transition"
                        style={{ color: "#bbb" }}
                        onMouseOver={e => (e.currentTarget.style.color = "#c62828")}
                        onMouseOut={e => (e.currentTarget.style.color = "#bbb")}>
                        حذف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Transactions;
