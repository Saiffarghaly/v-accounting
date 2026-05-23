import { BrandWordmark } from "../components/BrandWordmark";

const Landing = ({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) => {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">

      {/* Navbar */}
      <nav className="border-b border-gray-300 px-8 py-4 flex items-center justify-between bg-gray-100">
        <div className="flex items-center min-w-0">
          <BrandWordmark variant="onLight" size="sm" />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onLogin}
            className="text-gray-600 hover:text-gray-900 text-sm transition"
          >
            تسجيل الدخول
          </button>

          <button
            onClick={onRegister}
            className="bg-[#217346] hover:bg-[#1b5e38] text-white text-sm px-4 py-2 rounded-lg transition"
          >
            ابدأ مجاناً
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-8">
        <div className="flex justify-center mb-8">
          <BrandWordmark variant="onLight" size="lg" />
        </div>

        <div className="inline-block bg-[#217346]/10 border border-[#217346]/20 text-[#217346] text-xs px-4 py-2 rounded-full mb-6">
          🚀 نظام محاسبة احترافي للمكاتب
        </div>

        <h2 className="text-5xl font-bold mb-6 leading-tight">
          حول مكتبك من
          <span className="text-[#217346]"> ورق وإكسيل </span>
          <br />
          إلى نظام رقمي احترافي
        </h2>

        <p className="text-gray-600 text-lg mb-10 max-w-2xl mx-auto">
          أدر إيراداتك ومصروفاتك وعملاءك وفواتيرك من مكان واحد.
          استورد بياناتك من Excel واحصل على تقارير بصرية فورية.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onRegister}
            className="bg-[#217346] hover:bg-[#1b5e38] text-white px-8 py-4 rounded-xl text-lg font-medium transition"
          >
            ابدأ مجاناً الآن
          </button>

          <button
            onClick={onLogin}
            className="border border-gray-400 hover:border-gray-600 text-gray-700 px-8 py-4 rounded-xl text-lg transition"
          >
            تسجيل الدخول
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-8 max-w-6xl mx-auto">
        <h3 className="text-3xl font-bold text-center mb-4">
          كل اللي محتاجه في مكان واحد
        </h3>

        <p className="text-gray-600 text-center mb-16">
          مميزات مصممة خصيصاً لمكاتب المحاسبة
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "📊",
              title: "Dashboard بصري",
              desc: "شوف أرباحك ومصروفاتك ورسوم بيانية تفاعلية في لحظة",
            },
            {
              icon: "📁",
              title: "استيراد Excel",
              desc: "ارفع أي ملف Excel وحدد الأعمدة بنفسك — النظام يستورد الكل تلقائياً",
            },
            {
              icon: "🧾",
              title: "فواتير PDF",
              desc: "أنشئ فواتير احترافية وصدّرها PDF بضغطة واحدة",
            },
            {
              icon: "👥",
              title: "إدارة العملاء",
              desc: "سجل بيانات عملاءك وتابع فواتيرهم ومديونياتهم",
            },
            {
              icon: "💰",
              title: "الإيرادات والمصروفات",
              desc: "سجل كل معاملة مالية وصنفها وتابع صافي الربح",
            },
            {
              icon: "🔐",
              title: "Multi-tenant",
              desc: "كل مكتب له بيانات خاصة — مفيش مكتب يشوف بيانات مكتب تاني",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white border border-gray-300 rounded-xl p-6 hover:border-[#217346]/50 shadow-sm transition"
            >
              <p className="text-3xl mb-4">{f.icon}</p>

              <h4 className="font-bold text-lg mb-2">
                {f.title}
              </h4>

              <p className="text-gray-600 text-sm">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-8 max-w-6xl mx-auto">
        <h3 className="text-3xl font-bold text-center mb-4">
          أسعار بسيطة وشفافة
        </h3>

        <p className="text-gray-600 text-center mb-16">
          ابدأ مجاناً — لا بطاقة ائتمانية مطلوبة
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: "مجاني",
              price: "0",
              desc: "للمكاتب الصغيرة",
              color: "border-gray-300",
              features: [
                "مستخدم واحد",
                "100 معاملة/شهر",
                "20 فاتورة/شهر",
                "20 عميل",
                "50 صنف بالمخزن",
              ],
              cta: "ابدأ مجاناً",
              action: onRegister,
              highlight: false,
            },
            {
              name: "قياسي",
              price: "500",
              desc: "للمكاتب المتوسطة",
              color: "border-blue-400",
              features: [
                "3 مستخدمين",
                "1000 معاملة/شهر",
                "200 فاتورة/شهر",
                "200 عميل",
                "500 صنف بالمخزن",
                "تقارير متقدمة",
                "دعم عبر الواتساب",
              ],
              cta: "ابدأ الآن",
              action: onRegister,
              highlight: false,
            },
            {
              name: "مميز",
              price: "1,000",
              desc: "للمكاتب الكبيرة",
              color: "border-[#217346]",
              features: [
                "10 مستخدمين",
                "معاملات غير محدودة",
                "فواتير غير محدودة",
                "عملاء غير محدودين",
                "مخزن غير محدود",
                "كل التقارير والتحليلات",
                "دعم فوري 24/7",
              ],
              cta: "الأكثر طلباً",
              action: onRegister,
              highlight: true,
            },
            {
              name: "شركات",
              price: "2,500",
              desc: "للشركات والمؤسسات",
              color: "border-purple-400",
              features: [
                "مستخدمين غير محدودين",
                "كل شيء غير محدود",
                "مساعد ذكي مخصص",
                "دعم فني 24/7",
                "تكامل مع الأنظمة",
                "لوحة تحكم تنفيذية",
                "تطبيق جوال كامل",
              ],
              cta: "تواصل معنا",
              action: onRegister,
              highlight: false,
            },
          ].map((plan, i) => (
            <div
              key={i}
              className={`bg-white border-2 ${plan.color} rounded-xl p-8 shadow-sm flex flex-col ${
                plan.highlight ? "relative scale-105" : ""
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#217346] text-white text-xs px-4 py-1 rounded-full whitespace-nowrap">
                  الأكثر شيوعاً
                </div>
              )}

              <h4 className="text-xl font-bold mb-1">{plan.name}</h4>
              <p className="text-xs text-gray-500 mb-4">{plan.desc}</p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-500">ج.م / شهر</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={plan.action}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  plan.highlight
                    ? "bg-[#217346] hover:bg-[#1b5e38] text-white"
                    : "border border-gray-400 hover:border-gray-600 text-gray-700"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 text-center">
        <div className="bg-[#217346]/10 border border-[#217346]/20 rounded-2xl p-16 max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold mb-4">
            جاهز تبدأ؟
          </h3>

          <p className="text-gray-600 mb-8">
            سجل مكتبك الآن وابدأ إدارة محاسبتك بشكل احترافي
          </p>

          <button
            onClick={onRegister}
            className="bg-[#217346] hover:bg-[#1b5e38] text-white px-10 py-4 rounded-xl text-lg font-medium transition"
          >
            أنشئ مكتبك مجاناً
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-300 py-8 px-8 text-center text-gray-600 text-sm">
        <p>© 2026 V-ACCOUNTING — جميع الحقوق محفوظة</p>
      </footer>

    </div>
  );
};

export default Landing;