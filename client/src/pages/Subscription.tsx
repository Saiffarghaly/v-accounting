import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface FawryData {
  merchantCode: string;
  merchantRef: string;
  fawryRefCode: string;
  paymentUrl: string | null;
  amount: number;
  description: string;
  customer: { name: string; email: string; mobile: string };
  signature: string;
  chargeItems: { itemId: string; description: string; price: number; quantity: number }[];
}

interface Plan {
  id: number;
  name: string;
  code: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_transactions: number;
  max_invoices: number;
  max_clients: number;
  max_inventory_items: number;
  features: string[];
  sort_order: number;
}

interface Subscription {
  id: number;
  plan_id: number;
  plan_name: string;
  plan_code: string;
  status: string;
  billing_cycle: string;
  started_at: string;
  expires_at: string | null;
  features: string[];
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_transactions: number;
  max_invoices: number;
  max_clients: number;
  max_inventory_items: number;
}

interface Payment {
  id: number;
  plan_name: string;
  amount: number;
  currency: string;
  status: string;
  fawry_ref_code: string;
  description: string;
  paid_at: string | null;
  created_at: string;
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";
const cycleLabels: Record<string, string> = { monthly: "شهري", yearly: "سنوي" };
const statusLabels: Record<string, string> = { active: "نشط", pending: "قيد الانتظار", expired: "منتهي", cancelled: "ملغي" };
const statusColors: Record<string, string> = { active: "var(--color-success)", pending: "var(--color-warning)", expired: "var(--color-danger)", cancelled: "var(--color-text-muted)" };

interface UsageSummary {
  subscription: Subscription;
  resources: Record<string, { usage: number; limit: number; unlimited: boolean; remaining: number }>;
}

const Subscription = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingFawry, setPendingFawry] = useState<FawryData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [subRes, plansRes, payRes, usageRes] = await Promise.all([
          axios.get(`${API}/api/subscriptions`, { headers }),
          axios.get(`${API}/api/subscriptions/plans`, { headers }),
          axios.get(`${API}/api/subscriptions/payments`, { headers }),
          axios.get(`${API}/api/subscriptions/usage`, { headers }).catch(() => null),
        ]);
        setSubscription(subRes.data);
        setPlans(plansRes.data);
        setPayments(payRes.data);
        setUsage(usageRes?.data || null);
        setBillingCycle(subRes.data.billing_cycle || "monthly");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleUpgrade = async (planId: number) => {
    setUpgrading(true);
    setMessage("");
    setPendingFawry(null);
    try {
      const res = await axios.post(`${API}/api/subscriptions`, { plan_id: planId, billing_cycle: billingCycle }, { headers });
      const { subscription: sub, payment, fawry } = res.data;

      if (fawry) {
        setPendingFawry(fawry);
        const subRes = await axios.get(`${API}/api/subscriptions`, { headers });
        setSubscription(subRes.data);
      } else {
        setSubscription(sub as any);
        setMessage("✅ تم تفعيل الباقة بنجاح!");
      }

      const payRes = await axios.get(`${API}/api/subscriptions/payments`, { headers });
      setPayments(payRes.data);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "حدث خطأ");
    } finally {
      setUpgrading(false);
    }
  };

  const handleConfirmPayment = async (subId: number) => {
    try {
      await axios.post(`${API}/api/subscriptions/confirm`, { subscription_id: subId }, { headers });
      setMessage("✅ تم تأكيد الدفع وتفعيل الاشتراك");
      setPendingFawry(null);
      const subRes = await axios.get(`${API}/api/subscriptions`, { headers });
      setSubscription(subRes.data);
      const payRes = await axios.get(`${API}/api/subscriptions/payments`, { headers });
      setPayments(payRes.data);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "حدث خطأ");
    }
  };

  const Labels = ({ features }: { features: string[] }) => (
    <ul className="space-y-2 text-sm">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-2">
          <span style={{ color: "var(--color-success)" }}>✓</span>
          <span style={{ color: "var(--color-text-secondary)" }}>{f}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="p-8 space-y-6">
      <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>💳 الاشتراك والفواتير</h3>

      {message && (
        <div className="rounded-xl p-4 text-sm" style={{ background: message.includes("❌") || message.includes("خطأ") ? "var(--color-danger-light)" : "var(--color-info-light)", color: message.includes("❌") || message.includes("خطأ") ? "var(--color-danger)" : "var(--color-info)", border: "1px solid var(--color-info-light)" }}>
          {message}
          <button onClick={() => setMessage("")} className="mr-2 text-xs" style={{ color: "var(--color-text-muted)" }}>✕</button>
        </div>
      )}

      {/* Current Plan */}
      {loading ? (
        <div className="rounded-xl p-6 border animate-pulse" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", height: 120 }} />
      ) : subscription && (
        <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>الباقة الحالية</p>
              <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{subscription.plan_name}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: `${statusColors[subscription.status]}20`, color: statusColors[subscription.status] }}>
                  {statusLabels[subscription.status] || subscription.status}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{cycleLabels[subscription.billing_cycle] || subscription.billing_cycle}</span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>سعة الباقة</p>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {subscription.max_users === -1 ? "غير محدود" : `${subscription.max_users}`} مستخدمين
                {" · "}{subscription.max_transactions === -1 ? "غير محدود" : `${subscription.max_transactions}`} معاملة/شهر
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Labels features={subscription.features || []} />
          </div>
        </div>
      )}

      {/* Usage Summary */}
      {usage && (
        <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <h4 className="font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>📊 استخدام الباقة</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(usage.resources).map(([key, val]) => {
              const pct = val.unlimited ? 0 : Math.min((val.usage / val.limit) * 100, 100);
              const labels: Record<string, string> = { users: "المستخدمين", transactions: "المعاملات", invoices: "الفواتير", clients: "العملاء", inventory: "الأصناف" };
              const nearLimit = !val.unlimited && pct >= 80;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "var(--color-text-secondary)" }}>{labels[key] || key}</span>
                    <span className="font-medium" style={{ color: nearLimit ? "var(--color-danger)" : "var(--color-text-primary)" }}>
                      {val.unlimited ? "غير محدود" : `${val.usage} / ${val.limit}`}
                    </span>
                  </div>
                  {!val.unlimited && (
                    <div className="w-full h-2 rounded-full" style={{ background: "var(--color-border)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: nearLimit ? "var(--color-danger)" : "var(--color-success)" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fawry Payment Dialog */}
      {pendingFawry && (
        <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg" style={{ color: "var(--color-text-primary)" }}>💳 الدفع عبر فوري</h4>
            <button onClick={() => setPendingFawry(null)} className="text-sm" style={{ color: "var(--color-text-muted)" }}>✕</button>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-lg" style={{ background: "var(--color-info-light)" }}>
              <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                المبلغ: <span className="text-xl" style={{ color: "var(--color-accent)" }}>{pendingFawry.amount.toLocaleString()} ج.م</span>
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>{pendingFawry.description}</p>
            </div>

            <div className="p-4 rounded-lg text-center" style={{ background: "var(--color-bg-input)" }}>
              <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>كود المرجع للدفع في منافذ فوري:</p>
              <p className="text-2xl font-bold font-mono tracking-wider ltr" style={{ color: "var(--color-accent)", direction: "ltr", textAlign: "center" }}>
                {pendingFawry.fawryRefCode}
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(pendingFawry.fawryRefCode); setMessage("✅ تم نسخ الكود"); }}
                className="mt-2 text-sm px-4 py-1 rounded-lg transition"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >📋 نسخ الكود</button>
            </div>

            {pendingFawry.paymentUrl && (
              <a href={pendingFawry.paymentUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full text-center py-3 rounded-lg font-semibold transition"
                style={{ background: "var(--color-accent)", color: "#fff" }}>
                🔗 الدفع أونلاين
              </a>
            )}

            <div className="text-sm space-y-1" style={{ color: "var(--color-text-muted)" }}>
              <p>📌 <strong>طريقة الدفع:</strong></p>
              <ol className="list-decimal mr-5 space-y-1">
                <li>اذهب إلى أي فرع من فروع فوري أو ماكينة فوري القريبة منك</li>
                <li>اختر "دفع الفواتير" ← "فوري"</li>
                <li>أدخل كود المرجع أعلاه: <strong dir="ltr">{pendingFawry.fawryRefCode}</strong></li>
                <li>ادفع المبلغ المطلوب ({pendingFawry.amount.toLocaleString()} ج.م)</li>
                <li>سيتم تفعيل اشتراكك تلقائياً بعد تأكيد الدفع</li>
              </ol>
              <p className="mt-2">⏳ يستغرق التأكيد بضع دقائق. يمكنك متابعة حالة الاشتراك من هذه الصفحة.</p>
            </div>
          </div>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>دورة الفوترة:</span>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
          <button onClick={() => setBillingCycle("monthly")}
            className="px-4 py-2 text-sm transition font-medium"
            style={{ background: billingCycle === "monthly" ? "var(--color-accent)" : "var(--color-bg-input)", color: billingCycle === "monthly" ? "#fff" : "var(--color-text-secondary)" }}>
            شهري
          </button>
          <button onClick={() => setBillingCycle("yearly")}
            className="px-4 py-2 text-sm transition font-medium"
            style={{ background: billingCycle === "yearly" ? "var(--color-accent)" : "var(--color-bg-input)", color: billingCycle === "yearly" ? "#fff" : "var(--color-text-secondary)" }}>
            سنوي <span className="text-xs opacity-75">(وفر 15%)</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
          const isCurrent = subscription?.plan_id === plan.id && subscription?.status === "active";
          const isFree = plan.code === "free";
          return (
            <div key={plan.id}
              className="rounded-xl p-6 border flex flex-col transition-all"
              style={{
                background: isCurrent ? "var(--color-success-light)" : "var(--color-bg-card)",
                borderColor: isCurrent ? "var(--color-success)" : "var(--color-border)",
                boxShadow: isCurrent ? "0 0 0 2px var(--color-success)" : "var(--shadow-card)",
              }}>
              <div className="text-center mb-4">
                <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{plan.name}</p>
                <p className="text-3xl font-bold mt-2" style={{ color: "var(--color-accent)" }}>
                  {isFree ? "مجاني" : `${price.toLocaleString()} ج`}
                </p>
                {!isFree && <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{billingCycle === "yearly" ? "سنوياً" : "شهرياً"}</p>}
              </div>
              <Labels features={plan.features} />
              <div className="mt-auto pt-4">
                {isCurrent ? (
                  <button disabled className="w-full text-sm px-4 py-2 rounded-lg font-medium opacity-60"
                    style={{ background: "var(--color-success)", color: "#fff" }}>
                    الباقة الحالية ✓
                  </button>
                ) : (
                  <button onClick={() => handleUpgrade(plan.id)} disabled={upgrading}
                    className="w-full text-sm px-4 py-2 rounded-lg transition font-medium disabled:opacity-50"
                    style={{ background: "var(--color-accent)", color: "#fff" }}>
                    {upgrading ? "جاري..." : plan.code === "free" ? "الاشتراك المجاني" : "ترقية"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment History */}
      <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-card)" }}>
        <h4 className="font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>سجل المدفوعات</h4>
        {payments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>لا توجد مدفوعات مسجلة</p>
        ) : (
          <div className="overflow-x-auto">
            <table dir="rtl" className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <th className="text-right pb-3 px-1" style={{ color: "var(--color-text-muted)" }}>الباقة</th>
                  <th className="text-right pb-3 px-1" style={{ color: "var(--color-text-muted)" }}>المبلغ</th>
                  <th className="text-right pb-3 px-1" style={{ color: "var(--color-text-muted)" }}>الحالة</th>
                  <th className="text-right pb-3 px-1" style={{ color: "var(--color-text-muted)" }}>مرجع فوري</th>
                  <th className="text-right pb-3 px-1" style={{ color: "var(--color-text-muted)" }}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                    <td className="py-3 px-1" style={{ color: "var(--color-text-primary)" }}>{p.plan_name}</td>
                    <td className="py-3 px-1 font-medium" style={{ color: "var(--color-text-primary)" }}>{Number(p.amount).toLocaleString()} ج</td>
                    <td className="py-3 px-1">
                      <span className="text-xs px-2 py-1 rounded-full" style={{
                        background: p.status === "paid" ? "var(--color-success-light)" : "var(--color-warning-light)",
                        color: p.status === "paid" ? "var(--color-success)" : "var(--color-warning)",
                      }}>
                        {p.status === "paid" ? "مدفوع" : p.status === "pending" ? "معلق" : p.status}
                      </span>
                    </td>
                    <td className="py-3 px-1" style={{ color: "var(--color-text-muted)" }} dir="ltr">{p.fawry_ref_code || "—"}</td>
                    <td className="py-3 px-1 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(p.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Manual confirm buttons for pending payments */}
        {payments.filter(p => p.status === "pending" && subscription).map(p => (
          <div key={`confirm-${p.id}`} className="mt-3 flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-warning-light)" }}>
            <span className="text-sm" style={{ color: "var(--color-warning)" }}>
              🕐 دفعة معلقة للباقة {p.plan_name} — {Number(p.amount).toLocaleString()} ج
            </span>
            {subscription?.status === "pending" && (
              <button onClick={() => handleConfirmPayment(subscription.id)}
                className="text-xs px-3 py-1 rounded-lg" style={{ background: "var(--color-success)", color: "#fff" }}>
                تأكيد الدفع يدوياً
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;
