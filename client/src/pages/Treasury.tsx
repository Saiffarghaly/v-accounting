import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import API_URL from "../utils/api";

interface TreasuryMovement {
  id: number;
  type: "deposit" | "withdraw";
  source: "cash" | "vodafone_cash" | "instapay";
  amount: number;
  description: string;
  date: string;
  created_at: string;
  created_by_name?: string;
}

interface SourceSummary {
  balance: number;
  deposits: number;
  withdrawals: number;
}

interface TreasurySummary {
  totalDeposits: number;
  totalWithdrawals: number;
  balance: number;
  sources: Record<TreasuryMovement["source"], SourceSummary>;
}

const sourceLabels: Record<TreasuryMovement["source"], string> = {
  cash: "نقدي",
  vodafone_cash: "فودافون كاش",
  instapay: "انستا باي",
};

const sourceColors: Record<TreasuryMovement["source"], string> = {
  cash: "#217346",
  vodafone_cash: "#c62828",
  instapay: "#1565c0",
};

const emptySummary: TreasurySummary = {
  totalDeposits: 0,
  totalWithdrawals: 0,
  balance: 0,
  sources: {
    cash: { balance: 0, deposits: 0, withdrawals: 0 },
    vodafone_cash: { balance: 0, deposits: 0, withdrawals: 0 },
    instapay: { balance: 0, deposits: 0, withdrawals: 0 },
  },
};

const Treasury = () => {
  const { token, canEdit, canDelete } = useAuth();
  const [movements, setMovements] = useState<TreasuryMovement[]>([]);
  const [summary, setSummary] = useState<TreasurySummary>(emptySummary);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    type: "deposit" as TreasuryMovement["type"],
    source: "cash" as TreasuryMovement["source"],
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTreasury = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/treasury`, { headers });
      setMovements(res.data.movements || []);
      setSummary(res.data.summary || emptySummary);
    } catch (err: any) {
      setError(err.response?.data?.error || "تعذر تحميل بيانات الخزنة");
    }
  };

  useEffect(() => {
    fetchTreasury();
  }, []);

  const handleAdd = async () => {
    if (!form.amount) return;
    setError("");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/treasury`, form, { headers });
      setForm({
        type: "deposit",
        source: "cash",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowForm(false);
      fetchTreasury();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setError(apiError === "Insufficient source balance" ? "الرصيد غير كافي في مصدر الفلوس المحدد" : apiError || "تعذر حفظ حركة الخزنة");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/api/treasury/${id}`, { headers });
      fetchTreasury();
    } catch (err) {
      console.error(err);
    }
  };

  const formatMoney = (value: number) => `${Number(value || 0).toLocaleString()} ج`;

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <p className="text-sm mb-1" style={{ color: "#666" }}>رصيد الخزنة الحالي</p>
          <p className="text-2xl font-bold" style={{ color: summary.balance >= 0 ? "#217346" : "#c62828" }}>
            {formatMoney(summary.balance)}
          </p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <p className="text-sm mb-1" style={{ color: "#666" }}>إجمالي الإيداعات</p>
          <p className="text-2xl font-bold" style={{ color: "#217346" }}>{formatMoney(summary.totalDeposits)}</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <p className="text-sm mb-1" style={{ color: "#666" }}>إجمالي السحوبات</p>
          <p className="text-2xl font-bold" style={{ color: "#c62828" }}>{formatMoney(summary.totalWithdrawals)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(sourceLabels) as TreasuryMovement["source"][]).map((source) => (
          <div key={source} className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold" style={{ color: "#333" }}>{sourceLabels[source]}</p>
              <span className="w-3 h-3 rounded-full" style={{ background: sourceColors[source] }} />
            </div>
            <p className="text-2xl font-bold mb-3" style={{ color: sourceColors[source] }}>
              {formatMoney(summary.sources[source]?.balance || 0)}
            </p>
            <div className="flex justify-between text-xs" style={{ color: "#777" }}>
              <span>إيداع: {formatMoney(summary.sources[source]?.deposits || 0)}</span>
              <span>سحب: {formatMoney(summary.sources[source]?.withdrawals || 0)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>حركات الخزنة</h3>
          <p className="text-sm" style={{ color: "#666" }}>{movements.length} حركة مسجلة</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)}
            className="text-white text-sm px-4 py-2 rounded-lg transition"
            style={{ background: "#217346" }}>
            + حركة خزنة
          </button>
        )}
      </div>

      {canEdit && showForm && (
        <div className="rounded-xl p-6 space-y-4 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <h4 className="font-medium" style={{ color: "#333" }}>حركة جديدة</h4>
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "#ffebee", color: "#c62828" }}>
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>نوع الحركة</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TreasuryMovement["type"] })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}>
                <option value="deposit">إيداع</option>
                <option value="withdraw">سحب</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>مصدر الفلوس</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as TreasuryMovement["source"] })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}>
                <option value="cash">نقدي</option>
                <option value="vodafone_cash">فودافون كاش</option>
                <option value="instapay">انستا باي</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>المبلغ *</label>
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
                placeholder="سبب الإيداع أو السحب" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
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
        {movements.length === 0 ? (
          <div className="text-center py-8" style={{ color: "#bbb" }}>
            <p className="text-3xl mb-2">💳</p>
            <p>لا توجد حركات خزنة بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table dir="rtl" lang="ar" className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                  <th className="text-right pb-3 px-1" style={{ color: "#888" }}>النوع</th>
                  <th className="text-right pb-3 px-1" style={{ color: "#888" }}>المصدر</th>
                  <th className="text-right pb-3 px-1" style={{ color: "#888" }}>البيان</th>
                  <th className="text-right pb-3 px-1" style={{ color: "#888" }}>التاريخ</th>
                  <th className="text-right pb-3 px-1" style={{ color: "#888" }}>المبلغ</th>
                  <th className="text-right pb-3 px-1" style={{ color: "#888" }}>بواسطة</th>
                  <th className="text-right pb-3 px-1 w-14"></th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td className="py-3 px-1 align-top">
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: movement.type === "deposit" ? "#e8f5e9" : "#ffebee",
                          color: movement.type === "deposit" ? "#217346" : "#c62828",
                        }}>
                        {movement.type === "deposit" ? "إيداع" : "سحب"}
                      </span>
                    </td>
                    <td className="py-3 px-1 align-top" style={{ color: sourceColors[movement.source] }}>{sourceLabels[movement.source]}</td>
                    <td className="py-3 px-1 align-top" style={{ color: "#333" }}>{movement.description || "—"}</td>
                    <td className="py-3 px-1 align-top" style={{ color: "#888" }}>{new Date(movement.date).toLocaleDateString("ar-EG")}</td>
                    <td className="py-3 px-1 align-top font-medium whitespace-nowrap" style={{ color: movement.type === "deposit" ? "#217346" : "#c62828" }}>
                      {movement.type === "deposit" ? "+" : "-"} {formatMoney(movement.amount)}
                    </td>
                    <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "#888" }}>{movement.created_by_name || "—"}</td>
                    <td className="py-3 px-1 align-top">
                      {canDelete && (
                        <button onClick={() => handleDelete(movement.id)}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Treasury;
