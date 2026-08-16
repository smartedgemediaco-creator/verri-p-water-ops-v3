"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { showSuccess, showError } from "@/lib/toast";
import { PlusIcon, DollarLineIcon, BoxIconLine, ListIcon } from "@/icons";
import { useAuth } from "@/context/AuthContext";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import StaffAvatar from "@/components/ui/StaffAvatar";

interface PayrollRecord {
  _id: string;
  staffId: string;
  month: string;
  baseSalary: number;
  deductions: { absence: number; lateness: number; halfDay: number; debt: number; punishment: number; other: number };
  debtSettlements?: { amount: number; date?: string; note?: string }[];
  bonus: number;
  previousDebt: number;
  netPay: number;
  status: "pending" | "paid" | "partial";
  paidAmount: number;
  paidDate?: string;
  notes: string;
  staff?: { _id: string; name: string; phone: string; salary: number } | null;
  role?: string;
  department?: string;
  locationName?: string;
  previousMonth?: { debt: number; netPay: number; bonus: number; month: string; status: string };
  attendanceSync?: { absence: number; lateness: number; halfDay: number; syncedAt?: string };
}

interface Summary {
  totalStaff: number;
  totalBaseSalary: number;
  totalDeductions: number;
  totalBonus: number;
  totalNetPay: number;
  totalPaid: number;
  totalDebt: number;
  totalDebtSettled: number;
  totalDebtOutstanding: number;
  pendingCount: number;
  paidCount: number;
  partialCount: number;
}

interface MonthSummary {
  _id: string;
  count: number;
  totalBaseSalary: number;
  totalDeductions: number;
  totalBonus: number;
  totalNetPay: number;
  totalPaid: number;
  pendingCount: number;
  paidCount: number;
  partialCount: number;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-warning-50 dark:bg-warning-500/10", text: "text-warning-700 dark:text-warning-400", label: "Pending" },
  paid: { bg: "bg-success-50 dark:bg-success-500/10", text: "text-success-700 dark:text-success-400", label: "Paid" },
  partial: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", label: "Partial" },
};

const MONTHS = [
  { value: "2026-01", label: "January 2026" },
  { value: "2026-02", label: "February 2026" },
  { value: "2026-03", label: "March 2026" },
  { value: "2026-04", label: "April 2026" },
  { value: "2026-05", label: "May 2026" },
  { value: "2026-06", label: "June 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-08", label: "August 2026" },
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
];

function monthLabel(value: string) {
  const found = MONTHS.find((m) => m.value === value);
  if (found) return found.label;
  const [y, m] = value.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return value;
  return `${new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" })} ${y}`;
}

function AdjustField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [adjust, setAdjust] = useState("");
  const current = Number(value) || 0;

  const doAdd = () => {
    const amt = Number(adjust);
    if (!amt || amt <= 0) return;
    onChange(String(current + amt));
    setAdjust("");
  };
  const doRemove = () => {
    const amt = Number(adjust);
    if (!amt || amt <= 0) return;
    onChange(String(Math.max(0, current - amt)));
    setAdjust("");
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`text-sm font-bold ${current > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
          ₦{current.toLocaleString()}
        </span>
      </div>
      <div className="flex gap-1.5">
        <input
          type="number"
          placeholder="Amount"
          value={adjust}
          onChange={(e) => setAdjust(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } }}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
        />
        <button
          type="button"
          onClick={doAdd}
          disabled={!adjust || Number(adjust) <= 0}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={doRemove}
          disabled={!adjust || Number(adjust) <= 0}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          − Remove
        </button>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [staffList, setStaffList] = useState<{ _id: string; name: string; salary: number; avatar?: string | null; employmentType?: string; dailyRate?: number }[]>([]);

  const [showForm, setShowForm] = useState(false);
  const { ref, loading: pdfLoading, download } = usePdfDownload("salary-report", { title: "Payroll Report" });
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [formStaffId, setFormStaffId] = useState("");
  const [formMonth, setFormMonth] = useState(selectedMonth);
  const [formBaseSalary, setFormBaseSalary] = useState("");
  const [formAbsence, setFormAbsence] = useState("0");
  const [formLateness, setFormLateness] = useState("0");
  const [formHalfDay, setFormHalfDay] = useState("0");
  const [formDebt, setFormDebt] = useState("0");
  const [formPunishment, setFormPunishment] = useState("0");
  const [formOther, setFormOther] = useState("0");
  const [formBonus, setFormBonus] = useState("0");
  const [formPrevDebt, setFormPrevDebt] = useState(0);
  const [formStatus, setFormStatus] = useState("pending");
  const [formPaidAmount, setFormPaidAmount] = useState("0");
  const [formNotes, setFormNotes] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [formAttendanceSync, setFormAttendanceSync] = useState<{ absence: number; lateness: number; halfDay: number }>({ absence: 0, lateness: 0, halfDay: 0 });
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [payTarget, setPayTarget] = useState<PayrollRecord | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const [settleTarget, setSettleTarget] = useState<PayrollRecord | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [settling, setSettling] = useState(false);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedMonth) params.set("month", selectedMonth);
    if (filterStatus) params.set("status", filterStatus);
    fetch(`/api/payroll?${params}`)
      .then((r) => r.json())
      .then((data) => { setRecords(data.records ?? []); setSummary(data.summary ?? null); setMonthSummary(data.monthSummary ?? []); })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [selectedMonth, filterStatus]);

  useEffect(() => {     fetchRecords(); /* eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */ }, [fetchRecords]);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStaffList(data.map((s: { _id: string; name: string; salary?: number; avatar?: string; employmentType?: string; dailyRate?: number }) => ({ _id: s._id, name: s.name, salary: s.salary ?? 0, avatar: s.avatar ?? null, employmentType: s.employmentType, dailyRate: s.dailyRate ?? 0 })));
      })
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingRecord(null);
    setFormStaffId("");
    setFormMonth(selectedMonth);
    setFormBaseSalary("");
    setFormAbsence("0"); setFormLateness("0"); setFormHalfDay("0"); setFormDebt("0"); setFormPunishment("0"); setFormOther("0");
    setFormBonus("0"); setFormPrevDebt(0); setFormStatus("pending"); setFormPaidAmount("0"); setFormNotes("");
    setFormAttendanceSync({ absence: 0, lateness: 0, halfDay: 0 });
    setAutoFilled(false);
    setShowForm(true);
  };

  const openEdit = (record: PayrollRecord) => {
    setEditingRecord(record);
    setFormStaffId(record.staffId);
    setFormMonth(record.month);
    setFormBaseSalary(String(record.baseSalary));
    setFormAbsence(String(record.deductions?.absence ?? 0));
    setFormLateness(String(record.deductions?.lateness ?? 0));
    setFormHalfDay(String(record.deductions?.halfDay ?? 0));
    setFormDebt(String(record.deductions?.debt ?? 0));
    setFormPunishment(String(record.deductions?.punishment ?? 0));
    setFormOther(String(record.deductions?.other ?? 0));
    setFormBonus(String(record.bonus ?? 0));
    setFormPrevDebt(record.previousDebt ?? record.previousMonth?.debt ?? 0);
    setFormStatus(record.status);
    setFormPaidAmount(String(record.paidAmount ?? 0));
    setFormNotes(record.notes ?? "");
    setFormAttendanceSync({
      absence: record.attendanceSync?.absence ?? 0,
      lateness: record.attendanceSync?.lateness ?? 0,
      halfDay: record.attendanceSync?.halfDay ?? 0,
    });
    setAutoFilled(Boolean(record.attendanceSync?.syncedAt));
    setShowForm(true);
  };

  const computeNetPay = () => {
    const base = Number(formBaseSalary) || 0;
    const bonus = Number(formBonus) || 0;
    const deductions = (Number(formAbsence) || 0) + (Number(formLateness) || 0) + (Number(formHalfDay) || 0) + (Number(formDebt) || 0) + (Number(formPunishment) || 0) + (Number(formOther) || 0);
    return Math.round(base + bonus - deductions - formPrevDebt);
  };

  const totalDeductionsForm = (Number(formAbsence) || 0) + (Number(formLateness) || 0) + (Number(formHalfDay) || 0) + (Number(formDebt) || 0) + (Number(formPunishment) || 0) + (Number(formOther) || 0);

  const fetchPrevDebt = async (staffId: string, month: string) => {
    if (!staffId || !month) { setFormPrevDebt(0); return; }
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) { setFormPrevDebt(0); return; }
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/payroll?staffId=${staffId}&month=${prevMonth}&limit=1`);
      if (!res.ok) { setFormPrevDebt(0); return; }
      const data = await res.json();
      const prevRec = (data.records ?? [])[0];
      if (!prevRec) { setFormPrevDebt(0); return; }
      const pd = prevRec.deductions ?? {};
      const prevDeductions = (pd.absence ?? 0) + (pd.lateness ?? 0) + (pd.halfDay ?? 0) + (pd.debt ?? 0) + (pd.punishment ?? 0) + (pd.other ?? 0);
      const prevSettled = (prevRec.debtSettlements ?? []).reduce((sum: number, s: { amount?: number }) => sum + (s.amount ?? 0), 0);
      setFormPrevDebt(Math.round(Math.max(0, prevDeductions - prevSettled)));
    } catch { setFormPrevDebt(0); }
  };

  const handleStaffSelect = (staffId: string) => {
    setFormStaffId(staffId);
    const found = staffList.find((s) => s._id === staffId);
    if (found) setFormBaseSalary(String(found.salary));
    // Reset deductions so amounts from the previous staff never carry over.
    setFormAbsence("0"); setFormLateness("0"); setFormHalfDay("0");
    setFormDebt("0"); setFormPunishment("0"); setFormOther("0");
    setFormAttendanceSync({ absence: 0, lateness: 0, halfDay: 0 });
    setAutoFilled(false);
    fetchPrevDebt(staffId, formMonth);
  };

  const fetchAttendanceAmounts = async (staffId: string, month: string) => {
    // Single summary call without a location filter so staff assigned to
    // multiple factories/depots are never double-counted.
    const res = await fetch(`/api/attendance/summary?month=${month}`);
    if (!res.ok) return { absence: 0, lateness: 0, halfDay: 0 };
    const data = await res.json();
    const staffSummary = (data.summary || []).find((s: { staffId: string }) => s.staffId === staffId);
    if (!staffSummary) return { absence: 0, lateness: 0, halfDay: 0 };
    return {
      absence: staffSummary.totalAbsenceAmount || 0,
      lateness: staffSummary.totalLateAmount || 0,
      halfDay: staffSummary.totalHalfDayAmount || 0,
    };
  };

  const autoFillFromAttendance = async () => {
    if (!formStaffId || !formMonth) { showError("Select staff and month first"); return; }
    setAutoFilling(true);
    try {
      const amounts = await fetchAttendanceAmounts(formStaffId, formMonth);
      if (amounts.absence === 0 && amounts.lateness === 0 && amounts.halfDay === 0) {
        showError("No fine amounts recorded for this staff. Set ₦ amounts on the Attendance page first.");
        return;
      }
      // Only apply the DELTA on top of what was already synced, so a deduction is never added twice.
      const prevSync = formAttendanceSync;
      const manualAbsence = Math.max(0, (Number(formAbsence) || 0) - prevSync.absence);
      const manualLateness = Math.max(0, (Number(formLateness) || 0) - prevSync.lateness);
      const manualHalfDay = Math.max(0, (Number(formHalfDay) || 0) - prevSync.halfDay);
      setFormAbsence(String(manualAbsence + amounts.absence));
      setFormLateness(String(manualLateness + amounts.lateness));
      setFormHalfDay(String(manualHalfDay + amounts.halfDay));
      setFormAttendanceSync({ absence: amounts.absence, lateness: amounts.lateness, halfDay: amounts.halfDay });
      setAutoFilled(true);
      showSuccess(`Auto-filled from attendance: Absence ₦${amounts.absence.toLocaleString()}, Late ₦${amounts.lateness.toLocaleString()}, Half-Day ₦${amounts.halfDay.toLocaleString()}. Attendance deductions apply once.`);
    } catch { showError("Failed to auto-fill"); } finally { setAutoFilling(false); }
  };

  const submitForm = async () => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        staffId: formStaffId, month: formMonth, baseSalary: Number(formBaseSalary),
        deductions: {
          absence: Number(formAbsence) || 0, lateness: Number(formLateness) || 0,
          halfDay: Number(formHalfDay) || 0, debt: Number(formDebt) || 0, punishment: Number(formPunishment) || 0, other: Number(formOther) || 0,
        },
        bonus: Number(formBonus) || 0, previousDebt: formPrevDebt, status: formStatus, paidAmount: Number(formPaidAmount) || 0, notes: formNotes,
      };
      if (autoFilled) {
        body.attendanceSync = { ...formAttendanceSync, syncedAt: new Date().toISOString() };
      }
      const url = editingRecord ? `/api/payroll/${editingRecord._id}` : "/api/payroll";
      const res = await fetch(url, { method: editingRecord ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed" })); showError(err.error || "Failed to save"); return; }
      showSuccess(editingRecord ? "Salary record updated" : "Salary record created");
      setShowForm(false);
      fetchRecords();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/payroll/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) { showError("Failed to delete"); return; }
    showSuccess("Salary record deleted");
    setDeleteTarget(null); fetchRecords();
  };

  const doPay = async () => {
    if (!payTarget || !payAmount) return;
    setPaying(true);
    try {
      const newPaidAmount = payTarget.paidAmount + Number(payAmount);
      const newStatus = newPaidAmount >= payTarget.netPay ? "paid" : "partial";
      const res = await fetch(`/api/payroll/${payTarget._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: newPaidAmount, status: newStatus, paidDate: new Date().toISOString() }),
      });
      if (!res.ok) { showError("Failed to record payment"); return; }
      showSuccess("Payment recorded"); setPayTarget(null); setPayAmount(""); fetchRecords();
    } catch { showError("Network error"); } finally { setPaying(false); }
  };

  const monthTotalDed = (record: PayrollRecord) =>
    (record.deductions?.absence ?? 0) + (record.deductions?.lateness ?? 0) + (record.deductions?.halfDay ?? 0) + (record.deductions?.debt ?? 0) + (record.deductions?.punishment ?? 0) + (record.deductions?.other ?? 0);

  const debtSettledTotal = (record: PayrollRecord) =>
    (record.debtSettlements ?? []).reduce((sum, s) => sum + (s.amount ?? 0), 0);

  const debtOutstanding = (record: PayrollRecord) =>
    Math.max(0, monthTotalDed(record) - debtSettledTotal(record));

  const openSettle = (record: PayrollRecord) => {
    setSettleTarget(record);
    setSettleAmount("");
    setSettleNote("");
  };

  const doSettle = async () => {
    if (!settleTarget) return;
    const amount = Number(settleAmount) || 0;
    const outstanding = debtOutstanding(settleTarget);
    if (amount <= 0) { showError("Enter the amount settled"); return; }
    if (amount > outstanding) { showError(`Settled amount cannot exceed the outstanding debt of ₦${outstanding.toLocaleString()}`); return; }
    setSettling(true);
    try {
      const updated = {
        debtSettlements: [...(settleTarget.debtSettlements ?? []), { amount, date: new Date().toISOString(), note: settleNote }],
      };
      const res = await fetch(`/api/payroll/${settleTarget._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed" })); showError(err.error || "Failed to record settlement"); return; }
      showSuccess(`₦${amount.toLocaleString()} settled against debt for ${settleTarget.staff?.name ?? "staff"}`);
      setSettleTarget(null); setSettleAmount(""); setSettleNote("");
      fetchRecords();
    } catch { showError("Network error"); } finally { setSettling(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Salary" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
            New Salary Record
          </Button>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <DollarLineIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
          <AutoAmount value={`₦${((summary?.totalNetPay ?? 0) - (summary?.totalPaid ?? 0)).toLocaleString()}`} className="text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-gray-400 mt-0.5">This month&apos;s net pay not yet paid</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Net Pay</p>
          <AutoAmount value={`₦${(summary?.totalNetPay ?? 0).toLocaleString()}`} className="text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-gray-400 mt-0.5">{summary?.totalStaff ?? 0} staff · this month only</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <DollarLineIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
          <AutoAmount value={`₦${(summary?.totalPaid ?? 0).toLocaleString()}`} className="text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-gray-400 mt-0.5">{summary?.paidCount ?? 0} paid</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <BoxIconLine className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Deductions</p>
          <AutoAmount value={`₦${(summary?.totalDeductions ?? 0).toLocaleString()}`} className="text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-gray-400 mt-0.5">This month only</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5">
          <div className="flex items-center justify-center w-10 h-10 bg-rose-100 rounded-lg dark:bg-rose-500/10 mb-3">
            <DollarLineIcon className="text-rose-600 size-5 dark:text-rose-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Debt (This Month)</p>
          <AutoAmount value={`₦${(summary?.totalDebtOutstanding ?? 0).toLocaleString()}`} className="text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-gray-400 mt-0.5">
            ₦{(summary?.totalDebtSettled ?? 0).toLocaleString()} settled of ₦{(summary?.totalDebt ?? 0).toLocaleString()} · use the settle link on each record
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <DollarLineIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Bonuses</p>
          <AutoAmount value={`₦${(summary?.totalBonus ?? 0).toLocaleString()}`} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-3">
            <ListIcon className="text-amber-600 size-5 dark:text-amber-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{summary?.pendingCount ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">₦{((summary?.totalNetPay ?? 0) - (summary?.totalPaid ?? 0)).toLocaleString()} outstanding</p>
        </div>
      </div>

      {monthSummary.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Months</h3>
            <p className="text-xs text-gray-400">Each card is isolated to its own month — tap to view</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {monthSummary.map((ms) => {
              const selected = ms._id === selectedMonth;
              const paid = ms.totalPaid ?? 0;
              const net = ms.totalNetPay ?? 0;
              const pct = net > 0 ? Math.min(100, Math.round((paid / net) * 100)) : 0;
              return (
                <button
                  key={ms._id}
                  onClick={() => { setFilterStatus(""); setSelectedMonth(ms._id); }}
                  className={`min-w-[190px] shrink-0 text-left rounded-xl p-4 border transition-all ${
                    selected
                      ? "bg-brand-50 dark:bg-brand-500/10 border-brand-300 dark:border-brand-500/40 ring-2 ring-brand-500/20"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${selected ? "text-brand-700 dark:text-brand-300" : "text-gray-800 dark:text-white/90"}`}>
                      {monthLabel(ms._id)}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selected ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {ms.count} rec{ms.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className={`mt-2 text-lg font-bold ${selected ? "text-brand-700 dark:text-brand-300" : "text-gray-800 dark:text-white/90"}`}>
                    ₦{(paid ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400">paid to date · of ₦{(net ?? 0).toLocaleString()} net</p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded-full ${net > 0 && paid >= net ? "bg-success-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select options={MONTHS} value={selectedMonth} onChange={setSelectedMonth} placeholder="Select Month" />
          <Select
            options={[{ value: "", label: "All Statuses" }, { value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }, { value: "partial", label: "Partial" }]}
            value={filterStatus} onChange={setFilterStatus} placeholder="Filter by status"
          />
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={() => { setFilterStatus(""); setSelectedMonth(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`); }}>Reset</Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Salary Records — {monthLabel(selectedMonth)}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {records.length} records | ₦{(summary?.totalNetPay ?? 0).toLocaleString()} total net pay · this month only
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Net Pay = Salary − Deductions − Prev Debt + Bonus · Prev Debt = last month&apos;s outstanding deductions (one month back policy).
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Staff</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Role</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Base Salary</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Deductions</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Bonus</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Prev Debt</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Prev Pay</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Debt (Month)</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Net Pay</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={11}>Loading...</TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={11}>No salary records for this month. Click &quot;New Salary Record&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              records.map((record) => {
                const badge = STATUS_BADGES[record.status] ?? STATUS_BADGES.pending;
                const totalDed = monthTotalDed(record);
                return (
                  <TableRow key={record._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3">
                      <div>
                        <Link href={`/staff/${record.staffId}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          {record.staff?.name ?? "Unknown"}
                        </Link>
                        {record.department && <p className="text-xs text-gray-400 capitalize">{record.department}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{record.role || "—"}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">₦{record.baseSalary.toLocaleString()}</TableCell>
                    <TableCell className="py-3">
                      <div className="text-theme-sm text-red-600 dark:text-red-400">
                        ₦{totalDed.toLocaleString()}
                        {totalDed > 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {record.deductions?.absence ? `Absence: ₦${record.deductions.absence.toLocaleString()} ` : ""}
                            {record.deductions?.lateness ? `Late: ₦${record.deductions.lateness.toLocaleString()} ` : ""}
                            {record.deductions?.halfDay ? `Half-Day: ₦${record.deductions.halfDay.toLocaleString()} ` : ""}
                            {record.deductions?.debt ? `Debt: ₦${record.deductions.debt.toLocaleString()} ` : ""}
                            {record.deductions?.punishment ? `Punish: ₦${record.deductions.punishment.toLocaleString()} ` : ""}
                            {record.deductions?.other ? `Other: ₦${record.deductions.other.toLocaleString()}` : ""}
                          </div>
                        )}
                        {record.attendanceSync?.syncedAt && (
                          <span className="inline-flex items-center mt-1 text-[10px] font-medium text-brand-600 dark:text-brand-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 mr-1" />
                            Synced from attendance
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-success-600 dark:text-success-400">{record.bonus > 0 ? `₦${record.bonus.toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="py-3">
                      {(() => {
                        const prevDebt = record.previousDebt ?? record.previousMonth?.debt ?? 0;
                        const prevLabel = record.previousMonth?.month ? monthLabel(record.previousMonth.month) : "";
                        return prevDebt > 0 ? (
                          <div className="text-theme-sm font-medium text-red-600 dark:text-red-400">
                            ₦{prevDebt.toLocaleString()}
                            {prevLabel && (
                              <div className="text-[10px] font-normal text-gray-400 mt-0.5">owed from {prevLabel}</div>
                            )}
                          </div>
                        ) : "—";
                      })()}
                    </TableCell>
                    <TableCell className="py-3">
                      {(() => {
                        const prevPay = record.previousMonth?.netPay ?? 0;
                        const prevLabel = record.previousMonth?.month ? monthLabel(record.previousMonth.month) : "";
                        return prevPay > 0 ? (
                          <div className="text-theme-sm text-gray-600 dark:text-gray-300">
                            ₦{prevPay.toLocaleString()}
                            {prevLabel && (
                              <div className="text-[10px] text-gray-400 mt-0.5">{prevLabel}</div>
                            )}
                          </div>
                        ) : "—";
                      })()}
                    </TableCell>
                    <TableCell className="py-3">
                      {(() => {
                        const monthDebt = totalDed;
                        if (monthDebt <= 0) return "—";
                        const settled = debtSettledTotal(record);
                        const outstanding = Math.max(0, monthDebt - settled);
                        return (
                          <div>
                            <span className="text-theme-sm font-medium text-red-600 dark:text-red-400">
                              ₦{monthDebt.toLocaleString()}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {settled > 0 ? `₦${settled.toLocaleString()} settled · ` : ""}
                              ₦{outstanding.toLocaleString()} left
                            </div>
                            <button onClick={() => openSettle(record)}
                              className="text-[10px] font-medium text-brand-600 dark:text-brand-400 hover:underline">
                              settle
                            </button>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">₦{record.netPay.toLocaleString()}</TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      {record.status !== "paid" && record.paidAmount > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">₦{record.paidAmount.toLocaleString()} paid</p>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1.5 items-center flex-wrap">
                        {record.status !== "paid" && (
                          <button onClick={() => { setPayTarget(record); setPayAmount(String(record.netPay - record.paidAmount)); }}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-500/10 dark:text-success-400 dark:hover:bg-success-500/20 transition-colors">
                            Pay
                          </button>
                        )}
                        <button onClick={() => openEdit(record)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                          Edit
                        </button>
                        {isAdmin && (
                          <button onClick={() => setDeleteTarget(record._id)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{editingRecord ? "Edit Salary Record" : "New Salary Record"}</h3>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Staff</label>
                <div className="flex items-center gap-3">
                  {formStaffId && (() => {
                    const found = staffList.find((s) => s._id === formStaffId);
                    return found ? <StaffAvatar src={found.avatar} name={found.name} size="sm" /> : null;
                  })()}
                  <div className="flex-1">
                    <Select options={staffList.map((s) => ({ value: s._id, label: s.name }))} placeholder="Select staff" value={formStaffId} onChange={handleStaffSelect} className={editingRecord ? "opacity-50" : ""} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                <Select options={MONTHS} value={formMonth} onChange={(m) => {
                  setFormMonth(m);
                  // Reset deductions so previous month's amounts never carry over.
                  setFormAbsence("0"); setFormLateness("0"); setFormHalfDay("0");
                  setFormDebt("0"); setFormPunishment("0"); setFormOther("0");
                  setFormAttendanceSync({ absence: 0, lateness: 0, halfDay: 0 });
                  setAutoFilled(false);
                  fetchPrevDebt(formStaffId, m);
                }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Salary (₦)</label>
                <InputField type="number" id="baseSalary" value={formBaseSalary} onChange={(e) => setFormBaseSalary(e.target.value)} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Deductions</label>
                  <button type="button" onClick={autoFillFromAttendance} disabled={autoFilling || !formStaffId || !formMonth}
                    className="text-[10px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    {autoFilling ? "Loading..." : "Auto-fill from Attendance"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <AdjustField label="Absence" value={formAbsence} onChange={setFormAbsence} />
                  <AdjustField label="Lateness" value={formLateness} onChange={setFormLateness} />
                  <AdjustField label="Half-Day" value={formHalfDay} onChange={setFormHalfDay} />
                  <AdjustField label="Debt" value={formDebt} onChange={setFormDebt} />
                  <AdjustField label="Punishment" value={formPunishment} onChange={setFormPunishment} />
                  <AdjustField label="Other" value={formOther} onChange={setFormOther} />
                </div>
                {(autoFilled || editingRecord?.attendanceSync?.syncedAt) && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    Attendance sync: Absence ₦{(formAttendanceSync.absence ?? 0).toLocaleString()} · Late ₦{(formAttendanceSync.lateness ?? 0).toLocaleString()} · Half-Day ₦{(formAttendanceSync.halfDay ?? 0).toLocaleString()}.
                    Auto-fill never double-adds (delta-based) — every field stays editable and Net Pay recalculates automatically.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bonus</label>
                <AdjustField label="Bonus" value={formBonus} onChange={setFormBonus} />
              </div>

              <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-700 dark:text-brand-300">Net Pay</span>
                  <span className="text-xl font-bold text-brand-700 dark:text-brand-300">₦{computeNetPay().toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-brand-500 dark:text-brand-400">
                  <span>Salary: ₦{(Number(formBaseSalary) || 0).toLocaleString()}</span>
                  <span>+ Bonus: ₦{(Number(formBonus) || 0).toLocaleString()}</span>
                  <span>− Deductions: ₦{totalDeductionsForm.toLocaleString()}</span>
                  <span>− Prev Debt: ₦{formPrevDebt.toLocaleString()}</span>
                </div>
              </div>

              {editingRecord && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <Select options={[{ value: "pending", label: "Pending" }, { value: "partial", label: "Partial" }, { value: "paid", label: "Paid" }]} value={formStatus} onChange={setFormStatus} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paid Amount (₦)</label>
                    <InputField type="number" id="paidAmount" value={formPaidAmount} onChange={(e) => setFormPaidAmount(e.target.value)} />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" rows={2} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <Button variant="primary" onClick={submitForm} disabled={submitting || !formStaffId}>
                {submitting ? "Saving..." : editingRecord ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPayTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Record Payment</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Staff:</span>
                <span className="font-medium text-gray-800 dark:text-white">{payTarget.staff?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Net Pay:</span>
                <span className="font-medium text-gray-800 dark:text-white">₦{payTarget.netPay.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Already Paid:</span>
                <span className="font-medium text-success-600">₦{payTarget.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Balance:</span>
                <span className="font-bold text-red-600">₦{(payTarget.netPay - payTarget.paidAmount).toLocaleString()}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Amount (₦)</label>
              <InputField type="number" id="payAmount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={doPay} disabled={paying || !payAmount || Number(payAmount) <= 0}>
                {paying ? "Processing..." : "Record Payment"}
              </Button>
              <Button variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Debt Modal */}
      {settleTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSettleTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Settle Debt</h3>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Staff:</span>
                <span className="font-medium text-gray-800 dark:text-white">{settleTarget.staff?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Month:</span>
                <span className="font-medium text-gray-800 dark:text-white">{monthLabel(settleTarget.month)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Debt:</span>
                <span className="font-medium text-red-600">₦{monthTotalDed(settleTarget).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Settled So Far:</span>
                <span className="font-medium text-success-600">₦{debtSettledTotal(settleTarget).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Outstanding:</span>
                <span className="font-bold text-red-600">₦{debtOutstanding(settleTarget).toLocaleString()}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Settled (₦)</label>
              <InputField type="number" id="settleAmount" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
              <InputField type="text" id="settleNote" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="e.g. cash payment" />
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={doSettle} disabled={settling || !settleAmount || Number(settleAmount) <= 0}>
                {settling ? "Saving..." : "Record Settlement"}
              </Button>
              <Button variant="outline" onClick={() => setSettleTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Salary Record"
        message="This will permanently delete this salary record. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
