import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { exportToExcel } from "../utils/exportExcel";

interface Item {
  id: number;
  name: string;
  category: string;
  buy_price: number;
  sell_wholesale: number;
  sell_retail: number;
  quantity: number;
  min_quantity: number;
  unit: string;
  created_by_name?: string;
}

interface Return {
  id: number;
  item_name: string;
  quantity: number;
  reason: string;
  type: string;
  date: string;
  created_by_name?: string;
}

interface Damage {
  id: number;
  item_name: string;
  quantity: number;
  reason: string;
  date: string;
  created_by_name?: string;
}

const Inventory = () => {
  const { token, canEdit, canDelete } = useAuth();
  const [tab, setTab] = useState<"items" | "returns" | "damages">("items");
  const [items, setItems] = useState<Item[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "", buy_price: "", sell_wholesale: "",
    sell_retail: "", quantity: "", min_quantity: "5", unit: "قطعة"
  });
  const [returnForm, setReturnForm] = useState({ item_id: "", quantity: "", reason: "", type: "return" });
  const [damageForm, setDamageForm] = useState({ item_id: "", quantity: "", reason: "" });
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showDamageForm, setShowDamageForm] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchItems = async () => {
    const res = await axios.get("https://v-accounting-production.up.railway.app/api/inventory", { headers });
    setItems(res.data);
  };

  const fetchReturns = async () => {
    const res = await axios.get("https://v-accounting-production.up.railway.app/api/inventory/returns", { headers });
    setReturns(res.data);
  };

  const fetchDamages = async () => {
    const res = await axios.get("https://v-accounting-production.up.railway.app/api/inventory/damages", { headers });
    setDamages(res.data);
  };

  useEffect(() => {
    fetchItems();
    fetchReturns();
    fetchDamages();
  }, []);

  const handleAdd = async () => {
    if (!form.name || !form.quantity) return;
    setLoading(true);
    try {
      await axios.post("https://v-accounting-production.up.railway.app/api/inventory", form, { headers });
      setForm({ name: "", category: "", buy_price: "", sell_wholesale: "", sell_retail: "", quantity: "", min_quantity: "5", unit: "قطعة" });
      setShowForm(false);
      fetchItems();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    await axios.delete(`https://v-accounting-production.up.railway.app/api/inventory/${id}`, { headers });
    fetchItems();
  };

  const handleReturn = async () => {
    if (!returnForm.item_id || !returnForm.quantity) return;
    setLoading(true);
    try {
      await axios.post("https://v-accounting-production.up.railway.app/api/inventory/returns", returnForm, { headers });
      setReturnForm({ item_id: "", quantity: "", reason: "", type: "return" });
      setShowReturnForm(false);
      fetchItems();
      fetchReturns();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDamage = async () => {
    if (!damageForm.item_id || !damageForm.quantity) return;
    setLoading(true);
    try {
      await axios.post("https://v-accounting-production.up.railway.app/api/inventory/damages", damageForm, { headers });
      setDamageForm({ item_id: "", quantity: "", reason: "" });
      setShowDamageForm(false);
      fetchItems();
      fetchDamages();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleExport = () => {
    const data = items.map(i => ({
      "الصنف": i.name,
      "الفئة": i.category,
      "سعر الشراء": i.buy_price,
      "سعر البيع جملة": i.sell_wholesale,
      "سعر البيع قطاعي": i.sell_retail,
      "الكمية": i.quantity,
      "الوحدة": i.unit,
      "الحالة": i.quantity <= i.min_quantity ? "منخفض" : "متوفر",
    }));
    exportToExcel(data, "المخزن", "المخزن");
  };

  const lowStock = items.filter(i => i.quantity <= i.min_quantity);

  return (
    <div className="p-8 space-y-6">

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">إجمالي الأصناف</p>
          <p className="text-2xl font-bold text-amber-400">{items.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">قيمة المخزن (شراء)</p>
          <p className="text-2xl font-bold text-blue-400">
            {items.reduce((s, i) => s + Number(i.buy_price) * i.quantity, 0).toLocaleString()} ج
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">أصناف منخفضة</p>
          <p className="text-2xl font-bold text-red-400">{lowStock.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">إجمالي المرتجعات</p>
          <p className="text-2xl font-bold text-yellow-400">{returns.length}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4">
          <p className="text-red-400 font-medium mb-2">⚠️ أصناف تحتاج إعادة تخزين:</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="bg-red-400/10 text-red-400 text-xs px-3 py-1 rounded-full">
                {i.name} ({i.quantity} {i.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-800">
        {[
          { id: "items", label: "الأصناف" },
          { id: "returns", label: "المرتجعات" },
          { id: "damages", label: "الهوالك" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.id ? "border-amber-400 text-amber-400" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition">
              تصدير Excel ⬇
            </button>
            {canEdit && (
              <button onClick={() => setShowForm(!showForm)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg transition">
              + إضافة صنف
              </button>
            )}
          </div>

          {canEdit && showForm && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h4 className="font-medium text-gray-300">صنف جديد</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: "name", label: "اسم الصنف *", type: "text", placeholder: "اسم الصنف" },
                  { key: "category", label: "الفئة", type: "text", placeholder: "مثال: إلكترونيات" },
                  { key: "unit", label: "الوحدة", type: "text", placeholder: "قطعة / كيلو / متر" },
                  { key: "buy_price", label: "سعر الشراء", type: "number", placeholder: "0" },
                  { key: "sell_wholesale", label: "سعر البيع جملة", type: "number", placeholder: "0" },
                  { key: "sell_retail", label: "سعر البيع قطاعي", type: "number", placeholder: "0" },
                  { key: "quantity", label: "الكمية *", type: "number", placeholder: "0" },
                  { key: "min_quantity", label: "الحد الأدنى للتنبيه", type: "number", placeholder: "5" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-sm text-gray-400 mb-1 block">{field.label}</label>
                    <input type={field.type} value={form[field.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg transition">
                  {loading ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-6 py-2 rounded-lg transition">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            {items.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                <p className="text-3xl mb-2">📦</p>
                <p>لا توجد أصناف بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table dir="rtl" lang="ar" className="w-full min-w-[56rem] border-collapse text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-right pb-3 px-1">الصنف</th>
                      <th className="text-right pb-3 px-1">الفئة</th>
                      <th className="text-right pb-3 px-1">سعر الشراء</th>
                      <th className="text-right pb-3 px-1">جملة</th>
                      <th className="text-right pb-3 px-1">قطاعي</th>
                      <th className="text-right pb-3 px-1">الكمية</th>
                      <th className="text-right pb-3 px-1">الحالة</th>
                      <th className="text-right pb-3 px-1">بواسطة</th>
                      <th className="text-right pb-3 px-1 w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {items.map((item) => (
                      <tr key={item.id} className="text-gray-300">
                        <td className="py-3 px-1 align-top font-medium">{item.name}</td>
                        <td className="py-3 px-1 align-top text-gray-500">{item.category || "—"}</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap">{Number(item.buy_price).toLocaleString()} ج</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap">{Number(item.sell_wholesale).toLocaleString()} ج</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap">{Number(item.sell_retail).toLocaleString()} ج</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap">{item.quantity} {item.unit}</td>
                        <td className="py-3 px-1 align-top">
                          <span className={`text-xs px-2 py-1 rounded-full ${item.quantity <= item.min_quantity ? "bg-red-400/10 text-red-400" : "bg-green-400/10 text-green-400"}`}>
                            {item.quantity <= item.min_quantity ? "منخفض" : "متوفر"}
                          </span>
                        </td>
                        <td className="py-3 px-1 align-top text-gray-500 whitespace-nowrap">{item.created_by_name || "—"}</td>
                        <td className="py-3 px-1 align-top">
                          {canDelete && (
                            <button onClick={() => handleDelete(item.id)}
                              className="text-gray-600 hover:text-red-400 transition text-xs">حذف</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "returns" && (
        <div className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <button onClick={() => setShowReturnForm(!showReturnForm)}
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg transition">
              + تسجيل مرتجع
              </button>
            </div>
          )}

          {canEdit && showReturnForm && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h4 className="font-medium text-gray-300">مرتجع جديد</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الصنف *</label>
                  <select value={returnForm.item_id} onChange={(e) => setReturnForm({ ...returnForm, item_id: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500">
                    <option value="">اختر صنف</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الكمية *</label>
                  <input type="number" value={returnForm.quantity} onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })}
                    placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">النوع</label>
                  <select value={returnForm.type} onChange={(e) => setReturnForm({ ...returnForm, type: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500">
                    <option value="return">مرتجع من عميل</option>
                    <option value="supplier">مرتجع لمورد</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">السبب</label>
                  <input type="text" value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                    placeholder="سبب الإرجاع" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleReturn} disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg transition">
                  {loading ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button onClick={() => setShowReturnForm(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-6 py-2 rounded-lg transition">إلغاء</button>
              </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            {returns.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                <p className="text-3xl mb-2">↩️</p>
                <p>لا توجد مرتجعات بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table dir="rtl" lang="ar" className="w-full min-w-[40rem] border-collapse text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-right pb-3 px-1">الصنف</th>
                      <th className="text-right pb-3 px-1">الكمية</th>
                      <th className="text-right pb-3 px-1">النوع</th>
                      <th className="text-right pb-3 px-1">السبب</th>
                      <th className="text-right pb-3 px-1">التاريخ</th>
                      <th className="text-right pb-3 px-1">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {returns.map((r) => (
                      <tr key={r.id} className="text-gray-300">
                        <td className="py-3 px-1 align-top font-medium">{r.item_name}</td>
                        <td className="py-3 px-1 align-top">{r.quantity}</td>
                        <td className="py-3 px-1 align-top">
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-400">
                            {r.type === "return" ? "من عميل" : "لمورد"}
                          </span>
                        </td>
                        <td className="py-3 px-1 align-top text-gray-500">{r.reason || "—"}</td>
                        <td className="py-3 px-1 align-top text-gray-500 whitespace-nowrap">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                        <td className="py-3 px-1 align-top text-gray-500 whitespace-nowrap">{r.created_by_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "damages" && (
        <div className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <button onClick={() => setShowDamageForm(!showDamageForm)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition">
              + تسجيل هالك
              </button>
            </div>
          )}

          {canEdit && showDamageForm && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h4 className="font-medium text-gray-300">تسجيل هالك</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الصنف *</label>
                  <select value={damageForm.item_id} onChange={(e) => setDamageForm({ ...damageForm, item_id: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500">
                    <option value="">اختر صنف</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الكمية *</label>
                  <input type="number" value={damageForm.quantity} onChange={(e) => setDamageForm({ ...damageForm, quantity: e.target.value })}
                    placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-400 mb-1 block">السبب</label>
                  <input type="text" value={damageForm.reason} onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                    placeholder="سبب الهلاك" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDamage} disabled={loading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg transition">
                  {loading ? "جاري الحفظ..." : "تسجيل"}
                </button>
                <button onClick={() => setShowDamageForm(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-6 py-2 rounded-lg transition">إلغاء</button>
              </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            {damages.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                <p className="text-3xl mb-2">🗑️</p>
                <p>لا توجد هوالك مسجلة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table dir="rtl" lang="ar" className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-right pb-3 px-1">الصنف</th>
                      <th className="text-right pb-3 px-1">الكمية</th>
                      <th className="text-right pb-3 px-1">السبب</th>
                      <th className="text-right pb-3 px-1">التاريخ</th>
                      <th className="text-right pb-3 px-1">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {damages.map((d) => (
                      <tr key={d.id} className="text-gray-300">
                        <td className="py-3 px-1 align-top font-medium">{d.item_name}</td>
                        <td className="py-3 px-1 align-top text-red-400">{d.quantity}</td>
                        <td className="py-3 px-1 align-top text-gray-500">{d.reason || "—"}</td>
                        <td className="py-3 px-1 align-top text-gray-500 whitespace-nowrap">{new Date(d.date).toLocaleDateString('ar-EG')}</td>
                        <td className="py-3 px-1 align-top text-gray-500 whitespace-nowrap">{d.created_by_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
