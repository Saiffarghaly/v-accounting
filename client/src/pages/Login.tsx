import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const Login = ({ onSwitch }: { onSwitch: () => void }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("https://v-accounting-production.up.railway.app/api/auth/login", {
        email,
        password,
      });
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm" style={{ background: "#217346" }}>V</div>
            <h1 className="text-2xl font-bold" style={{ color: "#217346" }}>V-ACCOUNTING</h1>
          </div>
          <p className="text-sm" style={{ color: "#888" }}>تسجيل الدخول لمكتبك</p>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-4 py-3 mb-4" style={{ background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" }}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm mb-1 block" style={{ color: "#555" }}>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition"
              style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}
            />
          </div>

          <div>
            <label className="text-sm mb-1 block" style={{ color: "#555" }}>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition"
              style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full text-white font-medium py-3 rounded-lg transition"
            style={{ background: loading ? "#81c784" : "#217346" }}
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
          مكتب جديد؟{" "}
          <button onClick={onSwitch} className="font-medium hover:underline" style={{ color: "#217346" }}>
            سجل مكتبك الآن
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;