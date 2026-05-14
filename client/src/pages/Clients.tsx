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

const Clients = () => {
  const { token, canEdit, canDelete } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchClients = async () => {
    try {
      const res = await axios.get("https://v-accounting-production.up.railway.app/api/clients", { headers });
      setClients(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleAdd = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      await axios.post("https://v-accounting-production.up.railway.app/api/clients", form, { headers });
      setForm({ name: "", email: "", phone: "", address: "" });
      setShowForm(false);
      fetchClients();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`https://v-accounting-production.up.railway.app/api/clients/${id}`, { headers });
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
          <h3 className="text-lg font-semibold">العملاء</h3>
          <p className="text-sm text-gray-500">{clients.length} عميل مسجل</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition">
            تصدير Excel ⬇
          </button>
          {canEdit && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg transition">
            + إضافة عميل
            </button>
          )}
        </div>
      </div>

      {canEdit && showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h4 className="font-medium text-gray-300">عميل جديد</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">الاسم *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم العميل"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">رقم الهاتف</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01000000000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">العنوان</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="العنوان"
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

      {clients.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-600">
          <p className="text-4xl mb-3">👥</p>
          <p>لا يوجد عملاء بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {clients.map((client) => (
            <div key={client.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold">
                    {client.name.charAt(0)}
                  </div>
                  <p className="font-medium">{client.name}</p>
                </div>
                {canDelete && (
                  <button onClick={() => handleDelete(client.id)}
                    className="text-gray-600 hover:text-red-400 transition text-xs">
                  حذف
                  </button>
                )}
              </div>
              {client.email && <p className="text-sm text-gray-500">📧 {client.email}</p>}
              {client.phone && <p className="text-sm text-gray-500">📞 {client.phone}</p>}
              {client.address && <p className="text-sm text-gray-500">📍 {client.address}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clients;
