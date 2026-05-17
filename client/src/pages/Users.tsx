import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const roleColor = (role: string) => {
  if (role === "owner") return { bg: "var(--color-info-light)", color: "var(--color-info)" };
  if (role === "accountant") return { bg: "var(--color-success-light)", color: "var(--color-success)" };
  return { bg: "var(--color-bg-input)", color: "var(--color-text-muted)" };
};

const roleLabel = (role: string) => {
  if (role === "owner") return "مالك";
  if (role === "accountant") return "محاسب";
  return "موظف";
};

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const Users = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "accountant" });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/api/users`, { headers });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) return;
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API}/api/users`, form, { headers });
      setForm({ name: "", email: "", password: "", role: "accountant" });
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API}/api/users/${id}`, { headers });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>المستخدمون</h3>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{users.length} مستخدم في المكتب</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-accent)" }}>
          + إضافة مستخدم
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { role: "owner", label: "مالك", desc: "كل الصلاحيات — إضافة وتعديل وحذف وإدارة المستخدمين", icon: "👑" },
          { role: "accountant", label: "محاسب", desc: "إضافة وتعديل المعاملات والفواتير والعملاء", icon: "📊" },
          { role: "employee", label: "موظف", desc: "عرض البيانات فقط بدون تعديل", icon: "👁️" },
        ].map((r) => (
          <div key={r.role} className="rounded-xl p-4 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
            <p className="text-xl mb-2">{r.icon}</p>
            <p className="font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>{r.label}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{r.desc}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>مستخدم جديد</h4>
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--color-danger-light)", color: "var(--color-danger)" }}>
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الاسم *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم المستخدم"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>البريد الإلكتروني *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>كلمة المرور *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الدور</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm">
                <option value="accountant">محاسب</option>
                <option value="employee">موظف</option>
                <option value="owner">مالك</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} disabled={loading}
              className="text-white text-sm px-6 py-2 rounded-lg transition disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
              {loading ? "جاري الحفظ..." : "إضافة"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-lg transition text-sm" style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
        {users.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
            <p className="text-3xl mb-2">👥</p>
            <p>لا يوجد مستخدمون بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                <th className="text-right pb-3">الاسم</th>
                <th className="text-right pb-3">البريد الإلكتروني</th>
                <th className="text-right pb-3">الدور</th>
                <th className="text-right pb-3">تاريخ الإضافة</th>
                <th className="text-right pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border-light)" }}>
                  <td className="py-3 font-medium">{user.name}</td>
                  <td className="py-3" style={{ color: "var(--color-text-secondary)" }}>{user.email}</td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: roleColor(user.role).bg, color: roleColor(user.role).color }}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="py-3" style={{ color: "var(--color-text-secondary)" }}>
                    {new Date(user.created_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="py-3">
                    <button onClick={() => handleDelete(user.id)}
                      className="transition text-xs" style={{ color: "var(--color-text-muted)" }}>
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

export default Users;
