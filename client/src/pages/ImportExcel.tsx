import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { matchesListSearch } from "../utils/listSearch";
import { ListSearchField } from "../components/ListSearchField";

type Destination = "transactions" | "clients" | "inventory" | "suppliers" | "treasury" | "debts" | "salaries" | "bank" | "";

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const ImportExcel = () => {
  const { token } = useAuth();
  const [destination, setDestination] = useState<Destination>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultType, setDefaultType] = useState("إيراد");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(0);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"destination" | "upload" | "map" | "done">("destination");
  const [listSearch, setListSearch] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const [defaultTreasuryType, setDefaultTreasuryType] = useState("deposit");
  const [defaultTreasurySource, setDefaultTreasurySource] = useState("cash");

  const destinations = [
    { id: "transactions", label: "الإيرادات والمصروفات", icon: "💰", desc: "استيراد معاملات مالية" },
    { id: "clients", label: "العملاء", icon: "👥", desc: "استيراد بيانات العملاء" },
    { id: "inventory", label: "المخزن", icon: "📦", desc: "استيراد أصناف المخزن" },
    { id: "suppliers", label: "الموردين", icon: "🚚", desc: "استيراد بيانات الموردين" },
    { id: "treasury", label: "الخزينة", icon: "🏦", desc: "استيراد حركات الخزينة" },
    { id: "debts", label: "الديون", icon: "📋", desc: "استيراد ديون العملاء" },
    { id: "salaries", label: "الرواتب", icon: "👨‍💼", desc: "استيراد بيانات الموظفين" },
    { id: "bank", label: "البنوك", icon: "🏛️", desc: "استيراد حسابات بنكية" },
  ];

  const fieldsByDestination: Record<string, { key: string; label: string; required: boolean }[]> = {
    transactions: [
      { key: "description", label: "البيان / الوصف", required: false },
      { key: "amount", label: "المبلغ ⭐", required: true },
      { key: "type", label: "النوع (إيراد/مصروف)", required: false },
      { key: "category", label: "التصنيف", required: false },
      { key: "date", label: "التاريخ", required: false },
    ],
    clients: [
      { key: "name", label: "اسم العميل ⭐", required: true },
      { key: "email", label: "البريد الإلكتروني", required: false },
      { key: "phone", label: "رقم الهاتف", required: false },
      { key: "address", label: "العنوان", required: false },
    ],
    inventory: [
      { key: "name", label: "اسم الصنف ⭐", required: true },
      { key: "category", label: "الفئة", required: false },
      { key: "buy_price", label: "سعر الشراء", required: false },
      { key: "sell_wholesale", label: "سعر البيع جملة", required: false },
      { key: "sell_retail", label: "سعر البيع قطاعي", required: false },
      { key: "quantity", label: "الكمية", required: false },
      { key: "unit", label: "الوحدة", required: false },
    ],
    suppliers: [
      { key: "name", label: "اسم المورد ⭐", required: true },
      { key: "email", label: "البريد الإلكتروني", required: false },
      { key: "phone", label: "رقم الهاتف", required: false },
      { key: "address", label: "العنوان", required: false },
    ],
    treasury: [
      { key: "amount", label: "المبلغ ⭐", required: true },
      { key: "description", label: "البيان", required: false },
      { key: "date", label: "التاريخ", required: false },
    ],
    debts: [
      { key: "client_name", label: "اسم العميل ⭐", required: true },
      { key: "amount", label: "المبلغ ⭐", required: true },
      { key: "description", label: "البيان", required: false },
      { key: "due_date", label: "تاريخ الاستحقاق", required: false },
    ],
    salaries: [
      { key: "name", label: "اسم الموظف ⭐", required: true },
      { key: "phone", label: "رقم الهاتف", required: false },
      { key: "salary", label: "الراتب", required: false },
      { key: "notes", label: "ملاحظات", required: false },
    ],
    bank: [
      { key: "bank_name", label: "اسم البنك ⭐", required: true },
      { key: "account_name", label: "اسم الحساب ⭐", required: true },
      { key: "account_number", label: "رقم الحساب", required: false },
      { key: "iban", label: "IBAN", required: false },
      { key: "swift", label: "SWIFT", required: false },
      { key: "currency", label: "العملة", required: false },
      { key: "balance", label: "الرصيد الافتتاحي", required: false },
    ],
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet) as any[];
      if (json.length === 0) { setError("الملف فاضي!"); return; }
      setColumns(Object.keys(json[0]));
      setRawData(json);
      setListSearch("");
      setStep("map");
      setError("");
      setSuccess(0);
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    const fields = fieldsByDestination[destination] || [];
    const requiredField = fields.find(f => f.required);
    if (requiredField && !mapping[requiredField.key]) {
      setError(`لازم تختار عمود ${requiredField.label}`);
      return;
    }
    setLoading(true);
    setError("");
    let count = 0;

    try {
      for (const row of rawData) {
        let endpoint = "";
        let body: Record<string, any> = {};

        if (destination === "transactions") {
          body = {
            description: mapping.description ? String(row[mapping.description] || "") : "بدون وصف",
            amount: Number(row[mapping.amount] || 0),
            type: mapping.type ? String(row[mapping.type] || defaultType) : defaultType,
            category: mapping.category ? String(row[mapping.category] || "أخرى") : "أخرى",
            date: mapping.date ? String(row[mapping.date] || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
          };
          if (body.amount <= 0) continue;
          endpoint = `${API}/api/transactions`;
        } else if (destination === "clients") {
          body = {
            name: mapping.name ? String(row[mapping.name] || "") : "",
            email: mapping.email ? String(row[mapping.email] || "") : "",
            phone: mapping.phone ? String(row[mapping.phone] || "") : "",
            address: mapping.address ? String(row[mapping.address] || "") : "",
          };
          if (!body.name) continue;
          endpoint = `${API}/api/clients`;
        } else if (destination === "inventory") {
          body = {
            name: mapping.name ? String(row[mapping.name] || "") : "",
            category: mapping.category ? String(row[mapping.category] || "") : "",
            buy_price: mapping.buy_price ? Number(row[mapping.buy_price] || 0) : 0,
            sell_wholesale: mapping.sell_wholesale ? Number(row[mapping.sell_wholesale] || 0) : 0,
            sell_retail: mapping.sell_retail ? Number(row[mapping.sell_retail] || 0) : 0,
            quantity: mapping.quantity ? Number(row[mapping.quantity] || 0) : 0,
            unit: mapping.unit ? String(row[mapping.unit] || "قطعة") : "قطعة",
            min_quantity: 5,
          };
          if (!body.name) continue;
          endpoint = `${API}/api/inventory`;
        } else if (destination === "suppliers") {
          body = {
            name: mapping.name ? String(row[mapping.name] || "") : "",
            email: mapping.email ? String(row[mapping.email] || "") : "",
            phone: mapping.phone ? String(row[mapping.phone] || "") : "",
            address: mapping.address ? String(row[mapping.address] || "") : "",
          };
          if (!body.name) continue;
          endpoint = `${API}/api/suppliers`;
        } else if (destination === "treasury") {
          body = {
            type: defaultTreasuryType,
            source: defaultTreasurySource,
            amount: Number(row[mapping.amount] || 0),
            description: mapping.description ? String(row[mapping.description] || "") : "",
            date: mapping.date ? String(row[mapping.date] || new Date().toISOString().split("T")[0]) : new Date().toISOString().split("T")[0],
          };
          if (body.amount <= 0) continue;
          endpoint = `${API}/api/treasury`;
        } else if (destination === "debts") {
          body = {
            client_name: mapping.client_name ? String(row[mapping.client_name] || "") : "",
            amount: Number(row[mapping.amount] || 0),
            description: mapping.description ? String(row[mapping.description] || "") : "",
            due_date: mapping.due_date ? String(row[mapping.due_date] || "") : "",
          };
          if (!body.client_name || body.amount <= 0) continue;
          endpoint = `${API}/api/debts`;
        } else if (destination === "salaries") {
          body = {
            name: mapping.name ? String(row[mapping.name] || "") : "",
            phone: mapping.phone ? String(row[mapping.phone] || "") : "",
            salary: mapping.salary ? Number(row[mapping.salary] || 0) : 0,
            notes: mapping.notes ? String(row[mapping.notes] || "") : "",
          };
          if (!body.name) continue;
          endpoint = `${API}/api/salaries/employees`;
        } else if (destination === "bank") {
          body = {
            bank_name: mapping.bank_name ? String(row[mapping.bank_name] || "") : "",
            account_name: mapping.account_name ? String(row[mapping.account_name] || "") : "",
            account_number: mapping.account_number ? String(row[mapping.account_number] || "") : "",
            iban: mapping.iban ? String(row[mapping.iban] || "") : "",
            swift: mapping.swift ? String(row[mapping.swift] || "") : "",
            currency: mapping.currency ? String(row[mapping.currency] || "EGP") : "EGP",
            balance: mapping.balance ? Number(row[mapping.balance] || 0) : 0,
          };
          if (!body.bank_name || !body.account_name) continue;
          endpoint = `${API}/api/bank`;
        }

        await axios.post(endpoint, body, { headers });
        count++;
      }
      setSuccess(count);
      setStep("done");
    } catch (err) {
      setError("حدث خطأ أثناء الاستيراد");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("destination");
    setDestination("");
    setColumns([]);
    setRawData([]);
    setMapping({});
    setSuccess(0);
    setError("");
    setListSearch("");
  };

  const filteredPreviewRows = useMemo(() => {
    if (!listSearch.trim() || columns.length === 0) return rawData;
    return rawData.filter((row) =>
      matchesListSearch(
        listSearch,
        ...columns.map((col) => row[col])
      )
    );
  }, [rawData, columns, listSearch]);

  const previewRows = filteredPreviewRows.slice(0, 20);

  const stepLabels = ["اختر الوجهة", "رفع الملف", "تحديد الأعمدة", "تم"];
  const stepKeys = ["destination", "upload", "map", "done"];

  return (
    <div className="p-8 space-y-6">

      <div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>استيراد Excel</h3>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>ارفع أي ملف Excel وحدد الأعمدة بنفسك</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              stepKeys[i] === step ? "text-white" :
              stepKeys.indexOf(step) > i ? "text-white" :
              ""
            }`} style={{
              background: stepKeys[i] === step ? "var(--color-accent)" :
                         stepKeys.indexOf(step) > i ? "var(--color-accent)" :
                         "var(--color-bg-input)"
            }}>
              {i + 1}
            </div>
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
            {i < 3 && <div className="w-6 h-px" style={{ background: "var(--color-border)" }} />}
          </div>
        ))}
      </div>

      {/* Step 0: Choose Destination */}
      {step === "destination" && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>البيانات اللي هترفعها هتتحفظ فين؟</p>
          <div className="grid grid-cols-3 gap-4">
            {destinations.map((d) => (
              <button key={d.id} onClick={() => setDestination(d.id as Destination)}
                className="rounded-xl p-6 text-right transition border-2"
                style={{
                  background: "var(--color-bg-card)",
                  borderColor: destination === d.id ? "var(--color-accent)" : "var(--color-border)",
                }}>
                <p className="text-3xl mb-3">{d.icon}</p>
                <p className="font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>{d.label}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{d.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => destination && setStep("upload")} disabled={!destination}
              className="text-white text-sm px-8 py-3 rounded-lg transition disabled:opacity-40" style={{ background: "var(--color-accent)" }}>
              التالي ←
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 flex items-center gap-3 border" style={{ background: "var(--color-accent-lighter)", borderColor: "var(--color-accent-light)" }}>
            <span className="text-2xl">{destinations.find(d => d.id === destination)?.icon}</span>
            <div>
              <p className="font-medium" style={{ color: "var(--color-accent)" }}>الوجهة: {destinations.find(d => d.id === destination)?.label}</p>
              <button onClick={() => setStep("destination")} className="text-xs" style={{ color: "var(--color-text-muted)" }}>تغيير</button>
            </div>
          </div>
          <div className="rounded-xl p-12 text-center border-2 border-dashed" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
            <p className="text-5xl mb-4">📁</p>
            <p className="mb-6" style={{ color: "var(--color-text-secondary)" }}>ارفع أي ملف Excel أو CSV</p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" id="file-upload" />
            <label htmlFor="file-upload"
              className="text-white text-sm px-8 py-3 rounded-lg cursor-pointer transition" style={{ background: "var(--color-accent)" }}>
              اختر الملف
            </label>
            {error && <p className="mt-4 text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
            <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>حدد إيه كل عمود</h4>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>الملف عنده {rawData.length} صف و {columns.length} عمود</p>

            <div className="flex flex-wrap items-center gap-2">
              <ListSearchField variant="light" value={listSearch} onChange={setListSearch} placeholder="بحث في معاينة الصفوف…" />
              {listSearch.trim() ? (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {filteredPreviewRows.length} صف يطابق البحث (المعاينة أول 20 منها؛ الاستيراد لكل {rawData.length} صف)
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(fieldsByDestination[destination] || []).map((field) => (
                <div key={field.key}>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>{field.label}</label>
                  <select value={mapping[field.key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm">
                    <option value="">— اختر عمود —</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              ))}

              {destination === "transactions" && (
                <div>
                  <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>النوع الافتراضي</label>
                  <select value={defaultType} onChange={(e) => setDefaultType(e.target.value)}
                    style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                    className="w-full border rounded-lg px-4 py-3 text-sm">
                    <option value="إيراد">إيراد</option>
                    <option value="مصروف">مصروف</option>
                  </select>
                </div>
              )}

              {destination === "treasury" && (
                <>
                  <div>
                    <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>نوع الحركة الافتراضي</label>
                    <select value={defaultTreasuryType} onChange={(e) => setDefaultTreasuryType(e.target.value)}
                      style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                      className="w-full border rounded-lg px-4 py-3 text-sm">
                      <option value="deposit">إيداع</option>
                      <option value="withdraw">سحب</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>المصدر الافتراضي</label>
                    <select value={defaultTreasurySource} onChange={(e) => setDefaultTreasurySource(e.target.value)}
                      style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                      className="w-full border rounded-lg px-4 py-3 text-sm">
                      <option value="cash">نقدي</option>
                      <option value="vodafone_cash">فودافون كاش</option>
                      <option value="instapay">انستا باي</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}

            <div className="overflow-x-auto">
              <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>معاينة أول 20 صفًا من نتائج البحث:</p>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                    {columns.map(col => <th key={col} className="text-right pb-2 px-2">{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td colSpan={Math.max(columns.length, 1)} className="py-6 text-center" style={{ color: "var(--color-text-muted)" }}>
                        لا توجد نتائج تطابق البحث
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((row, i) => (
                      <tr key={i} style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border-light)" }}>
                        {columns.map(col => <td key={col} className="py-2 px-2">{String(row[col] || "")}</td>)}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleImport} disabled={loading}
                className="text-white text-sm px-8 py-3 rounded-lg transition disabled:opacity-50" style={{ background: "var(--color-accent)" }}>
                {loading ? "جاري الاستيراد..." : `استيراد ${rawData.length} صف إلى ${destinations.find(d => d.id === destination)?.label}`}
              </button>
              <button onClick={reset}
                className="px-6 py-3 rounded-lg transition text-sm" style={{ background: "var(--color-bg-input)", color: "var(--color-text-secondary)" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="rounded-xl p-10 text-center space-y-4 border" style={{ background: "var(--color-success-light)", borderColor: "var(--color-accent-light)" }}>
          <p className="text-5xl">✅</p>
          <p className="text-xl font-bold" style={{ color: "var(--color-success)" }}>تم الاستيراد بنجاح!</p>
          <p style={{ color: "var(--color-text-secondary)" }}>
            تم استيراد <span className="font-bold" style={{ color: "var(--color-text-primary)" }}>{success}</span> سجل إلى{" "}
            <span style={{ color: "var(--color-accent)" }}>{destinations.find(d => d.id === destination)?.label}</span>
          </p>
          <button onClick={reset}
            className="text-white text-sm px-8 py-3 rounded-lg transition" style={{ background: "var(--color-accent)" }}>
            استيراد ملف آخر
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportExcel;
