import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { exportToExcel } from "../utils/exportExcel";

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const Clients = () => {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/api/clients`, { headers });
      setClients(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/clients`, form, { headers });
      setForm({ name: "", email: "", phone: "", address: "" });
      setShowForm(false);
      fetchClients();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API}/api/clients/${id}`, { headers });
      fetchClients();
    } catch (err) { console.error(err); }
  };

  const handleExport = () => {
    const data = clients.map(c => ({
      "الاسم": c.name,
      "البريد الإلكتروني": c.email,
      "الهاتف": c.phone,
      "العنوان": c.address,
    }));
    exportToExcel(data, "العملاء", "العملاء");
  };

  return (
    <div className="p-8 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>العملاء</h3>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{clients.length} عميل مسجل</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-accent)" }}>
            تصدير Excel ⬇
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "#1a5c38" }}>
            + إضافة عميل
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>عميل جديد</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الاسم *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم العميل"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>رقم الهاتف</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01000000000"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>العنوان</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="العنوان"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={loading}
              className="text-white text-sm px-6 py-2 rounded-lg transition disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
              {loading ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-lg transition text-sm" style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="rounded-xl p-12 text-center border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
          <p className="text-4xl mb-3">👥</p>
          <p>لا يوجد عملاء بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {clients.map((client) => (
            <div key={client.id} className="rounded-xl p-5 border space-y-3" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: "var(--color-accent-light)", color: "var(--color-accent)" }}>
                    {client.name.charAt(0)}
                  </div>
                  <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{client.name}</p>
                </div>
                <button onClick={() => handleDelete(client.id)}
                  className="transition text-xs" style={{ color: "var(--color-text-muted)" }}>
                  حذف
                </button>
              </div>
              {client.email && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>📧 {client.email}</p>}
              {client.phone && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>📞 {client.phone}</p>}
              {client.address && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>📍 {client.address}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
