import { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

type Destination = "transactions" | "clients" | "inventory" | "";

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

  const headers = { Authorization: `Bearer ${token}` };

  const destinations = [
    { id: "transactions", label: "الإيرادات والمصروفات", icon: "💰", desc: "استيراد معاملات مالية" },
    { id: "clients", label: "العملاء", icon: "👥", desc: "استيراد بيانات العملاء" },
    { id: "inventory", label: "المخزن", icon: "📦", desc: "استيراد أصناف المخزن" },
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
          endpoint = "http://localhost:5000/api/transactions";
        } else if (destination === "clients") {
          body = {
            name: mapping.name ? String(row[mapping.name] || "") : "",
            email: mapping.email ? String(row[mapping.email] || "") : "",
            phone: mapping.phone ? String(row[mapping.phone] || "") : "",
            address: mapping.address ? String(row[mapping.address] || "") : "",
          };
          if (!body.name) continue;
          endpoint = "http://localhost:5000/api/clients";
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
          endpoint = "http://localhost:5000/api/inventory";
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
  };

  const stepLabels = ["اختر الوجهة", "رفع الملف", "تحديد الأعمدة", "تم"];
  const stepKeys = ["destination", "upload", "map", "done"];

  return (
    <div className="p-8 space-y-6">

      <div>
        <h3 className="text-lg font-semibold">استيراد Excel</h3>
        <p className="text-sm text-gray-500 mt-1">ارفع أي ملف Excel وحدد الأعمدة بنفسك</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              stepKeys[i] === step ? "bg-amber-500 text-white" :
              stepKeys.indexOf(step) > i ? "bg-green-600 text-white" :
              "bg-gray-800 text-gray-500"
            }`}>
              {i + 1}
            </div>
            <span className="text-sm text-gray-400">{label}</span>
            {i < 3 && <div className="w-6 h-px bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 0: Choose Destination */}
      {step === "destination" && (
        <div className="space-y-4">
          <p className="text-gray-400">البيانات اللي هترفعها هتتحفظ فين؟</p>
          <div className="grid grid-cols-3 gap-4">
            {destinations.map((d) => (
              <button key={d.id} onClick={() => setDestination(d.id as Destination)}
                className={`bg-gray-900 border-2 rounded-xl p-6 text-right transition ${
                  destination === d.id ? "border-amber-500" : "border-gray-800 hover:border-gray-600"
                }`}>
                <p className="text-3xl mb-3">{d.icon}</p>
                <p className="font-medium text-white mb-1">{d.label}</p>
                <p className="text-xs text-gray-500">{d.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => destination && setStep("upload")} disabled={!destination}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm px-8 py-3 rounded-lg transition">
              التالي ←
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">{destinations.find(d => d.id === destination)?.icon}</span>
            <div>
              <p className="text-amber-400 font-medium">الوجهة: {destinations.find(d => d.id === destination)?.label}</p>
              <button onClick={() => setStep("destination")} className="text-xs text-gray-500 hover:text-gray-300">تغيير</button>
            </div>
          </div>
          <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl p-12 text-center">
            <p className="text-5xl mb-4">📁</p>
            <p className="text-gray-400 mb-6">ارفع أي ملف Excel أو CSV</p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" id="file-upload" />
            <label htmlFor="file-upload"
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-8 py-3 rounded-lg cursor-pointer transition">
              اختر الملف
            </label>
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h4 className="font-medium text-gray-300">حدد إيه كل عمود</h4>
            <p className="text-sm text-gray-500">الملف عنده {rawData.length} صف و {columns.length} عمود</p>

            <div className="grid grid-cols-2 gap-4">
              {(fieldsByDestination[destination] || []).map((field) => (
                <div key={field.key}>
                  <label className="text-sm text-gray-400 mb-1 block">{field.label}</label>
                  <select value={mapping[field.key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500">
                    <option value="">— اختر عمود —</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              ))}

              {destination === "transactions" && (
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">النوع الافتراضي</label>
                  <select value={defaultType} onChange={(e) => setDefaultType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500">
                    <option value="إيراد">إيراد</option>
                    <option value="مصروف">مصروف</option>
                  </select>
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="overflow-x-auto">
              <p className="text-xs text-gray-500 mb-2">معاينة أول 3 صفوف:</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    {columns.map(col => <th key={col} className="text-right pb-2 px-2">{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 3).map((row, i) => (
                    <tr key={i} className="text-gray-400 border-b border-gray-800/50">
                      {columns.map(col => <td key={col} className="py-2 px-2">{String(row[col] || "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleImport} disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-8 py-3 rounded-lg transition">
                {loading ? "جاري الاستيراد..." : `استيراد ${rawData.length} صف إلى ${destinations.find(d => d.id === destination)?.label}`}
              </button>
              <button onClick={reset}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-6 py-3 rounded-lg transition">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-10 text-center space-y-4">
          <p className="text-5xl">✅</p>
          <p className="text-xl font-bold text-green-400">تم الاستيراد بنجاح!</p>
          <p className="text-gray-400">
            تم استيراد <span className="text-white font-bold">{success}</span> سجل إلى{" "}
            <span className="text-amber-400">{destinations.find(d => d.id === destination)?.label}</span>
          </p>
          <button onClick={reset}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-8 py-3 rounded-lg transition">
            استيراد ملف آخر
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportExcel;