import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { exportToExcel } from "../utils/exportExcel";

interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  balance: number;
}

interface SupplierTransaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  date: string;
}

const API = "https://v-accounting-production.up.railway.app";

const Suppliers = () => {
  const { token, canEdit, canDelete } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [showTxForm, setShowTxForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [txForm, setTxForm] = useState({
    amount: "", type: "مشتريات", description: "",
    date: new Date().toISOString().split("T")[0]
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${API}/api/suppliers`, { headers });
      setSuppliers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTransactions = async (supplierId: number) => {
    try {
      const res = await axios.get(`${API}/api/suppliers/${supplierId}/transactions`, { headers });
      setTransactions(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/suppliers`, form, { headers });
      setForm({ name: "", email: "", phone: "", address: "" });
      setShowForm(false);
      fetchSuppliers();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API}/api/suppliers/${id}`, { headers });
      if (selectedSupplier?.id === id) setSelectedSupplier(null);
      fetchSuppliers();
    } catch (err) { console.error(err); }
  };

  const handleAddTransaction = async () => {
    if (!txForm.amount || !selectedSupplier) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/suppliers/${selectedSupplier.id}/transactions`, txForm, { headers });
      setTxForm({ amount: "", type: "مشتريات", description: "", date: new Date().toISOString().split("T")[0] });
      setShowTxForm(false);
      fetchSuppliers();
      fetchTransactions(selectedSupplier.id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    const data = suppliers.map(s => ({
      "الاسم": s.name,
      "البريد": s.email,
      "الهاتف": s.phone,
      "العنوان": s.address,
      "الرصيد": s.balance,
    }));
    exportToExcel(data, "الموردين", "الموردين");
  };

  const totalDebt = suppliers.reduce((s, sup) => s + Number(sup.balance), 0);

  return (
    <div className="p-8 space-y-6">

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>الموردين</h3>
          <p className="text-sm" style={{ color: "#888" }}>{suppliers.length} مورد مسجل</p>
        </div>
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
              + إضافة مورد
            </button>
          )}
        </div>
      </div>

      {/* Add Form */}
      {canEdit && showForm && (
        <div className="rounded-xl p-6 space-y-4 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
          <h4 className="font-medium" style={{ color: "#333" }}>مورد جديد</h4>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={loading}
              className="text-white text-sm px-6 py-2 rounded-lg"
              style={{ background: loading ? "#81c784" : "#217346" }}>
              {loading ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="text-sm px-6 py-2 rounded-lg"
              style={{ background: "#f5f5f5", color: "#555", border: "1px solid #ddd" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Suppliers List */}
        <div className="space-y-3">
          {suppliers.length === 0 ? (
            <div className="rounded-xl p-12 text-center border" style={{ background: "#ffffff", borderColor: "#e0e0e0", color: "#bbb" }}>
              <p className="text-4xl mb-3">🚚</p>
              <p>لا يوجد موردين بعد</p>
            </div>
          ) : (
            suppliers.map((supplier) => (
              <div key={supplier.id}
                className="rounded-xl p-4 border cursor-pointer transition"
                style={{
                  background: selectedSupplier?.id === supplier.id ? "#e8f5e9" : "#ffffff",
                  borderColor: selectedSupplier?.id === supplier.id ? "#217346" : "#e0e0e0"
                }}
                onClick={() => { setSelectedSupplier(supplier); fetchTransactions(supplier.id); }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: "#217346" }}>
                      {supplier.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: "#1a1a1a" }}>{supplier.name}</p>
                      {supplier.phone && <p className="text-xs" style={{ color: "#888" }}>📞 {supplier.phone}</p>}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold" style={{ color: Number(supplier.balance) > 0 ? "#c62828" : "#217346" }}>
                      {Number(supplier.balance).toLocaleString()} ج
                    </p>
                    <p className="text-xs" style={{ color: "#888" }}>
                      {Number(supplier.balance) > 0 ? "مديونية" : "مسوّى"}
                    </p>
                  </div>
                </div>
                {canDelete && (
                  <div className="flex justify-end mt-2">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }}
                      className="text-xs" style={{ color: "#bbb" }}
                      onMouseOver={e => (e.currentTarget.style.color = "#c62828")}
                      onMouseOut={e => (e.currentTarget.style.color = "#bbb")}>
                      حذف
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Supplier Details */}
        {selectedSupplier ? (
          <div className="rounded-xl border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid #e0e0e0" }}>
              <div>
                <h4 className="font-bold" style={{ color: "#1a1a1a" }}>{selectedSupplier.name}</h4>
                <p className="text-sm" style={{ color: Number(selectedSupplier.balance) > 0 ? "#c62828" : "#217346" }}>
                  الرصيد: {Number(selectedSupplier.balance).toLocaleString()} ج
                </p>
              </div>
              {canEdit && (
                <button onClick={() => setShowTxForm(!showTxForm)}
                  className="text-white text-sm px-3 py-2 rounded-lg"
                  style={{ background: "#217346" }}>
                  + معاملة
                </button>
              )}
            </div>

            {showTxForm && canEdit && (
              <div className="p-4 space-y-3" style={{ borderBottom: "1px solid #e0e0e0", background: "#f9f9f9" }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#555" }}>النوع</label>
                    <select value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ background: "#ffffff", border: "1px solid #ddd", color: "#333" }}>
                      <option>مشتريات</option>
                      <option>مدفوع</option>
                      <option>مرتجع</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#555" }}>المبلغ</label>
                    <input type="number" value={txForm.amount}
                      onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                      placeholder="0" className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ background: "#ffffff", border: "1px solid #ddd", color: "#333" }} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#555" }}>التاريخ</label>
                    <input type="date" value={txForm.date}
                      onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ background: "#ffffff", border: "1px solid #ddd", color: "#333" }} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "#555" }}>البيان</label>
                    <input type="text" value={txForm.description}
                      onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                      placeholder="وصف" className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ background: "#ffffff", border: "1px solid #ddd", color: "#333" }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddTransaction} disabled={loading}
                    className="text-white text-sm px-4 py-2 rounded-lg"
                    style={{ background: "#217346" }}>
                    {loading ? "..." : "حفظ"}
                  </button>
                  <button onClick={() => setShowTxForm(false)}
                    className="text-sm px-4 py-2 rounded-lg"
                    style={{ background: "#f5f5f5", color: "#555", border: "1px solid #ddd" }}>
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 space-y-2 overflow-auto" style={{ maxHeight: "400px" }}>
              {transactions.length === 0 ? (
                <p className="text-center py-4 text-sm" style={{ color: "#bbb" }}>لا توجد معاملات بعد</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#f9f9f9" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#333" }}>{tx.description || tx.type}</p>
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
          <div className="rounded-xl border flex items-center justify-center" style={{ background: "#fafafa", borderColor: "#e0e0e0", minHeight: "300px" }}>
            <p className="text-sm" style={{ color: "#bbb" }}>اختر مورد لعرض تفاصيله</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Suppliers;