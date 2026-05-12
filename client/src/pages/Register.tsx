import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const Register = ({ onSwitch }: { onSwitch: () => void }) => {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("https://v-accounting-production.up.railway.app/api/auth/register", form);
      login(res.data.token, res.data.office);
    } catch (err: any) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
      <div className="bg-[#1a2840] border border-gray-800 rounded-2xl p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400">💼 V-ACCOUNTING</h1>
          <p className="text-gray-500 mt-2">سجل مكتبك الآن</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">اسم المكتب</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مكتب سيف للمحاسبة"
              className="w-full bg-[#0f1f3d] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">البريد الإلكتروني</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="example@email.com"
              className="w-full bg-[#0f1f3d] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">رقم الموبايل</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="01000000000"
              className="w-full bg-[#0f1f3d] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">كلمة المرور</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-[#0f1f3d] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition"
          >
            {loading ? "جاري التسجيل..." : "إنشاء المكتب"}
          </button>
        </div>

        {/* Switch */}
        <p className="text-center text-gray-500 text-sm mt-6">
          عندك حساب؟{" "}
          <button onClick={onSwitch} className="text-amber-400 hover:underline">
            سجل دخولك
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
