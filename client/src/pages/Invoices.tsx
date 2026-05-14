import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import jsPDF from "jspdf";
import { exportToExcel } from "../utils/exportExcel";

interface Invoice {
  id: number;
  client_id: number;
  client_name: string;
  amount: number;
  status: string;
  due_date: string;
  created_at: string;
  created_by_name?: string;
}

interface Client {
  id: number;
  name: string;
}

const Invoices = () => {
  const { token, canEdit, canDelete } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ client_id: "", amount: "", status: "pending", due_date: "" });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get("https://v-accounting-production.up.railway.app/api/invoices", { headers });
      setInvoices(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get("https://v-accounting-production.up.railway.app/api/clients", { headers });
      setClients(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchInvoices(); fetchClients(); }, []);

  const handleAdd = async () => {
    if (!form.client_id || !form.amount) return;
    setLoading(true);
    try {
      await axios.post("https://v-accounting-production.up.railway.app/api/invoices", form, { headers });
      setForm({ client_id: "", amount: "", status: "pending", due_date: "" });
      setShowForm(false);
      fetchInvoices();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await axios.patch(`https://v-accounting-production.up.railway.app/api/invoices/${id}`, { status }, { headers });
      fetchInvoices();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`https://v-accounting-production.up.railway.app/api/invoices/${id}`, { headers });
      fetchInvoices();
    } catch (err) { console.error(err); }
  };

  const handleExport = () => {
    const data = invoices.map(i => ({
      "رقم الفاتورة": `#${i.id}`,
      "العميل": i.client_name,
      "المبلغ": i.amount,
      "الحالة": i.status === "paid" ? "مدفوع" : i.status === "overdue" ? "متأخر" : "معلق",
      "تاريخ الاستحقاق": i.due_date ? new Date(i.due_date).toLocaleDateString('ar-EG') : "—",
    }));
    exportToExcel(data, "الفواتير", "الفواتير");
  };

  const exportPDF = (inv: Invoice) => {
    const content = `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 40px; color: #000; background: #fff; width: 700px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">V-ACCOUNTING</h1>
          <p style="color: #666; margin: 5px 0;">فاتورة ضريبية</p>
          <hr style="border: 1px solid #eee; margin-top: 15px;"/>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <p><strong>رقم الفاتورة:</strong> #${inv.id}</p>
            <p><strong>التاريخ:</strong> ${new Date(inv.created_at).toLocaleDateString('ar-EG')}</p>
            <p><strong>تاريخ الاستحقاق:</strong> ${inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : "—"}</p>
          </div>
          <div>
            <p><strong>العميل:</strong> ${inv.client_name || "—"}</p>
            <p><strong>الحالة:</strong> ${inv.status === "paid" ? "مدفوع" : inv.status === "overdue" ? "متأخر" : "معلق"}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f59e0b; color: white;">
              <th style="padding: 12px; text-align: right;">البيان</th>
              <th style="padding: 12px; text-align: right;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px;">فاتورة رقم #${inv.id}</td>
              <td style="padding: 12px;">${Number(inv.amount).toLocaleString()} ج.م</td>
            </tr>
          </tbody>
        </table>
        <div style="text-align: left; margin-top: 20px;">
          <h3 style="color: #f59e0b;">الإجمالي: ${Number(inv.amount).toLocaleString()} ج.م</h3>
        </div>
        <div style="text-align: center; margin-top: 50px; color: #999; font-size: 12px;">
          <p>تم الإنشاء بواسطة V-ACCOUNTING</p>
        </div>
      </div>
    `;
    const container = document.createElement("div");
    container.innerHTML = content;
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);
    import("html2canvas").then((html2canvas) => {
      html2canvas.default(container).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`invoice-${inv.id}.pdf`);
        document.body.removeChild(container);
      });
    });
  };

  const statusColor = (status: string) => {
    if (status === "paid") return "bg-green-400/10 text-green-400";
    if (status === "overdue") return "bg-red-400/10 text-red-400";
    return "bg-yellow-400/10 text-yellow-400";
  };

  const statusLabel = (status: string) => {
    if (status === "paid") return "مدفوع";
    if (status === "overdue") return "متأخر";
    return "معلق";
  };

  const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="p-8 space-y-6">

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">إجمالي الفواتير</p>
          <p className="text-2xl font-bold text-amber-400">{total.toLocaleString()} ج</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">المدفوع</p>
          <p className="text-2xl font-bold text-green-400">{paid.toLocaleString()} ج</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">المعلق</p>
          <p className="text-2xl font-bold text-yellow-400">{pending.toLocaleString()} ج</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">الفواتير</h3>
          <p className="text-sm text-gray-500">{invoices.length} فاتورة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition">
            تصدير Excel ⬇
          </button>
          {canEdit && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg transition">
            + فاتورة جديدة
            </button>
          )}
        </div>
      </div>

      {canEdit && showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h4 className="font-medium text-gray-300">فاتورة جديدة</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">العميل *</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500">
                <option value="">اختر عميل</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">المبلغ *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500">
                <option value="pending">معلق</option>
                <option value="paid">مدفوع</option>
                <option value="overdue">متأخر</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">تاريخ الاستحقاق</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
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
        {invoices.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p className="text-3xl mb-2">🧾</p>
            <p>لا توجد فواتير بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table dir="rtl" lang="ar" className="w-full min-w-[48rem] border-collapse text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-right pb-3 px-1">#</th>
                  <th className="text-right pb-3 px-1">العميل</th>
                  <th className="text-right pb-3 px-1">المبلغ</th>
                  <th className="text-right pb-3 px-1">الاستحقاق</th>
                  <th className="text-right pb-3 px-1">الحالة</th>
                  <th className="text-right pb-3 px-1">بواسطة</th>
                  <th className="text-right pb-3 px-1 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="text-gray-300">
                    <td className="py-3 px-1 align-top text-gray-500">#{inv.id}</td>
                    <td className="py-3 px-1 align-top font-medium">{inv.client_name}</td>
                    <td className="py-3 px-1 align-top whitespace-nowrap">{Number(inv.amount).toLocaleString()} ج</td>
                    <td className="py-3 px-1 align-top text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : "—"}</td>
                    <td className="py-3 px-1 align-top">
                      {canEdit ? (
                        <select value={inv.status} onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${statusColor(inv.status)}`}>
                          <option value="pending">معلق</option>
                          <option value="paid">مدفوع</option>
                          <option value="overdue">متأخر</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColor(inv.status)}`}>
                          {statusLabel(inv.status)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-1 align-top text-gray-500 whitespace-nowrap">{inv.created_by_name || "—"}</td>
                    <td className="py-3 px-1 align-top">
                      <div className="inline-flex gap-3 flex-nowrap">
                        <button onClick={() => exportPDF(inv)}
                          className="text-gray-600 hover:text-amber-400 transition text-xs">PDF</button>
                        {canDelete && (
                          <button onClick={() => handleDelete(inv.id)}
                            className="text-gray-600 hover:text-red-400 transition text-xs">حذف</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
