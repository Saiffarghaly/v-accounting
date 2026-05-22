import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { exportToExcel } from "../utils/exportExcel";
import { matchesListSearch } from "../utils/listSearch";
import { ListSearchField } from "../components/ListSearchField";

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
  supplier_id?: number;
  supplier_name?: string;
  created_by_name?: string;
}

interface Supplier {
  id: number;
  name: string;
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

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

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
    sell_retail: "", quantity: "", min_quantity: "5", unit: "قطعة", supplier_id: "", record_expense: false
  });
  const [returnForm, setReturnForm] = useState({ item_id: "", quantity: "", reason: "", type: "return" });
  const [damageForm, setDamageForm] = useState({ item_id: "", quantity: "", reason: "" });
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showDamageForm, setShowDamageForm] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [listSearch, setListSearch] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${API}/api/suppliers`, { headers });
      setSuppliers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchItems = async () => {
    const res = await axios.get(`${API}/api/inventory`, { headers });
    setItems(res.data);
  };

  const fetchReturns = async () => {
    const res = await axios.get(`${API}/api/inventory/returns`, { headers });
    setReturns(res.data);
  };

  const fetchDamages = async () => {
    const res = await axios.get(`${API}/api/inventory/damages`, { headers });
    setDamages(res.data);
  };

  useEffect(() => {
    fetchItems();
    fetchReturns();
    fetchDamages();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    setListSearch("");
  }, [tab]);

  const handleAdd = async () => {
    if (!form.name || !form.quantity) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/inventory`, { ...form, supplier_id: form.supplier_id || undefined, record_expense: form.record_expense }, { headers });
      setForm({ name: "", category: "", buy_price: "", sell_wholesale: "", sell_retail: "", quantity: "", min_quantity: "5", unit: "قطعة", supplier_id: "", record_expense: false });
      setShowForm(false);
      fetchItems();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    await axios.delete(`${API}/api/inventory/${id}`, { headers });
    fetchItems();
  };

  const handleReturn = async () => {
    if (!returnForm.item_id || !returnForm.quantity) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/inventory/returns`, returnForm, { headers });
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
      await axios.post(`${API}/api/inventory/damages`, damageForm, { headers });
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

  const filteredItems = useMemo(
    () =>
      items.filter((i) =>
        matchesListSearch(
          listSearch,
          i.name,
          i.category,
          String(i.buy_price),
          String(i.sell_wholesale),
          String(i.sell_retail),
          String(i.quantity),
          i.unit,
          i.quantity <= i.min_quantity ? "منخفض" : "متوفر",
          i.created_by_name
        )
      ),
    [items, listSearch]
  );

  const filteredReturns = useMemo(
    () =>
      returns.filter((r) =>
        matchesListSearch(
          listSearch,
          r.item_name,
          String(r.quantity),
          r.type === "return" ? "من عميل" : "لمورد",
          r.reason,
          new Date(r.date).toLocaleDateString("ar-EG"),
          r.created_by_name
        )
      ),
    [returns, listSearch]
  );

  const filteredDamages = useMemo(
    () =>
      damages.filter((d) =>
        matchesListSearch(
          listSearch,
          d.item_name,
          String(d.quantity),
          d.reason,
          new Date(d.date).toLocaleDateString("ar-EG"),
          d.created_by_name
        )
      ),
    [damages, listSearch]
  );

  const tabs = [
    { id: "items", label: "الأصناف" },
    { id: "returns", label: "المرتجعات" },
    { id: "damages", label: "الهوالك" },
  ];

  return (
    <div className="p-8 space-y-6">

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي الأصناف</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-warning)" }}>{items.length}</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>قيمة المخزن (شراء)</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-info)" }}>
            {items.reduce((s, i) => s + Number(i.buy_price) * i.quantity, 0).toLocaleString()} ج
          </p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>أصناف منخفضة</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>{lowStock.length}</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي المرتجعات</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-warning)" }}>{returns.length}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl p-4 border" style={{ background: "var(--color-danger-light)", borderColor: "var(--color-danger-light)" }}>
          <p className="font-medium mb-2" style={{ color: "var(--color-danger)" }}>⚠️ أصناف تحتاج إعادة تخزين:</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--color-danger-light)", color: "var(--color-danger)" }}>
                {i.name} ({i.quantity} {i.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition"
            style={{
              borderColor: tab === t.id ? "var(--color-accent)" : "transparent",
              color: tab === t.id ? "var(--color-accent)" : "var(--color-text-muted)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2 items-center">
            <ListSearchField variant="light" value={listSearch} onChange={setListSearch} placeholder="بحث في الأصناف…" />
            <button onClick={handleExport}
              className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-accent)" }}>
              تصدير Excel ⬇
            </button>
            {canEdit && (
              <button onClick={() => setShowForm(!showForm)}
                className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "#1a5c38" }}>
              + إضافة صنف
              </button>
            )}
          </div>

          {canEdit && showForm && (
            <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
              <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>صنف جديد</h4>
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
                    <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>{field.label}</label>
                    <input type={field.type} value={form[field.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                      className="w-full border rounded-lg px-4 py-3 text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>المورد</label>
                  <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm">
                    <option value="">اختر المورد</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
                    <input type="checkbox" checked={form.record_expense}
                      onChange={(e) => setForm({ ...form, record_expense: e.target.checked })}
                      className="w-4 h-4 rounded" style={{ accentColor: "var(--color-accent)" }} />
                    <span className="text-sm">تسديد التكلفة من الخزنة</span>
                  </label>
                  {form.record_expense && Number(form.buy_price) > 0 && Number(form.quantity) > 0 && (
                    <span className="text-xs mr-3" style={{ color: "var(--color-danger)" }}>
                      ({(Number(form.buy_price) * Number(form.quantity)).toLocaleString()} ج)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={loading}
                  className="text-white text-sm px-6 py-2 rounded-lg transition disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
                  {loading ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-6 py-2 rounded-lg transition text-sm" style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
            {items.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-3xl mb-2">📦</p>
                <p>لا توجد أصناف بعد</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-3xl mb-2">🔎</p>
                <p>لا توجد نتائج تطابق البحث</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table dir="rtl" lang="ar" className="w-full min-w-[56rem] border-collapse text-sm">
                  <thead>
                    <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                      <th className="text-right pb-3 px-1">الصنف</th>
                      <th className="text-right pb-3 px-1">الفئة</th>
                      <th className="text-right pb-3 px-1">سعر الشراء</th>
                      <th className="text-right pb-3 px-1">جملة</th>
                      <th className="text-right pb-3 px-1">قطاعي</th>
                      <th className="text-right pb-3 px-1">الكمية</th>
                      <th className="text-right pb-3 px-1">الحالة</th>
                      <th className="text-right pb-3 px-1">المورد</th>
                      <th className="text-right pb-3 px-1">بواسطة</th>
                      <th className="text-right pb-3 px-1 w-14"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td className="py-3 px-1 align-top font-medium" style={{ color: "var(--color-text-primary)" }}>{item.name}</td>
                        <td className="py-3 px-1 align-top" style={{ color: "var(--color-text-secondary)" }}>{item.category || "—"}</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{Number(item.buy_price).toLocaleString()} ج</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{Number(item.sell_wholesale).toLocaleString()} ج</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{Number(item.sell_retail).toLocaleString()} ج</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{item.quantity} {item.unit}</td>
                        <td className="py-3 px-1 align-top">
                          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
                            background: item.quantity <= item.min_quantity ? "var(--color-danger-light)" : "var(--color-success-light)",
                            color: item.quantity <= item.min_quantity ? "var(--color-danger)" : "var(--color-success)"
                          }}>
                            {item.quantity <= item.min_quantity ? "منخفض" : "متوفر"}
                          </span>
                        </td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{item.supplier_name || "—"}</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{item.created_by_name || "—"}</td>
                        <td className="py-3 px-1 align-top">
                          {canDelete && (
                            <button onClick={() => handleDelete(item.id)}
                              className="transition text-xs" style={{ color: "var(--color-text-muted)" }}>حذف</button>
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
          <div className="flex flex-wrap justify-end gap-2 items-center">
            <ListSearchField variant="light" value={listSearch} onChange={setListSearch} placeholder="بحث في المرتجعات…" />
            {canEdit && (
              <button onClick={() => setShowReturnForm(!showReturnForm)}
                className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "#1a5c38" }}>
                + تسجيل مرتجع
              </button>
            )}
          </div>

          {canEdit && showReturnForm && (
            <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
              <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>مرتجع جديد</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الصنف *</label>
                  <select value={returnForm.item_id} onChange={(e) => setReturnForm({ ...returnForm, item_id: e.target.value })}
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm">
                    <option value="">اختر صنف</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الكمية *</label>
                  <input type="number" value={returnForm.quantity} onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })}
                    placeholder="0"
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>النوع</label>
                  <select value={returnForm.type} onChange={(e) => setReturnForm({ ...returnForm, type: e.target.value })}
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm">
                    <option value="return">مرتجع من عميل</option>
                    <option value="supplier">مرتجع لمورد</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>السبب</label>
                  <input type="text" value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                    placeholder="سبب الإرجاع"
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleReturn} disabled={loading}
                  className="text-white text-sm px-6 py-2 rounded-lg transition disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
                  {loading ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button onClick={() => setShowReturnForm(false)}
                  className="px-6 py-2 rounded-lg transition text-sm" style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>إلغاء</button>
              </div>
            </div>
          )}

          <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
            {returns.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-3xl mb-2">↩️</p>
                <p>لا توجد مرتجعات بعد</p>
              </div>
            ) : filteredReturns.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-3xl mb-2">🔎</p>
                <p>لا توجد نتائج تطابق البحث</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table dir="rtl" lang="ar" className="w-full min-w-[40rem] border-collapse text-sm">
                  <thead>
                    <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                      <th className="text-right pb-3 px-1">الصنف</th>
                      <th className="text-right pb-3 px-1">الكمية</th>
                      <th className="text-right pb-3 px-1">النوع</th>
                      <th className="text-right pb-3 px-1">السبب</th>
                      <th className="text-right pb-3 px-1">التاريخ</th>
                      <th className="text-right pb-3 px-1">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReturns.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td className="py-3 px-1 align-top font-medium" style={{ color: "var(--color-text-primary)" }}>{r.item_name}</td>
                        <td className="py-3 px-1 align-top" style={{ color: "var(--color-text-primary)" }}>{r.quantity}</td>
                        <td className="py-3 px-1 align-top">
                          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "var(--color-warning-light)", color: "var(--color-warning)" }}>
                            {r.type === "return" ? "من عميل" : "لمورد"}
                          </span>
                        </td>
                        <td className="py-3 px-1 align-top" style={{ color: "var(--color-text-secondary)" }}>{r.reason || "—"}</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{r.created_by_name || "—"}</td>
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
          <div className="flex flex-wrap justify-end gap-2 items-center">
            <ListSearchField variant="light" value={listSearch} onChange={setListSearch} placeholder="بحث في الهوالك…" />
            {canEdit && (
              <button onClick={() => setShowDamageForm(!showDamageForm)}
                className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-danger)" }}>
                + تسجيل هالك
              </button>
            )}
          </div>

          {canEdit && showDamageForm && (
            <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
              <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>تسجيل هالك</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الصنف *</label>
                  <select value={damageForm.item_id} onChange={(e) => setDamageForm({ ...damageForm, item_id: e.target.value })}
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm">
                    <option value="">اختر صنف</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الكمية *</label>
                  <input type="number" value={damageForm.quantity} onChange={(e) => setDamageForm({ ...damageForm, quantity: e.target.value })}
                    placeholder="0"
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>السبب</label>
                  <input type="text" value={damageForm.reason} onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                    placeholder="سبب الهلاك"
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDamage} disabled={loading}
                  className="text-white text-sm px-6 py-2 rounded-lg transition disabled:opacity-50" style={{ background: "var(--color-danger)" }}>
                  {loading ? "جاري الحفظ..." : "تسجيل"}
                </button>
                <button onClick={() => setShowDamageForm(false)}
                  className="px-6 py-2 rounded-lg transition text-sm" style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>إلغاء</button>
              </div>
            </div>
          )}

          <div className="rounded-xl p-6 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
            {damages.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-3xl mb-2">🗑️</p>
                <p>لا توجد هوالك مسجلة</p>
              </div>
            ) : filteredDamages.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
                <p className="text-3xl mb-2">🔎</p>
                <p>لا توجد نتائج تطابق البحث</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table dir="rtl" lang="ar" className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                      <th className="text-right pb-3 px-1">الصنف</th>
                      <th className="text-right pb-3 px-1">الكمية</th>
                      <th className="text-right pb-3 px-1">السبب</th>
                      <th className="text-right pb-3 px-1">التاريخ</th>
                      <th className="text-right pb-3 px-1">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDamages.map((d) => (
                      <tr key={d.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td className="py-3 px-1 align-top font-medium" style={{ color: "var(--color-text-primary)" }}>{d.item_name}</td>
                        <td className="py-3 px-1 align-top" style={{ color: "var(--color-danger)" }}>{d.quantity}</td>
                        <td className="py-3 px-1 align-top" style={{ color: "var(--color-text-secondary)" }}>{d.reason || "—"}</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{new Date(d.date).toLocaleDateString('ar-EG')}</td>
                        <td className="py-3 px-1 align-top whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{d.created_by_name || "—"}</td>
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
