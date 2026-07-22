"use client";

import { useEffect, useState, useCallback, useMemo, use } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { ChevronLeftIcon, PlusIcon, CloseIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";

interface StaffInfo {
  _id: string;
  name: string;
  phone: string;
  dealPrice: number;
}

interface StaffRecord {
  _id: string;
  date: string;
  stockLoaded: number;
  stockReturned: number;
  dealPrice: number;
  expectedAmount: number;
  transferredBy: string;
  amountTransferred: number;
  cashPaid: number;
  deficit: number;
  debtPaid: number;
  debtPayer: string;
  debtors: string;
  debt: number;
  totalPaid: number;
  totalOwed: number;
  notes: string;
}

interface AllStaffOption {
  _id: string;
  name: string;
  totalOwed: number;
}

const ROWS_PER_PAGE = 15;

export default function CommissionedStaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [allStaff, setAllStaff] = useState<AllStaffOption[]>([]);
  const [selectedId, setSelectedId] = useState(id);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formStockLoaded, setFormStockLoaded] = useState("");
  const [formStockReturned, setFormStockReturned] = useState("0");
  const [formTransferredBy, setFormTransferredBy] = useState("");
  const [formAmountTransferred, setFormAmountTransferred] = useState("");
  const [formCashPaid, setFormCashPaid] = useState("");
  const [formDebtPaid, setFormDebtPaid] = useState("");
  const [formDebtPayer, setFormDebtPayer] = useState("");
  const [formDebtors, setFormDebtors] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string>("");
  const [editValue, setEditValue] = useState("");

  const fetchStaffData = useCallback(async (staffId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/commissioned-staffs/${staffId}`);
      if (!res.ok) { showError("Staff not found"); return; }
      const data = await res.json();
      setStaffInfo(data);
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch {
      showError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/commissioned-staffs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllStaff(data.map((s: StaffInfo & { totalOwed: number }) => ({ _id: s._id, name: s.name, totalOwed: s.totalOwed || 0 })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchStaffData(selectedId); setPage(1); }, [selectedId, fetchStaffData]);

  const sortedRecords = useMemo(() =>
    [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [records]
  );

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / ROWS_PER_PAGE));
  const pagedRecords = sortedRecords.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const totals = useMemo(() => records.reduce(
    (acc, r) => ({
      stockLoaded: acc.stockLoaded + (r.stockLoaded || 0),
      stockReturned: acc.stockReturned + (r.stockReturned || 0),
      expectedAmount: acc.expectedAmount + (r.expectedAmount || 0),
      amountTransferred: acc.amountTransferred + (r.amountTransferred || 0),
      cashPaid: acc.cashPaid + (r.cashPaid || 0),
      deficit: acc.deficit + (r.deficit || 0),
      debtPaid: acc.debtPaid + (r.debtPaid || 0),
      debt: acc.debt + (r.debt || 0),
    }),
    { stockLoaded: 0, stockReturned: 0, expectedAmount: 0, amountTransferred: 0, cashPaid: 0, deficit: 0, debtPaid: 0, debt: 0 }
  ), [records]);

  const createRecord = async () => {
    if (!formStockLoaded) { showError("Stock loaded is required"); return; }
    const loaded = Number(formStockLoaded) || 0;
    const returned = Number(formStockReturned) || 0;
    const price = staffInfo?.dealPrice || 0;
    const expected = (loaded - returned) * price;
    const transferred = Number(formAmountTransferred) || 0;
    const cash = Number(formCashPaid) || 0;
    const debtPd = Number(formDebtPaid) || 0;

    setSubmitting(true);
    try {
      const res = await fetch("/api/commissioned-staff-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedId,
          date: formDate,
          stockLoaded: loaded,
          stockReturned: returned,
          transferredBy: formTransferredBy,
          amountTransferred: transferred,
          cashPaid: cash,
          debtPaid: debtPd,
          debtPayer: formDebtPayer,
          debtors: formDebtors,
          notes: formNotes,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Record created");
      setShowAddModal(false);
      resetForm();
      fetchStaffData(selectedId);
    } catch {
      showError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const updateRecord = async (recordId: string, field: string, value: string | number) => {
    try {
      const body: Record<string, unknown> = { [field]: value };
      const res = await fetch(`/api/commissioned-staff-records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showError("Failed to update"); return; }
      showSuccess("Updated");
      setEditingId(null);
      fetchStaffData(selectedId);
    } catch {
      showError("Something went wrong");
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch(`/api/commissioned-staff-records/${recordId}`, { method: "DELETE" });
      if (!res.ok) { showError("Failed"); return; }
      showSuccess("Deleted");
      fetchStaffData(selectedId);
    } catch {
      showError("Failed");
    }
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStockLoaded("");
    setFormStockReturned("0");
    setFormTransferredBy("");
    setFormAmountTransferred("");
    setFormCashPaid("");
    setFormDebtPaid("");
    setFormDebtPayer("");
    setFormDebtors("");
    setFormNotes("");
  };

  const startEdit = (recordId: string, field: string, currentValue: string | number) => {
    setEditingId(recordId);
    setEditField(field);
    setEditValue(String(currentValue));
  };

  const saveEdit = (recordId: string) => {
    updateRecord(recordId, editField, editValue);
  };

  const formExpected = ((Number(formStockLoaded) || 0) - (Number(formStockReturned) || 0)) * (staffInfo?.dealPrice || 0);
  const formTotalPaid = (Number(formAmountTransferred) || 0) + (Number(formCashPaid) || 0) + (Number(formDebtPaid) || 0);
  const formDeficit = Math.max(0, formExpected - formTotalPaid);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/commissioned-staffs" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <PageBreadcrumb pageTitle="Commissioned Staff Records" />
        </div>
        <div className="flex gap-2">
          <Select
            options={allStaff.map((s) => ({ value: s._id, label: `${s.name}${s.totalOwed > 0 ? ` (₦${s.totalOwed.toLocaleString()} owed)` : ""}` }))}
            value={selectedId}
            onChange={(val) => setSelectedId(val)}
          />
          <Button size="sm" startIcon={<PlusIcon />} onClick={() => { resetForm(); setShowAddModal(true); }}>Add Record</Button>
        </div>
      </div>

      {staffInfo && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">{staffInfo.name}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">Deal: ₦{(staffInfo.dealPrice ?? 0).toLocaleString()}/bag</span>
            {staffInfo.phone && <span className="text-sm text-gray-500 dark:text-gray-400">{staffInfo.phone}</span>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              { label: "Records", value: String(records.length), color: "text-gray-800 dark:text-white/90" },
              { label: "Bags Loaded", value: totals.stockLoaded.toLocaleString(), color: "text-gray-800 dark:text-white/90" },
              { label: "Bags Returned", value: totals.stockReturned.toLocaleString(), color: "text-gray-800 dark:text-white/90" },
              { label: "Expected", value: `₦${totals.expectedAmount.toLocaleString()}`, color: "text-gray-800 dark:text-white/90" },
              { label: "Transferred", value: `₦${totals.amountTransferred.toLocaleString()}`, color: "text-blue-600 dark:text-blue-400" },
              { label: "Cash", value: `₦${totals.cashPaid.toLocaleString()}`, color: "text-green-600 dark:text-green-400" },
              { label: "Deficit", value: `₦${totals.deficit.toLocaleString()}`, color: "text-orange-600 dark:text-orange-400" },
              { label: "Debt", value: `₦${totals.debt.toLocaleString()}`, color: totals.debt > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400" },
            ].map((c) => (
              <div key={c.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-theme-sm">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">{c.label}</p>
                <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">#</th>
                    <th className="px-2 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Date</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Loaded</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Returned</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Expected</th>
                    <th className="px-2 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Transferred By</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">₦ Transferred</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Cash</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Deficit</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Debt Pd</th>
                    <th className="px-2 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Debt Payer</th>
                    <th className="px-2 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Debtors</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Debt</th>
                    <th className="px-2 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={14} className="text-center py-10 text-gray-500">Loading...</td></tr>
                  ) : pagedRecords.length === 0 ? (
                    <tr><td colSpan={14} className="text-center py-10 text-gray-500">No records yet. Click &quot;Add Record&quot; to start.</td></tr>
                  ) : (
                    pagedRecords.map((r, idx) => {
                      const rowIdx = (page - 1) * ROWS_PER_PAGE + idx + 1;
                      return (
                        <tr key={r._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-2 py-1.5 text-gray-400">{rowIdx}</td>
                          <td className="px-2 py-1.5 font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                            {editingId === r._id && editField === "date" ? (
                              <div className="flex items-center gap-1">
                                <input type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="px-1 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 w-28" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "date", r.date.slice(0, 10))} className="cursor-pointer hover:text-brand-600">
                                {new Date(r.date).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {editingId === r._id && editField === "stockLoaded" ? (
                              <div className="flex items-center gap-1 justify-end">
                                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-16 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "stockLoaded", r.stockLoaded)}
                                className="cursor-pointer hover:text-brand-600 text-gray-800 dark:text-white/90">
                                {(r.stockLoaded ?? 0).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {editingId === r._id && editField === "stockReturned" ? (
                              <div className="flex items-center gap-1 justify-end">
                                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-16 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "stockReturned", r.stockReturned)}
                                className="cursor-pointer hover:text-brand-600 text-gray-800 dark:text-white/90">
                                {(r.stockReturned ?? 0).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold text-gray-800 dark:text-white/90">
                            ₦{(r.expectedAmount ?? 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-1.5">
                            {editingId === r._id && editField === "transferredBy" ? (
                              <div className="flex items-center gap-1">
                                <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-24 px-1 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "transferredBy", r.transferredBy)}
                                className="cursor-pointer hover:text-brand-600 text-gray-600 dark:text-gray-400">
                                {r.transferredBy || "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {editingId === r._id && editField === "amountTransferred" ? (
                              <div className="flex items-center gap-1 justify-end">
                                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-20 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "amountTransferred", r.amountTransferred)}
                                className="cursor-pointer hover:text-brand-600 text-blue-600 dark:text-blue-400 font-medium">
                                ₦{(r.amountTransferred ?? 0).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {editingId === r._id && editField === "cashPaid" ? (
                              <div className="flex items-center gap-1 justify-end">
                                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-20 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "cashPaid", r.cashPaid)}
                                className="cursor-pointer hover:text-brand-600 text-green-600 dark:text-green-400 font-medium">
                                ₦{(r.cashPaid ?? 0).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right text-orange-600 dark:text-orange-400 font-medium">
                            ₦{(r.deficit ?? 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {editingId === r._id && editField === "debtPaid" ? (
                              <div className="flex items-center gap-1 justify-end">
                                <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-20 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "debtPaid", r.debtPaid)}
                                className="cursor-pointer hover:text-brand-600 text-purple-600 dark:text-purple-400 font-medium">
                                ₦{(r.debtPaid ?? 0).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {editingId === r._id && editField === "debtPayer" ? (
                              <div className="flex items-center gap-1">
                                <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-24 px-1 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "debtPayer", r.debtPayer)}
                                className="cursor-pointer hover:text-brand-600 text-gray-600 dark:text-gray-400">
                                {r.debtPayer || "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {editingId === r._id && editField === "debtors" ? (
                              <div className="flex items-center gap-1">
                                <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  className="w-24 px-1 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600" />
                                <button onClick={() => saveEdit(r._id)} className="text-brand-600 text-[10px] font-bold">OK</button>
                                <button onClick={() => setEditingId(null)} className="text-gray-400 text-[10px]">X</button>
                              </div>
                            ) : (
                              <span onClick={() => startEdit(r._id, "debtors", r.debtors)}
                                className="cursor-pointer hover:text-brand-600 text-gray-600 dark:text-gray-400">
                                {r.debtors || "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold">
                            <span className={(r.debt ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                              ₦{(r.debt ?? 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <button onClick={() => deleteRecord(r._id)} className="text-red-500 hover:text-red-700 text-[10px]">Del</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {records.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-white/5 font-bold text-gray-800 dark:text-white/90">
                      <td className="px-2 py-2.5" colSpan={2}>Totals ({records.length} records)</td>
                      <td className="px-2 py-2.5 text-right">{totals.stockLoaded.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-right">{totals.stockReturned.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-right">₦{totals.expectedAmount.toLocaleString()}</td>
                      <td className="px-2 py-2.5"></td>
                      <td className="px-2 py-2.5 text-right text-blue-600 dark:text-blue-400">₦{totals.amountTransferred.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-right text-green-600 dark:text-green-400">₦{totals.cashPaid.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-right text-orange-600 dark:text-orange-400">₦{totals.deficit.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-right text-purple-600 dark:text-purple-400">₦{totals.debtPaid.toLocaleString()}</td>
                      <td className="px-2 py-2.5"></td>
                      <td className="px-2 py-2.5"></td>
                      <td className="px-2 py-2.5 text-right text-red-600 dark:text-red-400">₦{totals.debt.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {((page - 1) * ROWS_PER_PAGE) + 1}–{Math.min(page * ROWS_PER_PAGE, records.length)} of {records.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pNum: number;
                    if (totalPages <= 7) { pNum = i + 1; }
                    else if (page <= 4) { pNum = i + 1; }
                    else if (page >= totalPages - 3) { pNum = totalPages - 6 + i; }
                    else { pNum = page - 3 + i; }
                    return (
                      <button key={pNum} onClick={() => setPage(pNum)}
                        className={`px-2 py-1 text-xs rounded border ${page === pNum ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                        {pNum}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                    className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">New Outing Record</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <CloseIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Deal Price</label>
                  <div className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
                    ₦{(staffInfo?.dealPrice || 0).toLocaleString()}/bag
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Loaded *</label>
                  <Input type="number" value={formStockLoaded} onChange={(e) => setFormStockLoaded(e.target.value)} placeholder="e.g. 100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Returned</label>
                  <Input type="number" value={formStockReturned} onChange={(e) => setFormStockReturned(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transferred By</label>
                  <Input value={formTransferredBy} onChange={(e) => setFormTransferredBy(e.target.value)} placeholder="Name of sender" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Transferred</label>
                  <Input type="number" value={formAmountTransferred} onChange={(e) => setFormAmountTransferred(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cash Paid</label>
                  <Input type="number" value={formCashPaid} onChange={(e) => setFormCashPaid(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Previous Debt Paid</label>
                  <Input type="number" value={formDebtPaid} onChange={(e) => setFormDebtPaid(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Debt Payer</label>
                  <Input value={formDebtPayer} onChange={(e) => setFormDebtPayer(e.target.value)} placeholder="Who paid the debt?" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Debtors</label>
                  <Input value={formDebtors} onChange={(e) => setFormDebtors(e.target.value)} placeholder="Who still owes?" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes..." />
              </div>

              <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-brand-500 uppercase">Bags Consumed</p>
                    <p className="font-bold text-brand-700 dark:text-brand-300">
                      {(Number(formStockLoaded) - (Number(formStockReturned) || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-500 uppercase">Expected</p>
                    <p className="font-bold text-brand-700 dark:text-brand-300">₦{formExpected.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-500 uppercase">Total Paid</p>
                    <p className="font-bold text-green-600 dark:text-green-400">₦{formTotalPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-500 uppercase">Deficit / Debt</p>
                    <p className={`font-bold ${formDeficit > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      ₦{formDeficit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-900">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button size="sm" onClick={createRecord} disabled={submitting}>
                {submitting ? "Saving..." : "Create Record"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
