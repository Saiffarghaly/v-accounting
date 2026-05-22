import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface Employee {
  id: number;
  name: string;
  phone: string;
  salary: number;
  notes: string;
}

interface Payment {
  id: number;
  employee_id: number;
  employee_name: string;
  amount: number;
  month: string;
  date: string;
  notes: string;
}

interface Loan {
  id: number;
  employee_id: number;
  employee_name: string;
  amount: number;
  remaining: number;
  description: string;
  date: string;
  status: string;
}

interface LoanPayment {
  id: number;
  loan_id: number;
  amount: number;
  date: string;
}

interface Report {
  month: string;
  total_employees: number;
  total_salaries: number;
  total_paid: number;
  total_remaining: number;
  details: {
    employee_id: number;
    employee_name: string;
    salary: number;
    paid: number;
    remaining: number;
  }[];
}

const API = import.meta.env.VITE_API_URL || "https://v-accounting-production.up.railway.app";

const Salaries = () => {
  const { token, canEdit } = useAuth();
  const [tab, setTab] = useState<"employees" | "pay" | "report" | "loans">("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanPayments, setSelectedLoanPayments] = useState<LoanPayment[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  // Add employee form
  const [empForm, setEmpForm] = useState({ name: "", phone: "", salary: "", notes: "" });

  // Pay salary form
  const [payForm, setPayForm] = useState({
    employee_id: "", amount: "", month: new Date().toISOString().slice(0, 7),
    date: new Date().toISOString().split("T")[0], notes: ""
  });
  const [loanDeductions, setLoanDeductions] = useState<{ loan_id: number; amount: string }[]>([]);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);

  // Add loan form
  const [loanForm, setLoanForm] = useState({ employee_id: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] });

  // Report month
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  const headers = { Authorization: `Bearer ${token}` };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/api/salaries/employees`, { headers });
      setEmployees(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API}/api/salaries/payments`, { headers });
      setPayments(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchLoans = async () => {
    try {
      const res = await axios.get(`${API}/api/employee-loans`, { headers });
      setLoans(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchLoanPayments = async (loanId: number) => {
    try {
      const res = await axios.get(`${API}/api/employee-loans/${loanId}/payments`, { headers });
      setSelectedLoanPayments(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchReport = async (month: string) => {
    try {
      const res = await axios.get(`${API}/api/salaries/report/${month}`, { headers });
      setReport(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchEmployees(); fetchLoans(); }, []);

  const handleAddEmployee = async () => {
    if (!empForm.name) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/salaries/employees`, empForm, { headers });
      setEmpForm({ name: "", phone: "", salary: "", notes: "" });
      fetchEmployees();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDeleteEmployee = async (id: number) => {
    try {
      await axios.delete(`${API}/api/salaries/employees/${id}`, { headers });
      fetchEmployees();
    } catch (err) { console.error(err); }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const emp = employees.find(x => x.id === Number(employeeId));
    const empLoans = loans.filter(l => l.employee_id === Number(employeeId) && l.status === "active");
    setActiveLoans(empLoans);
    setLoanDeductions(empLoans.map(l => ({ loan_id: l.id, amount: "0" })));
    setPayForm({ ...payForm, employee_id: employeeId, amount: emp ? String(emp.salary) : "" });
  };

  const handlePaySalary = async () => {
    if (!payForm.employee_id || !payForm.amount) return;
    setLoading(true);
    try {
      const deductions = loanDeductions.filter(d => Number(d.amount) > 0).map(d => ({ loan_id: d.loan_id, amount: Number(d.amount) }));
      await axios.post(`${API}/api/salaries/payments`, { ...payForm, loan_deductions: deductions.length > 0 ? deductions : undefined }, { headers });
      setPayForm({
        employee_id: "", amount: "", month: new Date().toISOString().slice(0, 7),
        date: new Date().toISOString().split("T")[0], notes: ""
      });
      setActiveLoans([]);
      setLoanDeductions([]);
      fetchEmployees();
      fetchPayments();
      fetchLoans();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddLoan = async () => {
    if (!loanForm.employee_id || !loanForm.amount) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/employee-loans`, loanForm, { headers });
      setLoanForm({ employee_id: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      fetchLoans();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalDeductions = loanDeductions.reduce((s, d) => s + Number(d.amount || 0), 0);
  const netAmount = Number(payForm.amount || 0) - totalDeductions;

  const tabs = [
    { id: "employees" as const, label: "قائمة الموظفين", icon: "👨‍💼" },
    { id: "pay" as const, label: "صرف الرواتب", icon: "💰" },
    { id: "loans" as const, label: "السلف والخصمات", icon: "💳" },
    { id: "report" as const, label: "تقرير شهر", icon: "📊" },
  ];

  return (
    <div className="p-8 space-y-6">

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl p-1" style={{ background: "#f0f0f0" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "pay") fetchPayments(); if (t.id === "report") fetchReport(reportMonth); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? "#ffffff" : "transparent",
              color: tab === t.id ? "#217346" : "#888",
              boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: قائمة الموظفين */}
      {tab === "employees" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border space-y-4" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold" style={{ color: "#1a1a1a" }}>إضافة موظف جديد</h4>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>اسم الموظف *</label>
              <input type="text" value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                placeholder="اسم الموظف" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>رقم الهاتف</label>
              <input type="tel" value={empForm.phone}
                onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                placeholder="01000000000" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>الراتب الشهري</label>
              <input type="number" value={empForm.salary}
                onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })}
                placeholder="0" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>ملاحظات</label>
              <input type="text" value={empForm.notes}
                onChange={(e) => setEmpForm({ ...empForm, notes: e.target.value })}
                placeholder="ملاحظات" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <button onClick={handleAddEmployee} disabled={loading || !empForm.name}
              className="text-white text-sm px-6 py-2.5 rounded-lg transition w-full"
              style={{ background: loading || !empForm.name ? "#81c784" : "#217346" }}>
              {loading ? "جاري الحفظ..." : "حفظ الموظف"}
            </button>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>قائمة الموظفين</h4>
            {employees.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا يوجد موظفين بعد</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#f9f9f9" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: "#217346" }}>{emp.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#333" }}>{emp.name}</p>
                        <p className="text-xs" style={{ color: "#888" }}>{emp.phone || "—"} · {Number(emp.salary).toLocaleString()} ج/شهر</p>
                      </div>
                    </div>
                    {canEdit && (
                      <button onClick={() => handleDeleteEmployee(emp.id)}
                        className="text-xs transition" style={{ color: "#bbb" }}
                        onMouseOver={e => (e.currentTarget.style.color = "#c62828")}
                        onMouseOut={e => (e.currentTarget.style.color = "#bbb")}>
                        حذف
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: صرف الرواتب */}
      {tab === "pay" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border space-y-4" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold" style={{ color: "#1a1a1a" }}>صرف راتب</h4>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>الموظف *</label>
              <select value={payForm.employee_id}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}>
                <option value="">اختر الموظف</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} — {Number(emp.salary).toLocaleString()} ج</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>المبلغ *</label>
                <input type="number" value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  placeholder="0" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>الشهر *</label>
                <input type="month" value={payForm.month}
                  onChange={(e) => setPayForm({ ...payForm, month: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>التاريخ</label>
                <input type="date" value={payForm.date}
                  onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
              <div>
                <label className="text-sm mb-1 block" style={{ color: "#555" }}>ملاحظات</label>
                <input type="text" value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="ملاحظات" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
              </div>
            </div>

            {/* Active loans / deductions */}
            {activeLoans.length > 0 && (
              <div className="rounded-lg p-4 space-y-3" style={{ background: "#fff8e1", border: "1px solid #ffe082" }}>
                <p className="text-sm font-semibold" style={{ color: "#e65100" }}>السلف النشطة - أدخل مبلغ الخصم لكل سلفة</p>
                {activeLoans.map((l, i) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs" style={{ color: "#555" }}>{l.description || "سلفة"} — المتبقي: {Number(l.remaining).toLocaleString()} ج</p>
                    </div>
                    <input type="number" value={loanDeductions[i]?.amount || "0"} min="0" max={l.remaining}
                      onChange={(e) => {
                        const updated = [...loanDeductions];
                        updated[i] = { ...updated[i], amount: e.target.value };
                        setLoanDeductions(updated);
                      }}
                      className="w-28 rounded-lg px-3 py-2 text-sm text-center focus:outline-none"
                      style={{ background: "#fff", border: "1px solid #ddd", color: "#333" }}
                      placeholder="الخصم" />
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: "#ffe082" }}>
                  <span className="text-sm" style={{ color: "#555" }}>إجمالي الخصم</span>
                  <span className="text-sm font-bold" style={{ color: "#c62828" }}>{totalDeductions.toLocaleString()} ج</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "#555" }}>الصافي المستلم</span>
                  <span className="text-sm font-bold" style={{ color: netAmount >= 0 ? "#217346" : "#c62828" }}>
                    {netAmount.toLocaleString()} ج
                  </span>
                </div>
              </div>
            )}

            <button onClick={handlePaySalary} disabled={loading || !payForm.employee_id || !payForm.amount || netAmount < 0}
              className="text-white text-sm px-6 py-2.5 rounded-lg transition w-full"
              style={{ background: loading || !payForm.employee_id || !payForm.amount || netAmount < 0 ? "#81c784" : "#217346" }}>
              {loading ? "جاري الحفظ..." : "صرف الراتب"}
            </button>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>آخر عمليات الصرف</h4>
            {payments.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا توجد عمليات صرف بعد</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#f9f9f9" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#333" }}>{p.employee_name}</p>
                      <p className="text-xs" style={{ color: "#888" }}>{p.month} · {new Date(p.date).toLocaleDateString('ar-EG')}</p>
                      {p.notes && <p className="text-xs" style={{ color: "#aaa" }}>{p.notes}</p>}
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#c62828" }}>
                      {Number(p.amount).toLocaleString()} ج
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: السلف والخصمات */}
      {tab === "loans" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-6 border space-y-4" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold" style={{ color: "#1a1a1a" }}>إضافة سلفة جديدة</h4>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>الموظف *</label>
              <select value={loanForm.employee_id}
                onChange={(e) => setLoanForm({ ...loanForm, employee_id: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }}>
                <option value="">اختر الموظف</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>المبلغ *</label>
              <input type="number" value={loanForm.amount}
                onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                placeholder="0" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>البيان</label>
              <input type="text" value={loanForm.description}
                onChange={(e) => setLoanForm({ ...loanForm, description: e.target.value })}
                placeholder="سبب السلفة" className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#555" }}>التاريخ</label>
              <input type="date" value={loanForm.date}
                onChange={(e) => setLoanForm({ ...loanForm, date: e.target.value })}
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
            </div>
            <button onClick={handleAddLoan} disabled={loading || !loanForm.employee_id || !loanForm.amount}
              className="text-white text-sm px-6 py-2.5 rounded-lg transition w-full"
              style={{ background: loading || !loanForm.employee_id || !loanForm.amount ? "#81c784" : "#217346" }}>
              {loading ? "جاري الحفظ..." : "حفظ السلفة"}
            </button>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
            <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>السلف النشطة</h4>
            {loans.filter(l => l.status === "active").length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا توجد سلف نشطة</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {loans.filter(l => l.status === "active").map(l => (
                  <div key={l.id} className="p-3 rounded-lg cursor-pointer transition"
                    style={{ background: selectedLoanId === l.id ? "#e8f5e9" : "#f9f9f9" }}
                    onClick={() => { setSelectedLoanId(l.id); fetchLoanPayments(l.id); }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#333" }}>{l.employee_name}</p>
                        <p className="text-xs" style={{ color: "#888" }}>{l.description || "سلفة"} · {new Date(l.date).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold" style={{ color: "#e65100" }}>{Number(l.remaining).toLocaleString()} ج</p>
                        <p className="text-xs" style={{ color: "#aaa" }}>من {Number(l.amount).toLocaleString()} ج</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedLoanId && selectedLoanPayments.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "#e0e0e0" }}>
                <h5 className="text-sm font-semibold mb-3" style={{ color: "#555" }}>تاريخ الخصم</h5>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {selectedLoanPayments.map(lp => (
                    <div key={lp.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "#f5f5f5" }}>
                      <span className="text-xs" style={{ color: "#888" }}>{new Date(lp.date).toLocaleDateString('ar-EG')}</span>
                      <span className="text-sm font-bold" style={{ color: "#c62828" }}>{Number(lp.amount).toLocaleString()} ج</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: تقرير شهر */}
      {tab === "report" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium" style={{ color: "#555" }}>اختر الشهر:</label>
            <input type="month" value={reportMonth}
              onChange={(e) => { setReportMonth(e.target.value); fetchReport(e.target.value); }}
              className="rounded-lg px-4 py-2 text-sm focus:outline-none"
              style={{ background: "#f9f9f9", border: "1px solid #ddd", color: "#333" }} />
          </div>

          {report && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                  <p className="text-sm mb-1" style={{ color: "#888" }}>عدد الموظفين</p>
                  <p className="text-2xl font-bold" style={{ color: "#217346" }}>{report.total_employees}</p>
                </div>
                <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                  <p className="text-sm mb-1" style={{ color: "#888" }}>إجمالي الرواتب</p>
                  <p className="text-2xl font-bold" style={{ color: "#1565c0" }}>{report.total_salaries.toLocaleString()} ج</p>
                </div>
                <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                  <p className="text-sm mb-1" style={{ color: "#888" }}>تم الصرف</p>
                  <p className="text-2xl font-bold" style={{ color: "#217346" }}>{report.total_paid.toLocaleString()} ج</p>
                </div>
                <div className="rounded-xl p-5 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                  <p className="text-sm mb-1" style={{ color: "#888" }}>المتبقي</p>
                  <p className="text-2xl font-bold" style={{ color: report.total_remaining > 0 ? "#c62828" : "#217346" }}>
                    {report.total_remaining.toLocaleString()} ج
                  </p>
                </div>
              </div>

              <div className="rounded-xl p-6 border" style={{ background: "#ffffff", borderColor: "#e0e0e0" }}>
                <h4 className="font-semibold mb-4" style={{ color: "#1a1a1a" }}>تفاصيل رواتب شهر {report.month}</h4>
                {report.details.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: "#bbb" }}>لا يوجد موظفين</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table dir="rtl" lang="ar" className="w-full min-w-[40rem] border-collapse text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                          <th className="text-right pb-3 px-1" style={{ color: "#888" }}>الموظف</th>
                          <th className="text-right pb-3 px-1" style={{ color: "#888" }}>الراتب</th>
                          <th className="text-right pb-3 px-1" style={{ color: "#888" }}>تم الصرف</th>
                          <th className="text-right pb-3 px-1" style={{ color: "#888" }}>المتبقي</th>
                          <th className="text-right pb-3 px-1" style={{ color: "#888" }}>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.details.map(d => (
                          <tr key={d.employee_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td className="py-3 px-1 align-top font-medium" style={{ color: "#333" }}>{d.employee_name}</td>
                            <td className="py-3 px-1 align-top" style={{ color: "#555" }}>{d.salary.toLocaleString()} ج</td>
                            <td className="py-3 px-1 align-top" style={{ color: "#217346" }}>{d.paid.toLocaleString()} ج</td>
                            <td className="py-3 px-1 align-top" style={{ color: d.remaining > 0 ? "#c62828" : "#217346" }}>{d.remaining.toLocaleString()} ج</td>
                            <td className="py-3 px-1 align-top">
                              <span className="text-xs px-2 py-1 rounded-full" style={{
                                background: d.remaining <= 0 ? "#e8f5e9" : "#fff3e0",
                                color: d.remaining <= 0 ? "#217346" : "#e65100"
                              }}>
                                {d.remaining <= 0 ? "تم الصرف" : "متبقي"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {!report && (
            <div className="rounded-xl p-12 border flex items-center justify-center" style={{ background: "#fafafa", borderColor: "#e0e0e0" }}>
              <p className="text-sm" style={{ color: "#bbb" }}>اختر شهر لعرض التقرير</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Salaries;
