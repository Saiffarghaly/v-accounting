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
}

const categories = ["مبيعات", "إيجار", "مرتبات", "خامات", "فواتير", "أخرى"];

const Transactions = () => {
  const { token } = useAuth();
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
      const res = await axios.get("https://v-accounting-production.up.railway.app/api/transactions", { headers });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAdd = async () => {
    if (!form.amount || !form.description) return;
    setLoading(true);
    try {
      await axios.post("https://v-accounting-production.up.railway.app/api/transactions", form, { headers });
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
      await axios.delete(`https://v-accounting-production.up.railway.app/api/transactions/${id}`, { headers });
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">إجمالي الإيرادات</p>
          <p className="text-2xl font-bold text-green-400">{totalIncome.toLocaleString()} ج</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">إجمالي المصروفات</p>
          <p className="text-2xl font-bold text-red-400">{totalExpense.toLocaleString()} ج</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">صافي الربح</p>
          <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? "text-blue-400" : "text-red-400"}`}>
            {(totalIncome - totalExpense).toLocaleString()} ج
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">كل المعاملات</h3>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition">
            تصدير Excel ⬇
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg transition">
            + إضافة معاملة
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h4 className="font-medium text-gray-300">معاملة جديدة</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500">
                <option>إيراد</option>
                <option>مصروف</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">التصنيف</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500">
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">المبلغ</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">التاريخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-400 mb-1 block">البيان</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="وصف المعاملة"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg transition">
              {loading ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-6 py-2 rounded-lg transition">
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        {transactions.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p className="text-3xl mb-2">📭</p>
            <p>لا توجد معاملات بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-right pb-3">البيان</th>
                <th className="text-right pb-3">التصنيف</th>
                <th className="text-right pb-3">التاريخ</th>
                <th className="text-right pb-3">المبلغ</th>
                <th className="text-right pb-3">النوع</th>
                <th className="text-right pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {transactions.map((tx) => (
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
                  <td className="py-3">
                    <button onClick={() => handleDelete(tx.id)}
                      className="text-gray-600 hover:text-red-400 transition text-xs">
                      حذف
                    </button>
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