import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface StatsData {
  income: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  incomeTrend: number;
  clients: number;
  pendingInvoices: number;
  totalInvoices: number;
  invoicesAmount: number;
  overdueDebts: number;
  healthScore: number;
  topCategories: { category: string; total: number }[];
  recentTransactions: any[];
  cashFlow: { income: number; expenses: number; net: number };
}

const patterns = [
  { match: /(تقرير|ملخص)\s*(الشهر|هذا|الحالي|شهر)/i, label: "تقرير الشهر" },
  { match: /(أعلى|اكبر|اكثر)\s*(مصروف|مصاريف|نفقات|فئة)/i, label: "أعلى مصاريف" },
  { match: /(الربح|صافي|الأرباح|الخسائر)/i, label: "الربح" },
  { match: /(الديون|مديونية|متأخرات)/i, label: "الديون" },
  { match: /(العملاء|عميل)/i, label: "العملاء" },
  { match: /(المخزون|مخزن|منخفض|تخزين)/i, label: "المخزون" },
  { match: /(صحة|health|نسبة|مؤشر)/i, label: "الصحة" },
  { match: /(إيراد|دخل|وارد)/i, label: "الإيرادات" },
];

const generateReply = (q: string, data: StatsData): string => {
  const lower = q.toLowerCase();

  if (/تقرير|ملخص/.test(lower) && /(الشهر|شهر|الحالي)/.test(lower)) {
    const m = data.monthlyData;
    const current = m?.[m.length - 1];
    if (current) {
      return `📊 **تقرير ${current.month}**\n• الإيرادات: ${Number(current.income).toLocaleString()} ج\n• المصروفات: ${Number(current.expenses).toLocaleString()} ج\n• صافي الربح: ${(Number(current.income) - Number(current.expenses)).toLocaleString()} ج\n• إجمالي الإيرادات: ${data.income.toLocaleString()} ج\n• إجمالي المصروفات: ${data.expenses.toLocaleString()} ج`;
    }
    return `📊 **الملخص العام**\n• الإيرادات: ${data.income.toLocaleString()} ج\n• المصروفات: ${data.expenses.toLocaleString()} ج\n• صافي الربح: ${data.profit.toLocaleString()} ج\n• هامش الربح: ${data.profitMargin}%\n• عدد العملاء: ${data.clients}`;
  }

  if (/أعلى|اكبر/.test(lower) && /(مصروف|مصاريف|نفقات|فئة)/.test(lower)) {
    if (data.topCategories?.length > 0) {
      let reply = "🔥 **أعلى فئات المصروفات:**\n";
      data.topCategories.forEach((c: any, i: number) => {
        reply += `${i + 1}. ${c.category}: ${Number(c.total).toLocaleString()} ج\n`;
      });
      return reply;
    }
    return "لا توجد مصروفات مسجلة بعد.";
  }

  if (/(الربح|صافي)/.test(lower)) {
    return `💰 **صافي الربح:** ${data.profit.toLocaleString()} ج\n📈 **هامش الربح:** ${data.profitMargin}%\n${data.profit >= 0 ? "✅ الشركة تحقق أرباحاً" : "⚠️ الشركة تسجل خسائر"}`;
  }

  if (/(الديون|مديونية|متأخرات)/.test(lower)) {
    return `💳 **الديون المتأخرة:** ${data.overdueDebts} دين\n📄 **الفواتير المعلقة:** ${data.pendingInvoices}\n💰 **قيمة الفواتير المعلقة:** ${data.invoicesAmount.toLocaleString()} ج`;
  }

  if (/(العملاء|عميل)/.test(lower)) {
    return `👥 **العملاء:** ${data.clients} عميل\n📄 **إجمالي الفواتير:** ${data.totalInvoices}\n💰 **قيمة الفواتير:** ${data.invoicesAmount.toLocaleString()} ج`;
  }

  if (/(مخزون|مخزن)/.test(lower)) {
    return "📦 راجع صفحة المخزن لمعرفة الأصناف المنخفضة. استخدم التنبيهات في الجرس 🔔";
  }

  if (/(صحة|health)/.test(lower)) {
    const score = data.healthScore;
    const status = score >= 80 ? "ممتازة 🏆" : score >= 60 ? "جيدة ✅" : score >= 40 ? "متوسطة ⚠️" : "تحتاج تحسين ❌";
    return `🏢 **مؤشر صحة الشركة: ${score}/100** — ${status}\n\n• هامش الربح: ${data.profitMargin}%\n• اتجاه الإيرادات: ${data.incomeTrend >= 0 ? "صاعد 📈" : "هابط 📉"}\n• الديون المتأخرة: ${data.overdueDebts}`;
  }

  if (/(إيراد|دخل)/.test(lower)) {
    return `💰 **الإيرادات:** ${data.income.toLocaleString()} ج\n📈 **اتجاه الإيرادات:** ${data.incomeTrend >= 0 ? "+" : ""}${data.incomeTrend}%\n• إجمالي المصروفات: ${data.expenses.toLocaleString()} ج\n• صافي الربح: ${data.profit.toLocaleString()} ج`;
  }

  return `مرحباً! أنا مساعد V-Accounting الذكي 🤖\n\nيمكنك سؤالي عن:\n• 📊 تقرير الشهر — "اعمل تقرير الشهر ده"\n• 🔥 أعلى المصروفات — "فين أعلى مصاريف عندي؟"\n• 💰 الربح — "كم صافي الربح؟"\n• 💳 الديون — "الديون المتأخرة"\n• 👥 العملاء — "عدد العملاء"\n• 🏢 صحة الشركة — "مؤشر الصحة"\n• 📦 المخزون`;
};

const AIAssistant = () => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "مرحباً! 👋 أنا مساعدك الذكي. اسألني أي سؤال عن أعمالك!" },
  ]);
  const [input, setInput] = useState("");
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !statsData) {
      axios.get(`${API}/api/stats`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setStatsData(r.data))
        .catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || !statsData) return;
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const reply = generateReply(q, statsData);
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      setLoading(false);
    }, 400);
  };

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-50 transition hover:scale-110"
        style={{ background: "#217346", color: "#fff" }}>
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-96 h-[30rem] rounded-2xl shadow-2xl border z-50 flex flex-col"
          style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          {/* Header */}
          <div className="px-5 py-4 rounded-t-2xl flex items-center gap-3 text-white"
            style={{ background: "#217346" }}>
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-semibold text-sm">المساعد الذكي</p>
              <p className="text-xs" style={{ color: "#a8d5b5" }}>AI Accountant Assistant</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white"
                    : "border"
                }`} style={{
                  background: msg.role === "user" ? "#217346" : "var(--color-bg-input)",
                  color: msg.role === "user" ? "#fff" : "var(--color-text-primary)",
                  borderColor: msg.role === "user" ? "transparent" : "var(--color-border)",
                  whiteSpace: "pre-line",
                }}>
                  {msg.role === "assistant" ? msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>) : msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="rounded-2xl px-4 py-3 text-sm border" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)" }}>
                  <span className="animate-pulse">جاري التفكير...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--color-border)" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اسألني أي شيء..."
              className="flex-1 border rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }} />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="text-white rounded-xl px-4 py-3 transition text-sm font-medium disabled:opacity-50"
              style={{ background: "#217346" }}>
              إرسال
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
