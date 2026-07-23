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
  transferredBy: string[];
  amountTransferred: number;
  cashPaid: number;
  deficit: number;
  debtPaid: number;
  debtPayer: string;
  debtors: { name: string; amount: number; settled: number }[];
  debt: number;
  totalPaid: number;
  totalOwed: number;
  notes: string;
  payments: { type: string; amount: number; senderName: string; date: string }[];
}

interface AllStaffOption {
  _id: string;
  name: string;
  totalOwed: number;
}

interface DebtorDraft {
  name: string;
  amount: string;
  settled?: number;
}

interface DraftRow {
  date: string;
  stockLoaded: string;
  stockReturned: string;
  transferredByNames: string[];
  amountTransferred: string;
  cashPaid: string;
  debtPaid: string;
  debtPayer: string;
  debtors: DebtorDraft[];
  notes: string;
}

const emptyDraft = (): DraftRow => ({
  date: new Date().toISOString().slice(0, 10),
  stockLoaded: "", stockReturned: "0",
  transferredByNames: [], amountTransferred: "", cashPaid: "",
  debtPaid: "", debtPayer: "", debtors: [], notes: "",
});

const ROWS_PER_PAGE = 15;

export default function CommissionedStaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [allStaff, setAllStaff] = useState<AllStaffOption[]>([]);
  const [selectedId, setSelectedId] = useState(id);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffRecord | null>(null);
  const [settleTarget, setSettleTarget] = useState<StaffRecord | null>(null);

  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formStockLoaded, setFormStockLoaded] = useState("");
  const [formStockReturned, setFormStockReturned] = useState("0");
  const [formTransferredByNames, setFormTransferredByNames] = useState<string[]>([]);
  const [formAmountTransferred, setFormAmountTransferred] = useState("");
  const [formCashPaid, setFormCashPaid] = useState("");
  const [formDebtPaid, setFormDebtPaid] = useState("");
  const [formDebtPayer, setFormDebtPayer] = useState("");
  const [formDebtors, setFormDebtors] = useState<DebtorDraft[]>([]);
  const [formNotes, setFormNotes] = useState("");

  const [settleType, setSettleType] = useState<"cash" | "transfer">("cash");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleSenderName, setSettleSenderName] = useState("");
  const [settleDebtorName, setSettleDebtorName] = useState("");
  const [settleDate, setSettleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [settleNotes, setSettleNotes] = useState("");

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

  const resetForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStockLoaded("");
    setFormStockReturned("0");
    setFormTransferredByNames([]);
    setFormAmountTransferred("");
    setFormCashPaid("");
    setFormDebtPaid("");
    setFormDebtPayer("");
    setFormDebtors([]);
    setFormNotes("");
  };

  const createRecord = async () => {
    if (!formStockLoaded) { showError("Stock loaded is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/commissioned-staff-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedId, date: formDate,
          stockLoaded: Number(formStockLoaded), stockReturned: Number(formStockReturned) || 0,
          transferredBy: formTransferredByNames, amountTransferred: Number(formAmountTransferred) || 0,
          cashPaid: Number(formCashPaid) || 0, debtPaid: Number(formDebtPaid) || 0,
          debtPayer: formDebtPayer,
          debtors: formDebtors.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), amount: Number(d.amount) || 0, settled: 0 })),
          notes: formNotes,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Record created");
      setShowAddModal(false);
      resetForm();
      fetchStaffData(selectedId);
    } catch { showError("Something went wrong"); } finally { setSubmitting(false); }
  };

  const openEdit = (r: StaffRecord) => {
    setEditTarget(r);
    setFormDate(r.date.slice(0, 10));
    setFormStockLoaded(String(r.stockLoaded));
    setFormStockReturned(String(r.stockReturned));
    setFormTransferredByNames(Array.isArray(r.transferredBy) ? r.transferredBy : r.transferredBy ? [r.transferredBy as unknown as string] : []);
    setFormAmountTransferred(String(r.amountTransferred));
    setFormCashPaid(String(r.cashPaid));
    setFormDebtPaid(String(r.debtPaid));
    setFormDebtPayer(r.debtPayer);
    setFormDebtors(Array.isArray(r.debtors) ? r.debtors.map((d) => ({ name: d.name, amount: String(d.amount), settled: d.settled || 0 })) : []);
    setFormNotes(r.notes);
    setShowEditModal(true);
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/commissioned-staff-records/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          stockLoaded: Number(formStockLoaded), stockReturned: Number(formStockReturned) || 0,
          transferredBy: formTransferredByNames, amountTransferred: Number(formAmountTransferred) || 0,
          cashPaid: Number(formCashPaid) || 0, debtPaid: Number(formDebtPaid) || 0,
          debtPayer: formDebtPayer,
          debtors: formDebtors.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), amount: Number(d.amount) || 0, settled: Number(d.settled) || 0 })),
          notes: formNotes,
        }),
      });
      if (!res.ok) { showError("Failed to update"); return; }
      showSuccess("Record updated");
      setShowEditModal(false);
      setEditTarget(null);
      fetchStaffData(selectedId);
    } catch { showError("Something went wrong"); } finally { setSubmitting(false); }
  };

  const submitSettle = async () => {
    if (!settleTarget) return;
    const amount = Number(settleAmount) || 0;
    if (amount <= 0) { showError("Enter a valid amount"); return; }
    if (!settleDebtorName) { showError("No debtor selected"); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/commissioned-staff-records/${settleTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settleDebtor: {
            debtorName: settleDebtorName,
            amount,
            type: settleType,
            senderName: settleSenderName || settleDebtorName,
            date: settleDate,
            notes: settleNotes,
          },
        }),
      });
      if (!res.ok) { showError("Failed to settle"); return; }
      showSuccess(`₦${amount.toLocaleString()} settled for ${settleDebtorName}`);
      setShowSettleModal(false);
      setSettleTarget(null);
      setSettleDebtorName("");
      setSettleAmount("");
      setSettleSenderName("");
      setSettleDate(new Date().toISOString().slice(0, 10));
      setSettleNotes("");
      fetchStaffData(selectedId);
    } catch { showError("Something went wrong"); } finally { setSubmitting(false); }
  };

  const deleteRecord = async (recordId: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch(`/api/commissioned-staff-records/${recordId}`, { method: "DELETE" });
      if (!res.ok) { showError("Failed"); return; }
      showSuccess("Deleted");
      fetchStaffData(selectedId);
    } catch { showError("Failed"); }
  };

  const addDraftRow = () => setDraftRows((prev) => [...prev, emptyDraft()]);
  const removeDraftRow = (idx: number) => setDraftRows((prev) => prev.filter((_, i) => i !== idx));
  const updateDraftRow = (idx: number, field: keyof DraftRow, value: string | string[] | DebtorDraft[]) =>
    setDraftRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const saveDraftRow = async (idx: number) => {
    const r = draftRows[idx];
    if (!r.stockLoaded) { showError("Stock loaded is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/commissioned-staff-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedId, date: r.date,
          stockLoaded: Number(r.stockLoaded), stockReturned: Number(r.stockReturned) || 0,
          transferredBy: r.transferredByNames, amountTransferred: Number(r.amountTransferred) || 0,
          cashPaid: Number(r.cashPaid) || 0, debtPaid: Number(r.debtPaid) || 0,
          debtPayer: r.debtPayer,
          debtors: r.debtors.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), amount: Number(d.amount) || 0, settled: 0 })),
          notes: r.notes,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Row saved");
      removeDraftRow(idx);
      fetchStaffData(selectedId);
    } catch { showError("Something went wrong"); } finally { setSubmitting(false); }
  };

  const saveAllDraftRows = async () => {
    const valid = draftRows.filter((r) => r.stockLoaded);
    if (valid.length === 0) { showError("No rows with data to save"); return; }
    setSubmitting(true);
    let saved = 0;
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      try {
        const res = await fetch("/api/commissioned-staff-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffId: selectedId, date: r.date,
            stockLoaded: Number(r.stockLoaded), stockReturned: Number(r.stockReturned) || 0,
            transferredBy: r.transferredByNames, amountTransferred: Number(r.amountTransferred) || 0,
            cashPaid: Number(r.cashPaid) || 0, debtPaid: Number(r.debtPaid) || 0,
            debtPayer: r.debtPayer,
            debtors: r.debtors.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), amount: Number(d.amount) || 0, settled: 0 })),
            notes: r.notes,
          }),
        });
        if (res.ok) saved++;
      } catch { /* skip */ }
    }
    setSubmitting(false);
    if (saved > 0) { showSuccess(`${saved} record(s) saved`); setDraftRows([]); fetchStaffData(selectedId); }
    else showError("Failed to save records");
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
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" startIcon={<PlusIcon />} onClick={addDraftRow}>Add Row</Button>
                {draftRows.length > 0 && (
                  <Button size="sm" onClick={saveAllDraftRows} disabled={submitting}>
                    {submitting ? "Saving..." : `Save All (${draftRows.length})`}
                  </Button>
                )}
              </div>
              {draftRows.length > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{draftRows.length} unsaved row(s)</span>
              )}
            </div>
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
                  {draftRows.map((r, idx) => {
                    const bagsConsumed = (Number(r.stockLoaded) || 0) - (Number(r.stockReturned) || 0);
                    const expected = bagsConsumed * (staffInfo?.dealPrice || 0);
                    const totalPaid = (Number(r.amountTransferred) || 0) + (Number(r.cashPaid) || 0) + (Number(r.debtPaid) || 0);
                    const deficit = Math.max(0, expected - totalPaid);
                    return (
                      <tr key={`draft-${idx}`} className="border-b border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-500/5">
                        <td className="px-1 py-1">
                          <button onClick={() => removeDraftRow(idx)} title="Remove row"
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/10 text-red-500 text-xs">✕</button>
                        </td>
                        <td className="px-1 py-1">
                          <Input type="date" value={r.date} onChange={(e) => updateDraftRow(idx, "date", e.target.value)} className="!py-1 !text-[10px] w-[110px]" />
                        </td>
                        <td className="px-1 py-1">
                          <Input type="number" value={r.stockLoaded} onChange={(e) => updateDraftRow(idx, "stockLoaded", e.target.value)} placeholder="0" className="!py-1 !text-[10px] w-[60px] text-right" />
                        </td>
                        <td className="px-1 py-1">
                          <Input type="number" value={r.stockReturned} onChange={(e) => updateDraftRow(idx, "stockReturned", e.target.value)} placeholder="0" className="!py-1 !text-[10px] w-[60px] text-right" />
                        </td>
                        <td className="px-2 py-1.5 text-right text-[10px] font-semibold text-gray-800 dark:text-white/90">
                          ₦{expected.toLocaleString()}
                        </td>
                        <td className="px-1 py-1">
                          {r.transferredByNames.map((name, ni) => (
                            <div key={ni} className="flex items-center gap-0.5 mb-0.5">
                              <Input value={name} onChange={(e) => {
                                const next = [...r.transferredByNames]; next[ni] = e.target.value;
                                updateDraftRow(idx, "transferredByNames", next);
                              }} placeholder="Name" className="!py-0.5 !text-[10px] w-[70px]" />
                              <button onClick={() => { const next = r.transferredByNames.filter((_, j) => j !== ni); updateDraftRow(idx, "transferredByNames", next); }}
                                className="text-red-400 hover:text-red-600 text-[9px]">✕</button>
                            </div>
                          ))}
                          <button onClick={() => updateDraftRow(idx, "transferredByNames", [...r.transferredByNames, ""])}
                            className="text-[9px] text-brand-500 hover:text-brand-700">+ name</button>
                        </td>
                        <td className="px-1 py-1">
                          <Input type="number" value={r.amountTransferred} onChange={(e) => updateDraftRow(idx, "amountTransferred", e.target.value)} placeholder="0" className="!py-1 !text-[10px] w-[70px] text-right" />
                        </td>
                        <td className="px-1 py-1">
                          <Input type="number" value={r.cashPaid} onChange={(e) => updateDraftRow(idx, "cashPaid", e.target.value)} placeholder="0" className="!py-1 !text-[10px] w-[70px] text-right" />
                        </td>
                        <td className="px-2 py-1.5 text-right text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                          ₦{deficit.toLocaleString()}
                        </td>
                        <td className="px-1 py-1">
                          <Input type="number" value={r.debtPaid} onChange={(e) => updateDraftRow(idx, "debtPaid", e.target.value)} placeholder="0" className="!py-1 !text-[10px] w-[60px] text-right" />
                        </td>
                        <td className="px-1 py-1">
                          <Input value={r.debtPayer} onChange={(e) => updateDraftRow(idx, "debtPayer", e.target.value)} placeholder="Payer" className="!py-1 !text-[10px] w-[70px]" />
                        </td>
                        <td className="px-1 py-1">
                          {r.debtors.map((d, di) => (
                            <div key={di} className="flex items-center gap-1 mb-0.5">
                              <Input value={d.name} onChange={(e) => {
                                const next = [...r.debtors]; next[di] = { ...next[di], name: e.target.value };
                                updateDraftRow(idx, "debtors", next);
                              }} placeholder="Name" className="!py-0.5 !text-[10px] w-[55px]" />
                              <Input type="number" value={d.amount} onChange={(e) => {
                                const next = [...r.debtors]; next[di] = { ...next[di], amount: e.target.value };
                                updateDraftRow(idx, "debtors", next);
                              }} placeholder="₦" className="!py-0.5 !text-[10px] w-[45px]" />
                              <button onClick={() => { const next = r.debtors.filter((_, j) => j !== di); updateDraftRow(idx, "debtors", next); }}
                                className="text-red-400 hover:text-red-600 text-[10px]">✕</button>
                            </div>
                          ))}
                          <button onClick={() => updateDraftRow(idx, "debtors", [...r.debtors, { name: "", amount: "" }])}
                            className="text-[9px] text-brand-500 hover:text-brand-700">+ debtor</button>
                        </td>
                        <td className="px-1 py-1">
                          <button onClick={() => saveDraftRow(idx)} disabled={submitting || !r.stockLoaded}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 disabled:opacity-40 transition-colors">
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {loading ? (
                    <tr><td colSpan={14} className="text-center py-10 text-gray-500">Loading...</td></tr>
                  ) : pagedRecords.length === 0 ? (
                    <tr><td colSpan={14} className="text-center py-10 text-gray-500">No records yet. Click &quot;Add Record&quot; to start.</td></tr>
                  ) : (
                    pagedRecords.flatMap((r, idx) => {
                      const rowIdx = (page - 1) * ROWS_PER_PAGE + idx + 1;
                      const debtors = Array.isArray(r.debtors) ? r.debtors : [];
                      const hasDebtors = debtors.length > 0;
                      const totalRows = hasDebtors ? debtors.length + 1 : 1;

                      const sharedCells = (
                        <>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-gray-400">{rowIdx}</td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                            {new Date(r.date).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-right text-gray-800 dark:text-white/90">{(r.stockLoaded ?? 0).toLocaleString()}</td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-right text-gray-800 dark:text-white/90">{(r.stockReturned ?? 0).toLocaleString()}</td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-right font-semibold text-gray-800 dark:text-white/90">₦{(r.expectedAmount ?? 0).toLocaleString()}</td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-gray-600 dark:text-gray-400">
                            {Array.isArray(r.transferredBy) && r.transferredBy.length > 0 ? (
                              <div className="space-y-0.5">
                                {r.transferredBy.map((name, ni) => (
                                  <div key={ni} className="text-[10px]">{name}</div>
                                ))}
                              </div>
                            ) : typeof r.transferredBy === "string" && r.transferredBy ? (
                              r.transferredBy
                            ) : "—"}
                          </td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-right text-blue-600 dark:text-blue-400 font-medium">₦{(r.amountTransferred ?? 0).toLocaleString()}</td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-right text-green-600 dark:text-green-400 font-medium">₦{(r.cashPaid ?? 0).toLocaleString()}</td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-right text-orange-600 dark:text-orange-400 font-medium">₦{(r.deficit ?? 0).toLocaleString()}</td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-right text-purple-600 dark:text-purple-400 font-medium">₦{(r.debtPaid ?? 0).toLocaleString()}</td>
                          <td rowSpan={totalRows} className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{r.debtPayer || "—"}</td>
                        </>
                      );

                      if (hasDebtors) {
                        const debtorRows = debtors.map((d, di) => {
                          const remaining = (d.amount ?? 0) - (d.settled ?? 0);
                          return (
                            <tr key={`${r._id}-d${di}`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                              {di === 0 && sharedCells}
                              <td className="px-2 py-1.5 text-[11px] text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">{d.name}</td>
                              <td className="px-2 py-1.5 text-right font-bold">
                                <span className="text-red-600 dark:text-red-400">₦{remaining.toLocaleString()}</span>
                              </td>
                              <td className="px-2 py-1.5 text-right whitespace-nowrap">
                                {remaining > 0 ? (
                                  <button onClick={() => {
                                    setSettleTarget(r);
                                    setSettleDebtorName(d.name);
                                    setSettleAmount(String(remaining));
                                    setSettleSenderName(d.name);
                                    setSettleType("cash");
                                    setShowSettleModal(true);
                                  }}
                                    className="text-[10px] font-medium px-2 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 transition-colors whitespace-nowrap">
                                    Settle
                                  </button>
                                ) : <span className="text-[10px] text-green-500 dark:text-green-400">Paid</span>}
                              </td>
                            </tr>
                          );
                        });

                        const summaryRow = (
                          <tr key={`${r._id}-sum`} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="px-2 py-1.5 text-gray-300 dark:text-gray-600 text-[11px]">Total</td>
                            <td className="px-2 py-1.5 text-right font-bold">
                              <span className={(r.debt ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                                ₦{(r.debt ?? 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => openEdit(r)}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 transition-colors">
                                  Edit
                                </button>
                                <button onClick={() => deleteRecord(r._id)}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 transition-colors">
                                  Del
                                </button>
                              </div>
                            </td>
                          </tr>
                        );

                        return [...debtorRows, summaryRow];
                      }

                      return (
                        <tr key={r._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                          {sharedCells}
                          <td className="px-2 py-1.5 text-gray-300 dark:text-gray-600">—</td>
                          <td className="px-2 py-1.5 text-right font-bold">
                            <span className={(r.debt ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                              ₦{(r.debt ?? 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEdit(r)}
                                className="text-[10px] font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 transition-colors">
                                Edit
                              </button>
                              <button onClick={() => deleteRecord(r._id)}
                                className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 transition-colors">
                                Del
                              </button>
                            </div>
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

      {records.length > 0 && (() => {
        interface SettledRow {
          date: string;
          debtor: string;
          payer: string;
          amount: number;
          type: string;
          recordDate: string;
          remaining: number;
          notes: string;
          recordId: string;
        }
        const settledPayments: SettledRow[] = [];
        records.forEach((r) => {
          if (Array.isArray(r.payments) && r.payments.length > 0) {
            r.payments.forEach((p: { type: string; amount: number; senderName: string; date: string; notes?: string }) => {
              const debtorName = p.notes?.replace("Settled by ", "") || "";
              const debtorEntry = Array.isArray(r.debtors) ? r.debtors.find((d: { name: string; amount: number; settled: number }) => d.name === debtorName) : null;
              const debtorAmount = debtorEntry ? (debtorEntry.amount ?? 0) : 0;
              const debtorSettledBefore = debtorEntry ? ((debtorEntry.settled ?? 0) - p.amount) : 0;
              const remaining = Math.max(0, debtorAmount - debtorSettledBefore - p.amount);
              settledPayments.push({
                date: p.date,
                debtor: debtorName || r.debtPayer || "General",
                payer: p.senderName || r.debtPayer || "Unknown",
                amount: p.amount,
                type: p.type,
                recordDate: r.date,
                remaining,
                notes: p.notes || "",
                recordId: r._id,
              });
            });
          }
          if ((r.debtPaid ?? 0) > 0 && (!Array.isArray(r.payments) || r.payments.length === 0)) {
            settledPayments.push({
              date: r.date,
              debtor: r.debtPayer || "General",
              payer: r.debtPayer || "Unknown",
              amount: r.debtPaid,
              type: "cash",
              recordDate: r.date,
              remaining: Math.max(0, (r.debt ?? 0)),
              notes: "",
              recordId: r._id,
            });
          }
        });
        settledPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalSettled = settledPayments.reduce((s, p) => s + p.amount, 0);
        if (settledPayments.length === 0) return null;
        return (
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Settlement History</h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{settledPayments.length} payment(s) recorded</p>
                </div>
                <span className="text-xs font-bold text-green-600 dark:text-green-400">₦{totalSettled.toLocaleString()} total settled</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Payment Date</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Record Date</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Debtor</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Paid By</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Amount Paid</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Remaining</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settledPayments.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-2 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-2 py-2 font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                          {new Date(p.date).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(p.recordDate).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-300 font-medium">{p.debtor}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">{p.payer}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${p.type === "transfer" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" : "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"}`}>
                            {p.type === "transfer" ? "Transfer" : "Cash"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-green-600 dark:text-green-400">
                          ₦{p.amount.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className={p.remaining > 0 ? "text-red-500 dark:text-red-400 font-medium" : "text-green-500 dark:text-green-400"}>
                            ₦{p.remaining.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-gray-400 dark:text-gray-500 max-w-[120px] truncate">{p.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-white/5 font-bold">
                      <td className="px-2 py-2.5" colSpan={6}>Total ({settledPayments.length} payments)</td>
                      <td className="px-2 py-2.5 text-right text-green-600 dark:text-green-400">₦{totalSettled.toLocaleString()}</td>
                      <td className="px-2 py-2.5"></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {showEditModal ? "Edit Record" : "New Outing Record"}
              </h3>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditTarget(null); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Transferred By</label>
                    <button type="button" onClick={() => setFormTransferredByNames((prev) => [...prev, ""])}
                      className="text-[10px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700">
                      + Add Name
                    </button>
                  </div>
                  {formTransferredByNames.length === 0 && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">No names added</p>
                  )}
                  {formTransferredByNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                      <Input value={name} onChange={(e) => {
                        const next = [...formTransferredByNames]; next[i] = e.target.value; setFormTransferredByNames(next);
                      }} placeholder="Name" />
                      <button type="button" onClick={() => setFormTransferredByNames((prev) => prev.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 text-xs shrink-0">✕</button>
                    </div>
                  ))}
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
                <div></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Debtors (who owes)</label>
                  <button type="button" onClick={() => setFormDebtors((prev) => [...prev, { name: "", amount: "" }])}
                    className="text-[10px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700">
                    + Add Debtor
                  </button>
                </div>
                {formDebtors.length === 0 && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">No debtors — all paid</p>
                )}
                {formDebtors.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <Input value={d.name} onChange={(e) => {
                      const next = [...formDebtors]; next[i] = { ...next[i], name: e.target.value }; setFormDebtors(next);
                    }} placeholder="Name" />
                    <Input type="number" value={d.amount} onChange={(e) => {
                      const next = [...formDebtors]; next[i] = { ...next[i], amount: e.target.value }; setFormDebtors(next);
                    }} placeholder="₦ Amount" />
                    <button type="button" onClick={() => setFormDebtors((prev) => prev.filter((_, j) => j !== i))}
                      className="text-red-500 hover:text-red-700 text-xs shrink-0">✕</button>
                  </div>
                ))}
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
              <Button variant="outline" size="sm" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditTarget(null); }}>Cancel</Button>
              <Button size="sm" onClick={showEditModal ? submitEdit : createRecord} disabled={submitting}>
                {submitting ? "Saving..." : showEditModal ? "Update Record" : "Create Record"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSettleModal && settleTarget && (() => {
        const debtorEntry = Array.isArray(settleTarget.debtors) ? settleTarget.debtors.find((d: { name: string; amount: number; settled: number }) => d.name === settleDebtorName) : null;
        const debtorTotal = debtorEntry ? (debtorEntry.amount ?? 0) : 0;
        const debtorSettled = debtorEntry ? (debtorEntry.settled ?? 0) : 0;
        const debtorRemaining = debtorTotal - debtorSettled;
        const payAmount = Number(settleAmount) || 0;
        const afterPayment = Math.max(0, debtorRemaining - payAmount);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Settle Debt</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Debtor: <span className="font-bold text-gray-800 dark:text-white/90">{settleDebtorName}</span>
                    <span className="ml-2 text-gray-400">| Owes: ₦{debtorTotal.toLocaleString()} | Paid: ₦{debtorSettled.toLocaleString()} | Left: ₦{debtorRemaining.toLocaleString()}</span>
                  </p>
                </div>
                <button onClick={() => { setShowSettleModal(false); setSettleTarget(null); setSettleDebtorName(""); }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <CloseIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
                    <Input type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Type</label>
                    <div className="flex gap-2">
                      <button onClick={() => setSettleType("cash")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${settleType === "cash" ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                        Cash
                      </button>
                      <button onClick={() => setSettleType("transfer")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${settleType === "transfer" ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                        Transfer
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <Input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="e.g. 5000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Who Paid?</label>
                  <Input value={settleSenderName} onChange={(e) => setSettleSenderName(e.target.value)} placeholder="Name of person who paid" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <Input value={settleNotes} onChange={(e) => setSettleNotes(e.target.value)} placeholder="Optional notes (e.g. partial payment, paid via POS)" />
                </div>
                {payAmount > 0 && (
                  <div className={`p-3 rounded-lg border text-xs font-medium ${afterPayment > 0 ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400"}`}>
                    Paying ₦{payAmount.toLocaleString()} — ₦{afterPayment.toLocaleString()} remaining after this payment
                    {afterPayment === 0 && " (fully settled)"}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => { setShowSettleModal(false); setSettleTarget(null); setSettleDebtorName(""); }}>Cancel</Button>
                <Button size="sm" onClick={submitSettle} disabled={submitting}>
                  {submitting ? "Saving..." : "Settle Payment"}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
