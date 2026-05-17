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
}

interface Client {
  id: number;
  name: string;
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const Invoices = () => {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ client_id: "", amount: "", status: "pending", due_date: "" });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API}/api/invoices`, { headers });
      setInvoices(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/api/clients`, { headers });
      setClients(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchInvoices(); fetchClients(); }, []);

  const handleAdd = async () => {
    if (!form.client_id || !form.amount) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/invoices`, form, { headers });
      setForm({ client_id: "", amount: "", status: "pending", due_date: "" });
      setShowForm(false);
      fetchInvoices();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await axios.patch(`${API}/api/invoices/${id}`, { status }, { headers });
      fetchInvoices();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API}/api/invoices/${id}`, { headers });
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
          <h1 style="color: #217346; font-size: 28px; margin: 0;">V-ACCOUNTING</h1>
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
            <tr style="background: #217346; color: white;">
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
          <h3 style="color: #217346;">الإجمالي: ${Number(inv.amount).toLocaleString()} ج.م</h3>
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

  const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="p-8 space-y-6">

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>إجمالي الفواتير</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-warning)" }}>{total.toLocaleString()} ج</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>المدفوع</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-success)" }}>{paid.toLocaleString()} ج</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>المعلق</p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>{pending.toLocaleString()} ج</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>الفواتير</h3>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{invoices.length} فاتورة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "var(--color-accent)" }}>
            تصدير Excel ⬇
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="text-white text-sm px-4 py-2 rounded-lg transition" style={{ background: "#1a5c38" }}>
            + فاتورة جديدة
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 border space-y-4" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}>
          <h4 className="font-medium" style={{ color: "var(--color-text-primary)" }}>فاتورة جديدة</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>العميل *</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm">
                <option value="">اختر عميل</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>المبلغ *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm">
                <option value="pending">معلق</option>
                <option value="paid">مدفوع</option>
                <option value="overdue">متأخر</option>
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--color-text-secondary)" }}>تاريخ الاستحقاق</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                style={{ background: "var(--color-bg-input)", borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
                className="w-full border rounded-lg px-4 py-3 text-sm" />
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
        {invoices.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--color-text-muted)" }}>
            <p className="text-3xl mb-2">🧾</p>
            <p>لا توجد فواتير بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                <th className="text-right pb-3">#</th>
                <th className="text-right pb-3">العميل</th>
                <th className="text-right pb-3">المبلغ</th>
                <th className="text-right pb-3">الاستحقاق</th>
                <th className="text-right pb-3">الحالة</th>
                <th className="text-right pb-3"></th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--color-text-primary)" }}>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                  <td className="py-3" style={{ color: "var(--color-text-muted)" }}>#{inv.id}</td>
                  <td className="py-3 font-medium">{inv.client_name}</td>
                  <td className="py-3">{Number(inv.amount).toLocaleString()} ج</td>
                  <td className="py-3" style={{ color: "var(--color-text-muted)" }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : "—"}</td>
                  <td className="py-3">
                    <select value={inv.status} onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-full border-0 cursor-pointer font-medium"
                      style={{
                        background: inv.status === "paid" ? "var(--color-success-light)" : inv.status === "overdue" ? "var(--color-danger-light)" : "var(--color-warning-light)",
                        color: inv.status === "paid" ? "var(--color-success)" : inv.status === "overdue" ? "var(--color-danger)" : "var(--color-warning)",
                      }}>
                      <option value="pending">معلق</option>
                      <option value="paid">مدفوع</option>
                      <option value="overdue">متأخر</option>
                    </select>
                  </td>
                    <td className="py-3 flex gap-3">
                    <button onClick={() => exportPDF(inv)}
                      className="transition text-xs" style={{ color: "var(--color-text-muted)" }}>PDF</button>
                    {inv.client_name && (
                      <button onClick={() => {
                        const msg = encodeURIComponent(`فاتورة رقم #${inv.id}\nالعميل: ${inv.client_name}\nالمبلغ: ${Number(inv.amount).toLocaleString()} ج\nتاريخ الاستحقاق: ${inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : "—"}\n\nV-ACCOUNTING`);
                        const phone = prompt("رقم الهاتف (مع مفتاح الدولة):", "20");
                        if (phone) window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                      }}
                        className="transition text-xs" style={{ color: "var(--color-text-muted)" }}>📱 واتساب</button>
                    )}
                    <button onClick={() => handleDelete(inv.id)}
                      className="transition text-xs" style={{ color: "var(--color-text-muted)" }}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Invoices;
