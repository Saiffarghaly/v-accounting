import { useState, useRef, useEffect, useCallback } from "react";
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

const AIAssistant = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "مرحباً! 👋 أنا مساعد V-Accounting الذكي.\n\nأقدر أقرألك التقارير **وأيضاً** أنفذ أوامرك!\n\n💡 جرب:\n• 📋 \"اعمل فاتورة لأحمد 500\"\n• 💸 \"إضافة مصروف 300 نظافة\"\n• 💰 \"إضافة إيراد 1000 مشروع\"\n• 👤 \"عميل جديد محمد 01000000000\"\n• 📊 \"تقرير الشهر ده\"\n• 🔥 \"أعلى مصاريف\"" },
  ]);
  const [input, setInput] = useState("");
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !statsData) {
      axios.get(`${API}/api/stats`, { headers })
        .then(r => setStatsData(r.data))
        .catch(console.error);
      axios.get(`${API}/api/clients`, { headers })
        .then(r => setClients(r.data))
        .catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const findClientId = (name: string): number | null => {
    const lower = name.trim().toLowerCase();
    const match = clients.find(c => c.name.toLowerCase().includes(lower));
    return match ? match.id : null;
  };

  const executeAction = useCallback(async (q: string): Promise<string | null> => {
    /* ---------- Arabic Commands ---------- */

    /* فاتورة جديدة: "اعمل فاتورة لأحمد 500" or "فاتورة محمد 1000" */
    const invoiceMatch = q.match(/(فاتورة|invoice|اعمل فاتورة)\s*(لـ|ل|)\s*([\u0600-\u06FF\s]+?)\s*(\d+[\.\d]*)/i);
    if (invoiceMatch) {
      const clientName = invoiceMatch[3].trim();
      const amount = parseFloat(invoiceMatch[4]);
      const clientId = findClientId(clientName);
      if (!clientId) return `❌ ما لقيتش عميل اسمه "${clientName}".\nأضيفه أولاً: "عميل جديد ${clientName}"`;
      try {
        await axios.post(`${API}/api/invoices`, { client_id: clientId, amount, status: "pending" }, { headers });
        return `✅ تم إنشاء فاتورة جديدة!\n👤 العميل: ${clientName}\n💰 المبلغ: ${amount.toLocaleString()} ج\n📄 الحالة: معلقة`;
      } catch (e: any) {
        return `❌ فشل إنشاء الفاتورة: ${e.response?.data?.error || e.message}`;
      }
    }

    /* مصروف جديد: "إضافة مصروف 300 نظافة" or "مصروف 200 كهرباء" */
    const expenseMatch = q.match(/(إضافة|اضافة|تسجيل|)\s*(مصروف|expense)\s*(\d+[\.\d]*)\s*([\u0600-~\s]+)?/i);
    if (expenseMatch) {
      const amount = parseFloat(expenseMatch[3]);
      const category = expenseMatch[4]?.trim() || "أخرى";
      try {
        await axios.post(`${API}/api/transactions`, { amount, type: "مصروف", category, description: category }, { headers });
        return `✅ تم تسجيل المصروف!\n💰 المبلغ: ${amount.toLocaleString()} ج\n📂 التصنيف: ${category}`;
      } catch (e: any) {
        return `❌ فشل تسجيل المصروف: ${e.response?.data?.error || e.message}`;
      }
    }

    /* إيراد جديد: "إضافة إيراد 1000 مشروع" or "إيراد 500" */
    const incomeMatch = q.match(/(إضافة|اضافة|تسجيل|)\s*(إيراد|ايراد|income)\s*(\d+[\.\d]*)\s*([\u0600-~\s]+)?/i);
    if (incomeMatch) {
      const amount = parseFloat(incomeMatch[3]);
      const category = incomeMatch[4]?.trim() || "أخرى";
      try {
        await axios.post(`${API}/api/transactions`, { amount, type: "إيراد", category, description: category }, { headers });
        return `✅ تم تسجيل الإيراد!\n💰 المبلغ: ${amount.toLocaleString()} ج\n📂 التصنيف: ${category}`;
      } catch (e: any) {
        return `❌ فشل تسجيل الإيراد: ${e.response?.data?.error || e.message}`;
      }
    }

    /* عميل جديد: "عميل جديد محمد 01000000000" */
    const clientMatch = q.match(/(عميل جديد|إضافة عميل|اضافة عميل|client)\s*([\u0600-\u06FF\s]+?)(?:\s*(\d+))?\s*$/i);
    if (clientMatch) {
      const name = clientMatch[2].trim();
      const phone = clientMatch[3] || "";
      try {
        await axios.post(`${API}/api/clients`, { name, phone }, { headers });
        const addon = phone ? `\n📞 الهاتف: ${phone}` : "";
        return `✅ تم إضافة العميل!\n👤 الاسم: ${name}${addon}\n🆔 أضف فاتورة له: "فاتورة ${name} [المبلغ]"`;
      } catch (e: any) {
        return `❌ فشل إضافة العميل: ${e.response?.data?.error || e.message}`;
      }
    }

    /* صنف مخزون جديد: "إضافة صنف كرسي 10 200" */
    const itemMatch = q.match(/(إضافة صنف|اضافة صنف|صنف جديد|item)\s*([\u0600-\u06FF\s]+?)\s*(\d+)\s*(\d+[\.\d]*)/i);
    if (itemMatch) {
      const name = itemMatch[2].trim();
      const quantity = parseInt(itemMatch[3]);
      const price = parseFloat(itemMatch[4]);
      try {
        await axios.post(`${API}/api/inventory`, { name, quantity, buy_price: price, unit: "قطعة" }, { headers });
        return `✅ تم إضافة الصنف للمخزن!\n📦 ${name}\n🔢 الكمية: ${quantity}\n💰 سعر الشراء: ${price.toLocaleString()} ج`;
      } catch (e: any) {
        return `❌ فشل إضافة الصنف: ${e.response?.data?.error || e.message}`;
      }
    }

    /* ---------- English Commands ---------- */
    const lower = q.toLowerCase();

    /* "Create invoice for [name] [amount]" */
    const enInvMatch = lower.match(/create\s+invoice\s+for\s+([a-zA-Z\s]+?)\s*(\d+[\.\d]*)/i);
    if (enInvMatch) {
      const clientName = enInvMatch[1].trim();
      const amount = parseFloat(enInvMatch[2]);
      const clientId = findClientId(clientName);
      if (!clientId) return `❌ Client "${clientName}" not found. Add first: "add client ${clientName}"`;
      try {
        await axios.post(`${API}/api/invoices`, { client_id: clientId, amount, status: "pending" }, { headers });
        return `✅ Invoice created!\n👤 Client: ${clientName}\n💰 Amount: ${amount.toLocaleString()} EGP`;
      } catch (e: any) {
        return `❌ Failed: ${e.response?.data?.error || e.message}`;
      }
    }

    /* "Add expense [amount] [category]" */
    const enExpMatch = lower.match(/add\s+expense\s*(\d+[\.\d]*)\s*([a-zA-Z\s]+)?/i);
    if (enExpMatch) {
      const amount = parseFloat(enExpMatch[1]);
      const category = enExpMatch[2]?.trim() || "Other";
      try {
        await axios.post(`${API}/api/transactions`, { amount, type: "مصروف", category, description: category }, { headers });
        return `✅ Expense recorded!\n💰 Amount: ${amount.toLocaleString()} EGP\n📂 Category: ${category}`;
      } catch { }
    }

    /* "Add income [amount] [category]" */
    const enIncMatch = lower.match(/add\s+income\s*(\d+[\.\d]*)\s*([a-zA-Z\s]+)?/i);
    if (enIncMatch) {
      const amount = parseFloat(enIncMatch[1]);
      const category = enIncMatch[2]?.trim() || "Other";
      try {
        await axios.post(`${API}/api/transactions`, { amount, type: "إيراد", category, description: category }, { headers });
        return `✅ Income recorded!\n💰 Amount: ${amount.toLocaleString()} EGP\n📂 Category: ${category}`;
      } catch { }
    }

    /* "Add client [name] [phone]" */
    const enCliMatch = lower.match(/add\s+client\s+([a-zA-Z\s]+?)(?:\s*(\d+))?\s*$/i);
    if (enCliMatch) {
      const name = enCliMatch[1].trim();
      const phone = enCliMatch[2] || "";
      try {
        await axios.post(`${API}/api/clients`, { name, phone }, { headers });
        const addon = phone ? `\n📞 Phone: ${phone}` : "";
        return `✅ Client added!\n👤 ${name}${addon}`;
      } catch { }
    }

    return null; /* not an action command */
  }, [clients, headers]);

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

    if (/(صحة|health)/.test(lower)) {
      const score = data.healthScore;
      const status = score >= 80 ? "ممتازة 🏆" : score >= 60 ? "جيدة ✅" : score >= 40 ? "متوسطة ⚠️" : "تحتاج تحسين ❌";
      return `🏢 **مؤشر صحة الشركة: ${score}/100** — ${status}\n\n• هامش الربح: ${data.profitMargin}%\n• اتجاه الإيرادات: ${data.incomeTrend >= 0 ? "صاعد 📈" : "هابط 📉"}\n• الديون المتأخرة: ${data.overdueDebts}`;
    }

    if (/(إيراد|دخل)/.test(lower)) {
      return `💰 **الإيرادات:** ${data.income.toLocaleString()} ج\n📈 **اتجاه الإيرادات:** ${data.incomeTrend >= 0 ? "+" : ""}${data.incomeTrend}%\n• إجمالي المصروفات: ${data.expenses.toLocaleString()} ج\n• صافي الربح: ${data.profit.toLocaleString()} ج`;
    }

    return "";
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q) return;
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      /* Try action command first */
      const actionResult = await executeAction(q);
      if (actionResult) {
        setMessages(prev => [...prev, { role: "assistant", text: actionResult }]);
        /* Refresh stats after action */
        axios.get(`${API}/api/stats`, { headers }).then(r => setStatsData(r.data)).catch(() => {});
        axios.get(`${API}/api/clients`, { headers }).then(r => setClients(r.data)).catch(() => {});
      } else if (statsData) {
        /* Fall back to Q&A */
        const reply = generateReply(q, statsData);
        if (reply) {
          setMessages(prev => [...prev, { role: "assistant", text: reply }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: "لم أفهم الطلب 😅\n\nجرب:\n• 📋 فاتورة: \"اعمل فاتورة لأحمد 500\"\n• 💸 مصروف: \"إضافة مصروف 300 نظافة\"\n• 💰 إيراد: \"إضافة إيراد 1000\"\n• 👤 عميل: \"عميل جديد محمد 01000000000\"\n• 📊 تقرير: \"تقرير الشهر ده\"" }]);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "❌ حدث خطأ. حاول مرة أخرى." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-50 transition hover:scale-110"
        style={{ background: "#217346", color: "#fff" }}>
        {open ? "✕" : "🤖"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-96 h-[30rem] rounded-2xl shadow-2xl border z-50 flex flex-col"
          style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <div className="px-5 py-4 rounded-t-2xl flex items-center gap-3 text-white"
            style={{ background: "#217346" }}>
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-semibold text-sm">المساعد الذكي</p>
              <p className="text-xs" style={{ color: "#a8d5b5" }}>AI Accountant Assistant</p>
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user" ? "text-white" : "border"
                }`} style={{
                  background: msg.role === "user" ? "#217346" : "var(--color-bg-input)",
                  color: msg.role === "user" ? "#fff" : "var(--color-text-primary)",
                  borderColor: msg.role === "user" ? "transparent" : "var(--color-border)",
                  whiteSpace: "pre-line",
                }}>
                  {msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="rounded-2xl px-4 py-3 text-sm border" style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)" }}>
                  <span className="animate-pulse">جاري التنفيذ...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--color-border)" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اسأل أو أعط أمر..."
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
