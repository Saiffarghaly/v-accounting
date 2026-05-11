const Landing = ({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) => {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-amber-400">💼 V-ACCOUNTING</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={onLogin}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={onRegister}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            ابدأ مجاناً
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-24 px-8">
        <div className="inline-block bg-blue-600/10 border border-blue-600/20 text-amber-400 text-xs px-4 py-2 rounded-full mb-6">
          🚀 نظام محاسبة احترافي للمكاتب
        </div>
        <h2 className="text-5xl font-bold mb-6 leading-tight">
          حول مكتبك من
          <span className="text-amber-400"> ورق وإكسيل </span>
          <br />إلى نظام رقمي احترافي
        </h2>
        <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
          أدر إيراداتك ومصروفاتك وعملاءك وفواتيرك من مكان واحد. استورد بياناتك من Excel واحصل على تقارير بصرية فورية.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onRegister}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition"
          >
            ابدأ مجاناً الآن
          </button>
          <button
            onClick={onLogin}
            className="border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-4 rounded-xl text-lg transition"
          >
            تسجيل الدخول
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-8 max-w-6xl mx-auto">
        <h3 className="text-3xl font-bold text-center mb-4">كل اللي محتاجه في مكان واحد</h3>
        <p className="text-gray-400 text-center mb-16">مميزات مصممة خصيصاً لمكاتب المحاسبة</p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: "📊", title: "Dashboard بصري", desc: "شوف أرباحك ومصروفاتك ورسوم بيانية تفاعلية في لحظة" },
            { icon: "📁", title: "استيراد Excel", desc: "ارفع أي ملف Excel وحدد الأعمدة بنفسك — النظام يستورد الكل تلقائياً" },
            { icon: "🧾", title: "فواتير PDF", desc: "أنشئ فواتير احترافية وصدّرها PDF بضغطة واحدة" },
            { icon: "👥", title: "إدارة العملاء", desc: "سجل بيانات عملاءك وتابع فواتيرهم ومديونياتهم" },
            { icon: "💰", title: "الإيرادات والمصروفات", desc: "سجل كل معاملة مالية وصنفها وتابع صافي الربح" },
            { icon: "🔐", title: "Multi-tenant", desc: "كل مكتب له بيانات خاصة — مفيش مكتب يشوف بيانات مكتب تاني" },
          ].map((f, i) => (
            <div key={i} className="bg-[#1a2840]border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition">
              <p className="text-3xl mb-4">{f.icon}</p>
              <h4 className="font-bold text-lg mb-2">{f.title}</h4>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-8 max-w-4xl mx-auto">
        <h3 className="text-3xl font-bold text-center mb-4">أسعار بسيطة وشفافة</h3>
        <p className="text-gray-400 text-center mb-16">ابدأ مجاناً — لا بطاقة ائتمانية مطلوبة</p>
        <div className="grid grid-cols-2 gap-6">
          {[
            {
              name: "مجاني",
              price: "0",
              color: "border-gray-700",
              features: ["مكتب واحد", "حتى 100 معاملة", "3 عملاء", "تقارير أساسية"],
              cta: "ابدأ مجاناً",
              action: onRegister,
              highlight: false,
            },
            {
              name: "احترافي",
              price: "5,000",
              color: "border-blue-500",
              features: ["مكاتب غير محدودة", "معاملات غير محدودة", "عملاء غير محدودين", "تقارير متقدمة", "استيراد Excel", "PDF Export", "دعم فني"],
              cta: "ابدأ التجربة",
              action: onRegister,
              highlight: true,
            },
          ].map((plan, i) => (
            <div key={i} className={`bg-[#1a2840]border-2 ${plan.color} rounded-xl p-8 ${plan.highlight ? "relative" : ""}`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-4 py-1 rounded-full">
                  الأكثر شيوعاً
                </div>
              )}
              <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-400">ج.م / شهر</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.action}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  plan.highlight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border border-gray-700 hover:border-gray-500 text-gray-300"
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
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-16 max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold mb-4">جاهز تبدأ؟</h3>
          <p className="text-gray-400 mb-8">سجل مكتبك الآن وابدأ إدارة محاسبتك بشكل احترافي</p>
          <button
            onClick={onRegister}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl text-lg font-medium transition"
          >
            أنشئ مكتبك مجاناً
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-8 text-center text-gray-600 text-sm">
        <p>© 2026 V-ACCOUNTING — جميع الحقوق محفوظة</p>
      </footer>

    </div>
  );
};

export default Landing;