import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { BrandWordmark } from "../components/BrandWordmark";

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f5f5f5" }}>
      <div className="rounded-2xl p-8 w-full max-w-md border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>

        <div className="text-center mb-8">
          <div className="mb-2 flex justify-center">
            <BrandWordmark variant="onLight" size="md" />
          </div>
          <p className="text-sm" style={{ color: "#888" }}>سجل مكتبك الآن</p>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-3 mb-4" style={{ background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" }}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#555" }}>اسم المكتب</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مكتب سيف للمحاسبة"
              className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition"
              style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}
            />
          </div>

          <div>
            <label className="text-sm mb-1 block" style={{ color: "#555" }}>البريد الإلكتروني</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="example@email.com"
              className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition"
              style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}
            />
          </div>

          <div>
            <label className="text-sm mb-1 block" style={{ color: "#555" }}>رقم الموبايل</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="01000000000"
              className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition"
              style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}
            />
          </div>

          <div>
            <label className="text-sm mb-1 block" style={{ color: "#555" }}>كلمة المرور</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition"
              style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full text-white font-medium py-3 rounded-lg transition"
            style={{ background: loading ? "#81c784" : "#217346" }}
          >
            {loading ? "جاري التسجيل..." : "إنشاء المكتب"}
          </button>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
          عندك حساب؟{" "}
          <button onClick={onSwitch} className="font-medium hover:underline" style={{ color: "#217346" }}>
            سجل دخولك
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;