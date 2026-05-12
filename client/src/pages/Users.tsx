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
  if (role === "owner") return "bg-blue-400/10 text-blue-400";
  if (role === "accountant") return "bg-green-400/10 text-green-400";
  return "bg-gray-400/10 text-gray-400";
};

const roleLabel = (role: string) => {
  if (role === "owner") return "مالك";
  if (role === "accountant") return "محاسب";
  return "موظف";
};

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
      const res = await axios.get("https://v-accounting-production.up.railway.app/api/users", { headers });
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
      await axios.post("https://v-accounting-production.up.railway.app/api/users", form, { headers });
      setForm({ name: "", email: "", password: "", role: "accountant" });
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`https://v-accounting-production.up.railway.app/api/users/${id}`, { headers });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">المستخدمون</h3>
          <p className="text-sm text-gray-500">{users.length} مستخدم في المكتب</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          + إضافة مستخدم
        </button>
      </div>

      {/* Roles Info */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { role: "owner", label: "مالك", desc: "كل الصلاحيات — إضافة وتعديل وحذف وإدارة المستخدمين", icon: "👑" },
          { role: "accountant", label: "محاسب", desc: "إضافة وتعديل المعاملات والفواتير والعملاء", icon: "📊" },
          { role: "employee", label: "موظف", desc: "عرض البيانات فقط بدون تعديل", icon: "👁️" },
        ].map((r) => (
          <div key={r.role} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xl mb-2">{r.icon}</p>
            <p className="font-medium mb-1">{r.label}</p>
            <p className="text-xs text-gray-500">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h4 className="font-medium text-gray-300">مستخدم جديد</h4>
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">الاسم *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم المستخدم"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">البريد الإلكتروني *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">كلمة المرور *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">الدور</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="accountant">محاسب</option>
                <option value="employee">موظف</option>
                <option value="owner">مالك</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg transition"
            >
              {loading ? "جاري الحفظ..." : "إضافة"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-6 py-2 rounded-lg transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        {users.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p className="text-3xl mb-2">👥</p>
            <p>لا يوجد مستخدمون بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-right pb-3">الاسم</th>
                <th className="text-right pb-3">البريد الإلكتروني</th>
                <th className="text-right pb-3">الدور</th>
                <th className="text-right pb-3">تاريخ الإضافة</th>
                <th className="text-right pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="text-gray-300">
                  <td className="py-3 font-medium">{user.name}</td>
                  <td className="py-3 text-gray-500">{user.email}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${roleColor(user.role)}`}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-gray-600 hover:text-red-400 transition text-xs"
                    >
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