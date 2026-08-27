"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface LedgerRecord {
  _id: string;
  date: string;
  locationType: "factory" | "depot" | "truck";
  locationId: string;
  productId?: string;
  unitPrice?: number;
  amountSold?: number;
  stockLoaded: number;
  returnedStock: number;
  leakages: number;
  cashDelivered: number;
  transfers: { name: string; amount: number }[];
  debtors: { name: string; amount: number; bags?: number; settlements?: { amount: number; date?: string; note?: string }[]; bagSettlements?: { amount: number; date?: string; note?: string }[] }[];
  debts: number;
  debtStatus: string;
  notes: string;
}

type EntityType = "factory" | "depot" | "truck";

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: "factory", label: "Factory" },
  { value: "depot", label: "Depot" },
  { value: "truck", label: "Vehicle" },
];

interface DebtorEntry {
  name: string;
  amount: number;
  bags?: number;
  settlements?: { amount: number; date?: string; note?: string }[];
  bagSettlements?: { amount: number; date?: string; note?: string }[];
}

interface TransferEntry {
  name: string;
  amount: number;
}

interface SettleTarget {
  recordId: string;
  date: string;
  index: number;
  name: string;
  amount: number;
  settled: number;
  remaining: number;
  kind: "cash" | "bags";
}

const PAGE_SIZE = 10;

interface ProductOption {
  id: string;
  name: string;
  unitPrice: number;
}

const LEDGER_FIELDS: { key: string; label: string; type: "number" | "text" }[] = [
  { key: "stockLoaded", label: "Stock Loaded", type: "number" },
  { key: "returnedStock", label: "Returned Stock", type: "number" },
  { key: "leakages", label: "Leakages", type: "number" },
];

const RECALC_TRIGGERS = new Set(["stockLoaded", "returnedStock", "leakages", "unitPrice"]);

export default function SalesLedgerPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const [locationType, setLocationType] = useState<EntityType>(
    () => (typeParam === "depot" || typeParam === "truck" ? typeParam : "factory")
  );

  useEffect(() => {
    if (typeParam === "depot" || typeParam === "truck" || typeParam === "factory") {
      setLocationType(typeParam);
    }
  }, [typeParam]);

  const [allLocations, setAllLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  useEffect(() => {
    const endpoint =
      locationType === "factory" ? "/api/factories" : locationType === "depot" ? "/api/depots" : "/api/trucks";
    setSelectedLocationId("");
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data
            .map((item: { _id: string; name?: string; plateNumber?: string }) => {
              if (locationType === "truck") {
                const name = (item.name ?? "").trim();
                const plate = (item.plateNumber ?? "").trim();
                if (name && plate) return { id: item._id, name: `${name} - ${plate}` };
                if (name) return { id: item._id, name };
                if (plate) return { id: item._id, name: `Vehicle: ${plate}` };
                return { id: item._id, name: "" };
              }
              return { id: item._id, name: item.name ?? "" };
            })
            .filter((l) => l.name.trim() !== "");
          setAllLocations(mapped);
          if (mapped.length > 0) setSelectedLocationId(mapped[0].id);
        }
      })
      .catch(() => {});
  }, [locationType]);

  const [products, setProducts] = useState<ProductOption[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data
            .map((p: { _id: string; name?: string; unitPrice?: number }) => ({
              id: p._id,
              name: p.name ?? "",
              unitPrice: Number(p.unitPrice) || 0,
            }))
            .filter((p: ProductOption) => p.name.trim() !== "");
          setProducts(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [addDayDate, setAddDayDate] = useState("");
  const [showAddDay, setShowAddDay] = useState(false);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, unknown>>>({});
  const [savingBatch, setSavingBatch] = useState(false);
  const dirtyCount = Object.keys(pendingChanges).length;

  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [settling, setSettling] = useState(false);

  const locationParam = useMemo(() => JSON.stringify({ type: locationType, id: selectedLocationId }), [locationType, selectedLocationId]);

  const fetchRecords = useCallback(() => {
    if (!selectedLocationId) return;
    fetch(`/api/sales-ledger?location=${encodeURIComponent(locationParam)}`)
      .then((r) => r.json())
      .then((data) => { setRecords(Array.isArray(data) ? data : []); })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [locationParam, selectedLocationId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { setPage(1); setPendingChanges({}); }, [selectedLocationId, locationType]);
  useEffect(() => { setPage(1); setPendingChanges({}); }, [month]);

  const todayStr = (() => {
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  })();

  const latestRecord = records.length > 0 ? records[0] : null;
  const isCurrentDay = (date: string) => date === todayStr || (latestRecord && date === latestRecord.date);
  const monthRecords = records.filter((r) => r.date.startsWith(month));

  const totalPages = Math.max(1, Math.ceil(monthRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRecords = monthRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const monthLabel = (() => {
    const [y, m] = month.split("-");
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${names[Number(m) - 1] || ""} ${y}`.trim();
  })();

  const sumField = (recs: LedgerRecord[], key: string) =>
    recs.reduce((s, r) => s + (Number((r as unknown as Record<string, number>)[key]) || 0), 0);

  const bagsSoldOf = (r: LedgerRecord) =>
    Math.max(0, (Number(r.stockLoaded) || 0) - (Number(r.returnedStock) || 0) - (Number(r.leakages) || 0));

  const computeAmountSold = (r: Partial<LedgerRecord>) => {
    const bags = Math.max(
      0,
      (Number(r.stockLoaded) || 0) - (Number(r.returnedStock) || 0) - (Number(r.leakages) || 0)
    );
    return Math.round(bags * (Number(r.unitPrice) || 0) * 100) / 100;
  };

  const getTransfers = (d: LedgerRecord): TransferEntry[] =>
    (Array.isArray(d.transfers) ? d.transfers : []).map((x) => ({ name: x.name || "", amount: x.amount || 0 }));

  const getDebtors = (d: LedgerRecord): DebtorEntry[] =>
    (Array.isArray(d.debtors) ? d.debtors : []).map((x) => ({
      name: x.name || "",
      amount: x.amount || 0,
      bags: (x as DebtorEntry).bags || 0,
      settlements: Array.isArray(x.settlements) ? x.settlements : [],
      bagSettlements: Array.isArray((x as DebtorEntry).bagSettlements) ? (x as DebtorEntry).bagSettlements! : [],
    }));

  const debtSettledTotal = (debtor: DebtorEntry) =>
    (Array.isArray(debtor.settlements) ? debtor.settlements : []).reduce((s, x) => s + (Number(x.amount) || 0), 0);

  const debtRemaining = (debtor: DebtorEntry) =>
    Math.max(0, (Number(debtor.amount) || 0) - debtSettledTotal(debtor));

  const bagSettledTotal = (debtor: DebtorEntry) =>
    (Array.isArray(debtor.bagSettlements) ? debtor.bagSettlements : []).reduce((s, x) => s + (Number(x.amount) || 0), 0);

  const bagRemaining = (debtor: DebtorEntry) =>
    Math.max(0, (Number(debtor.bags) || 0) - bagSettledTotal(debtor));

  const totalDays = monthRecords.length;
  const totalStockLoaded = sumField(monthRecords, "stockLoaded");
  const totalReturned = sumField(monthRecords, "returnedStock");
  const totalLeakages = sumField(monthRecords, "leakages");
  const totalBagsSold = monthRecords.reduce((s, r) => s + bagsSoldOf(r), 0);
  const totalCash = sumField(monthRecords, "cashDelivered");
  const totalTransferred = monthRecords.reduce((s, r) => s + getTransfers(r).reduce((a, t) => a + (Number(t.amount) || 0), 0), 0);

  const statCards = [
    { label: "Total Days", value: totalDays, description: `in ${monthLabel}` },
    { label: "Total Stock Loaded", value: totalStockLoaded, description: "bags loaded" },
    { label: "Total Returned", value: totalReturned, description: "bags returned" },
    { label: "Total Bags Sold", value: totalBagsSold, description: "loaded − returned − leakages" },
    { label: "Total Sales Value", value: monthRecords.reduce((s, r) => s + (Number(r.amountSold) || 0), 0), prefix: "₦", description: "bags × unit price" },
    { label: "Total Leakages", value: totalLeakages, description: "bags lost" },
    { label: "Total Cash Delivered", value: totalCash, prefix: "₦", description: "total cash" },
    { label: "Total Amount Transferred", value: totalTransferred, prefix: "₦", description: "via transfer" },
  ];

  const applyPatch = (id: string, patch: Record<string, unknown>) => {
    setRecords((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
    setPendingChanges((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const handleChange = (id: string, field: string, rawValue: string) => {
    const val = Number(rawValue) || 0;
    const current = records.find((r) => r._id === id);
    const next = { ...(current ?? {}), [field]: val } as Partial<LedgerRecord>;
    const patch: Record<string, unknown> = { [field]: val };
    if (RECALC_TRIGGERS.has(field)) patch.amountSold = computeAmountSold(next);
    applyPatch(id, patch);
  };

  const handleProductChange = (id: string, productId: string) => {
    const current = records.find((r) => r._id === id);
    const product = products.find((p) => p.id === productId);
    const patch: Record<string, unknown> = { productId };
    if (product) {
      patch.unitPrice = product.unitPrice;
      patch.amountSold = computeAmountSold({ ...(current ?? {}), unitPrice: product.unitPrice });
    }
    applyPatch(id, patch);
  };

  const handleAmountSoldChange = (id: string, rawValue: string) => {
    applyPatch(id, { amountSold: Number(rawValue) || 0 });
  };

  const updateTransfers = (id: string, updater: (list: TransferEntry[]) => TransferEntry[]) => {
    const current = records.find((r) => r._id === id);
    const next = updater(getTransfers(current ?? ({} as LedgerRecord)));
    setRecords((prev) => prev.map((r) => (r._id === id ? { ...r, transfers: next } : r)));
    setPendingChanges((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), transfers: next } }));
  };

  const handleTransferChange = (id: string, index: number, field: "name" | "amount", value: string) => {
    updateTransfers(id, (list) => list.map((t, i) =>
      i === index ? { ...t, [field]: field === "amount" ? Number(value) || 0 : value } : t
    ));
  };

  const handleTransferAdd = (id: string) => {
    updateTransfers(id, (list) => [...list, { name: "", amount: 0 }]);
  };

  const handleTransferRemove = (id: string, index: number) => {
    updateTransfers(id, (list) => list.filter((_, i) => i !== index));
  };

  const updateDebtors = (id: string, updater: (list: DebtorEntry[]) => DebtorEntry[]) => {
    const current = records.find((r) => r._id === id);
    const next = updater(getDebtors(current ?? ({} as LedgerRecord)));
    setRecords((prev) => prev.map((r) => (r._id === id ? { ...r, debtors: next } : r)));
    setPendingChanges((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), debtors: next } }));
  };

  const handleDebtorChange = (id: string, index: number, field: "name" | "amount" | "bags", value: string) => {
    updateDebtors(id, (list) => list.map((d, i) =>
      i === index ? { ...d, [field]: field === "name" ? value : Number(value) || 0 } : d
    ));
  };

  const handleDebtorAdd = (id: string) => {
    updateDebtors(id, (list) => [...list, { name: "", amount: 0, bags: 0, settlements: [], bagSettlements: [] }]);
  };

  const handleDebtorRemove = (id: string, index: number) => {
    updateDebtors(id, (list) => list.filter((_, i) => i !== index));
  };

  const openSettle = (record: LedgerRecord, index: number, kind: "cash" | "bags" = "cash") => {
    const debtor = getDebtors(record)[index];
    if (!debtor) return;
    if (kind === "bags") {
      const settled = bagSettledTotal(debtor);
      const remaining = bagRemaining(debtor);
      setSettleTarget({ recordId: record._id, date: record.date, index, name: debtor.name || "", amount: Number(debtor.bags) || 0, settled, remaining, kind: "bags" });
      setSettleAmount(remaining > 0 ? String(remaining) : "");
    } else {
      const settled = debtSettledTotal(debtor);
      const remaining = debtRemaining(debtor);
      setSettleTarget({ recordId: record._id, date: record.date, index, name: debtor.name || "", amount: Number(debtor.amount) || 0, settled, remaining, kind: "cash" });
      setSettleAmount(remaining > 0 ? String(remaining) : "");
    }
    setSettleNote("");
  };

  const doSettle = async () => {
    if (!settleTarget) return;
    const amount = Number(settleAmount) || 0;
    if (amount <= 0) { showError("Enter a valid amount"); return; }
    if (amount > settleTarget.remaining) { showError("Amount exceeds outstanding balance"); return; }
    setSettling(true);
    try {
      const record = records.find((r) => r._id === settleTarget.recordId);
      const nextDebtors = getDebtors(record ?? ({} as LedgerRecord)).map((d, i) =>
        i === settleTarget.index
          ? settleTarget.kind === "bags"
            ? { ...d, bagSettlements: [...(Array.isArray(d.bagSettlements) ? d.bagSettlements : []), { amount, date: new Date().toISOString(), note: settleNote }] }
            : { ...d, settlements: [...(Array.isArray(d.settlements) ? d.settlements : []), { amount, date: new Date().toISOString(), note: settleNote }] }
          : d
      );
      const res = await fetch(`/api/sales-ledger/${settleTarget.recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debtors: nextDebtors }),
      });
      if (!res.ok) { showError("Failed to record settlement"); return; }
      const updated = await res.json();
      setRecords((prev) => prev.map((r) => r._id === settleTarget.recordId ? { ...r, ...updated } : r));
      setPendingChanges((prev) => {
        const next = { ...prev };
        if (next[settleTarget.recordId]) {
          const rest = { ...next[settleTarget.recordId] };
          delete rest.debtors;
          next[settleTarget.recordId] = rest;
        }
        return next;
      });
      showSuccess("Settlement recorded");
      setSettleTarget(null);
      setSettleAmount("");
      setSettleNote("");
    } catch { showError("Network error"); } finally { setSettling(false); }
  };

  const saveAll = async () => {
    setSavingBatch(true);
    const ids = Object.keys(pendingChanges);
    let failed = 0;
    for (const id of ids) {
      const fields = pendingChanges[id];
      try {
        const res = await fetch(`/api/sales-ledger/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) { failed++; continue; }
        const updated = await res.json();
        setRecords((prev) => prev.map((r) => r._id === id ? { ...r, ...updated } : r));
      } catch { failed++; }
    }
    setPendingChanges({});
    setSavingBatch(false);
    if (failed > 0) showError(`${failed} record(s) failed to save`);
    else showSuccess("All changes saved");
  };

  const discardChanges = () => {
    setPendingChanges({});
    fetchRecords();
    showSuccess("Changes discarded");
  };

  const addNewDay = async () => {
    if (!addDayDate) { showError("Select a date"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/sales-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: addDayDate, locationType, locationId: selectedLocationId }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed" })); showError(err.error || "Failed"); return; }
      showSuccess("New day added");
      setShowAddDay(false);
      setAddDayDate("");
      setPage(1);
      fetchRecords();
    } catch { showError("Network error"); } finally { setAdding(false); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/sales-ledger/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) { showError("Failed"); return; }
    showSuccess("Deleted");
    setDeleteTarget(null);
    fetchRecords();
  };

  const cls = (id: string, field: string) =>
    `w-full px-1.5 py-1 text-xs text-right border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors ${
      pendingChanges[id]?.[field] != null
        ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-800"
        : "border-gray-200 dark:border-gray-600"
    }`;

  const debtorCount = paginatedRecords.reduce((s, r) => s + getDebtors(r).length, 0);
  const debtorTotal = paginatedRecords.reduce((s, r) => s + getDebtors(r).reduce((a, dd) => a + (Number(dd.amount) || 0), 0), 0);
  const bagDebtorTotal = paginatedRecords.reduce((s, r) => s + getDebtors(r).reduce((a, dd) => a + (Number(dd.bags) || 0), 0), 0);
  const unsettledCount = paginatedRecords.reduce((s, r) => s + getDebtors(r).filter((dd) => debtRemaining(dd) > 0).length, 0);
  const bagUnsettledCount = paginatedRecords.reduce((s, r) => s + getDebtors(r).filter((dd) => bagRemaining(dd) > 0).length, 0);
  const transferCount = paginatedRecords.reduce((s, r) => s + getTransfers(r).length, 0);
  const transferTotal = paginatedRecords.reduce((s, r) => s + getTransfers(r).reduce((a, t) => a + (Number(t.amount) || 0), 0), 0);
  const bagsSoldTotal = paginatedRecords.reduce((s, r) => s + bagsSoldOf(r), 0);

  const title = "Sales";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <PageBreadcrumb pageTitle={title} />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Month:</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
          </div>
        </div>
        <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => {
          setAddDayDate(todayStr);
          setShowAddDay(true);
        }}>
          Add New Day
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Entity:</label>
          <select value={locationType} onChange={(e) => setLocationType(e.target.value as EntityType)}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            {ENTITY_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
        {allLocations.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Location:</label>
            <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
              {allLocations.map((loc) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 mb-6">
        {statCards.map((s, i) => (
          <div key={`${s.label}-${i}`} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{s.prefix || ""}{s.value.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1940px] w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Date</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Product</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Unit Price</th>
                {LEDGER_FIELDS.map((f) => (
                  <th key={f.key} className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{f.label}</th>
                ))}
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Bags Sold</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Amount Sold</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Cash Delivered</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Transferred By</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Amount Transferred</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Debtors Name</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Debt (Cash)</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Debt (Bags)</th>
                <th className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={15} className="text-center py-10 text-gray-500">Loading...</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr><td colSpan={15} className="text-center py-10 text-gray-500">No records yet. Click &quot;Add New Day&quot; to start tracking.</td></tr>
              ) : (
                paginatedRecords.map((d) => {
                  const editable = isCurrentDay(d.date);
                  return (
                    <tr key={d._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-1.5 py-1.5 font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">{d.date}</td>
                      <td className="px-1.5 py-1.5">
                        <select value={d.productId ?? ""} onChange={(e) => handleProductChange(d._id, e.target.value)}
                          disabled={!editable}
                          className={`w-full min-w-[110px] px-1.5 py-1 text-xs border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors ${
                            pendingChanges[d._id]?.productId != null
                              ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-800"
                              : "border-gray-200 dark:border-gray-600"
                          } ${!editable ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50" : ""}`}>
                          <option value="">Select Product</option>
                          {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                        </select>
                      </td>
                      <td className="px-1.5 py-1.5">
                        <input type="number" value={d.unitPrice ?? 0}
                          onChange={(e) => handleChange(d._id, "unitPrice", e.target.value)}
                          disabled={!editable} placeholder="₦"
                          className={`${cls(d._id, "unitPrice")} ${!editable ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50" : ""}`} />
                      </td>
                      {LEDGER_FIELDS.map((f) => (
                        <td key={f.key} className="px-1.5 py-1.5">
                          {f.type === "text" ? (
                            <input type="text" value={(d as unknown as Record<string, string>)[f.key] || ""}
                              onChange={(e) => handleChange(d._id, f.key, e.target.value)}
                              placeholder={f.label}
                              className={`${cls(d._id, f.key)} text-left`} />
                          ) : (
                            <input type="number" value={(d as unknown as Record<string, number>)[f.key] ?? 0}
                              onChange={(e) => handleChange(d._id, f.key, e.target.value)}
                              disabled={!editable}
                              className={`${cls(d._id, f.key)} ${!editable ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50" : ""}`} />
                          )}
                        </td>
                      ))}
                      <td className="px-1.5 py-1.5">
                        <div className="w-full px-1.5 py-1 text-xs text-right border rounded border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-gray-800 dark:text-white/90 font-medium min-w-[52px]">
                          {bagsSoldOf(d).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5">
                        <input type="number" value={d.amountSold ?? 0}
                          onChange={(e) => handleAmountSoldChange(d._id, e.target.value)}
                          disabled={!editable} placeholder="₦"
                          className={`${cls(d._id, "amountSold")} ${!editable ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50" : ""}`} />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <input type="number" value={d.cashDelivered ?? 0}
                          onChange={(e) => handleChange(d._id, "cashDelivered", e.target.value)}
                          disabled={!editable} placeholder="₦"
                          className={`${cls(d._id, "cashDelivered")} ${!editable ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50" : ""}`} />
                      </td>
                      <td className="px-1.5 py-1.5 align-top">
                        <div className={`rounded border p-1.5 space-y-1 min-w-[140px] ${pendingChanges[d._id]?.transfers != null ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-800" : "border-gray-200 dark:border-gray-600"}`}>
                          {getTransfers(d).map((tr, ti) => (
                            <div key={ti} className="flex items-center gap-1">
                              <input type="text" value={tr.name}
                                onChange={(e) => handleTransferChange(d._id, ti, "name", e.target.value)}
                                placeholder="Name"
                                className="flex-1 px-1.5 py-1 text-xs text-left border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none border-gray-200 dark:border-gray-600" />
                              <button onClick={() => handleTransferRemove(d._id, ti)}
                                className="text-red-400 hover:text-red-600 text-[10px] leading-none">✕</button>
                            </div>
                          ))}
                          <button onClick={() => handleTransferAdd(d._id)}
                            className="text-[9px] text-brand-500 hover:text-brand-700">+ Add transfer</button>
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 align-top">
                        <div className={`rounded border p-1.5 space-y-1 min-w-[140px] ${pendingChanges[d._id]?.transfers != null ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-800" : "border-gray-200 dark:border-gray-600"}`}>
                          {getTransfers(d).map((tr, ti) => (
                            <div key={ti} className="flex items-center gap-1 justify-end">
                              <input type="number" value={tr.amount ?? 0}
                                onChange={(e) => handleTransferChange(d._id, ti, "amount", e.target.value)}
                                placeholder="₦"
                                className="flex-1 px-1.5 py-1 text-xs text-right border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none border-gray-200 dark:border-gray-600" />
                            </div>
                          ))}
                          {getTransfers(d).length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-1 flex items-center justify-between text-[10px] font-semibold text-gray-800 dark:text-white/90">
                              <span>Total</span>
                              <span>₦{getTransfers(d).reduce((a, t) => a + (Number(t.amount) || 0), 0).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 align-top">
                        <div className={`rounded border p-1.5 space-y-1 min-w-[140px] ${pendingChanges[d._id]?.debtors != null ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-800" : "border-gray-200 dark:border-gray-600"}`}>
                          {getDebtors(d).map((debtor, di) => (
                            <div key={di} className="flex items-center gap-1">
                              <input type="text" value={debtor.name}
                                onChange={(e) => handleDebtorChange(d._id, di, "name", e.target.value)}
                                placeholder="Name"
                                className="flex-1 px-1.5 py-1 text-xs text-left border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none border-gray-200 dark:border-gray-600" />
                              <button onClick={() => handleDebtorRemove(d._id, di)}
                                className="text-red-400 hover:text-red-600 text-[10px] leading-none">✕</button>
                            </div>
                          ))}
                          <button onClick={() => handleDebtorAdd(d._id)}
                            className="text-[9px] text-brand-500 hover:text-brand-700">+ Add debtor</button>
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 align-top">
                        <div className={`rounded border p-1.5 space-y-1 min-w-[140px] ${pendingChanges[d._id]?.debtors != null ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-800" : "border-gray-200 dark:border-gray-600"}`}>
                          {getDebtors(d).map((debtor, di) => (
                            <div key={di} className="flex items-center gap-1 justify-between">
                              <input type="number" value={debtor.amount ?? 0}
                                onChange={(e) => handleDebtorChange(d._id, di, "amount", e.target.value)}
                                placeholder="₦"
                                className="w-20 px-1.5 py-1 text-xs text-right border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none border-gray-200 dark:border-gray-600" />
                              {debtor.name.trim() && Number(debtor.amount) > 0 && debtRemaining(debtor) <= 0 ? (
                                <span className="px-1 py-1 text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded whitespace-nowrap">✓ Settled</span>
                              ) : (
                                <button onClick={() => openSettle(d, di, "cash")}
                                  className="text-[9px] font-medium text-brand-500 hover:text-brand-700 whitespace-nowrap">settle</button>
                              )}
                            </div>
                          ))}
                          {getDebtors(d).length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-1 flex items-center justify-between text-[10px] font-semibold text-gray-800 dark:text-white/90">
                              <span>Total</span>
                              <span>₦{getDebtors(d).reduce((a, dd) => a + (Number(dd.amount) || 0), 0).toLocaleString()}</span>
                            </div>
                          )}
                          {getDebtors(d).filter((dd) => debtRemaining(dd) > 0).length > 0 && (
                            <div className="text-[9px] text-gray-400">{getDebtors(d).filter((dd) => debtRemaining(dd) > 0).length} unsettled</div>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 align-top">
                        <div className={`rounded border p-1.5 space-y-1 min-w-[140px] ${pendingChanges[d._id]?.debtors != null ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-800" : "border-gray-200 dark:border-gray-600"}`}>
                          {getDebtors(d).map((debtor, di) => (
                            <div key={di} className="flex items-center gap-1 justify-between">
                              <input type="number" value={debtor.bags ?? 0}
                                onChange={(e) => handleDebtorChange(d._id, di, "bags", e.target.value)}
                                placeholder="bags"
                                className="w-20 px-1.5 py-1 text-xs text-right border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none border-gray-200 dark:border-gray-600" />
                              {debtor.name.trim() && Number(debtor.bags) > 0 && bagRemaining(debtor) <= 0 ? (
                                <span className="px-1 py-1 text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded whitespace-nowrap">✓ Settled</span>
                              ) : (
                                <button onClick={() => openSettle(d, di, "bags")}
                                  className="text-[9px] font-medium text-brand-500 hover:text-brand-700 whitespace-nowrap">settle</button>
                              )}
                            </div>
                          ))}
                          {getDebtors(d).length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-1 flex items-center justify-between text-[10px] font-semibold text-gray-800 dark:text-white/90">
                              <span>Total</span>
                              <span>{getDebtors(d).reduce((a, dd) => a + (Number(dd.bags) || 0), 0).toLocaleString()} bags</span>
                            </div>
                          )}
                          {getDebtors(d).filter((dd) => bagRemaining(dd) > 0).length > 0 && (
                            <div className="text-[9px] text-gray-400">{getDebtors(d).filter((dd) => bagRemaining(dd) > 0).length} unsettled</div>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5">
                        <button onClick={() => setDeleteTarget(d._id)}
                          className="px-2 py-1 text-[10px] font-medium rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {paginatedRecords.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-white/5 font-bold text-gray-800 dark:text-white/90">
                  <td className="px-1.5 py-2 text-xs">Totals</td>
                  <td className="px-1.5 py-2 text-xs"></td>
                  <td className="px-1.5 py-2 text-xs"></td>
                  {LEDGER_FIELDS.map((f) => (
                    <td key={f.key} className="px-1.5 py-2 text-xs text-right">
                      {paginatedRecords.reduce((s, r) => s + (Number((r as unknown as Record<string, number>)[f.key]) || 0), 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-1.5 py-2 text-xs text-right">{bagsSoldTotal.toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-xs text-right">
                    ₦{paginatedRecords.reduce((s, r) => s + (Number(r.amountSold) || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2 text-xs text-right">
                    ₦{paginatedRecords.reduce((s, r) => s + (Number(r.cashDelivered) || 0), 0).toLocaleString()}
                  </td>
                  <td className="px-1.5 py-2 text-xs text-right">{transferCount} transfer{transferCount !== 1 ? "s" : ""}</td>
                  <td className="px-1.5 py-2 text-xs text-right">₦{transferTotal.toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-xs text-right">{debtorCount} debtor{debtorCount !== 1 ? "s" : ""}</td>
                  <td className="px-1.5 py-2 text-xs text-right">
                    <span>₦{debtorTotal.toLocaleString()}</span>
                    {unsettledCount > 0 && <span className="ml-2 text-red-500 font-normal">{unsettledCount} unsettled</span>}
                  </td>
                  <td className="px-1.5 py-2 text-xs text-right">
                    <span>{bagDebtorTotal.toLocaleString()} bags</span>
                    {bagUnsettledCount > 0 && <span className="ml-2 text-red-500 font-normal">{bagUnsettledCount} unsettled</span>}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          {dirtyCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-500/20">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">{dirtyCount} unsaved change{dirtyCount > 1 ? "s" : ""}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={discardChanges}>Discard</Button>
                <Button size="sm" onClick={saveAll} disabled={savingBatch}>{savingBatch ? "Saving..." : "Update"}</Button>
              </div>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, monthRecords.length)} of {monthRecords.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                  className="px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs rounded border ${p === safePage ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>{p}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                  className="px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddDay && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowAddDay(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add New Day</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" value={addDayDate} onChange={(e) => setAddDayDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAddDay(false)}>Cancel</Button>
              <Button size="sm" disabled={adding} onClick={addNewDay}>{adding ? "Adding..." : "Add Day"}</Button>
            </div>
          </div>
        </div>
      )}

      {settleTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSettleTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 max-h-[90vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Settle Debt {settleTarget.kind === "bags" ? "(Bags)" : "(Cash)"}</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Debtor:</span>
                <span className="font-medium text-gray-800 dark:text-white">{settleTarget.name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date:</span>
                <span className="font-medium text-gray-800 dark:text-white">{settleTarget.date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Debt:</span>
                <span className="font-medium text-red-600">{settleTarget.kind === "bags" ? `${settleTarget.amount.toLocaleString()} bags` : `₦${settleTarget.amount.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Settled So Far:</span>
                <span className="font-medium text-green-600">{settleTarget.kind === "bags" ? `${settleTarget.settled.toLocaleString()} bags` : `₦${settleTarget.settled.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Outstanding:</span>
                <span className="font-bold text-red-600">{settleTarget.kind === "bags" ? `${settleTarget.remaining.toLocaleString()} bags` : `₦${settleTarget.remaining.toLocaleString()}`}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{settleTarget.kind === "bags" ? "Bags Settled (bags)" : "Amount Settled (₦)"}</label>
              <input type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
              <input type="text" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder={settleTarget.kind === "bags" ? "e.g. bags returned" : "e.g. cash payment"}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
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

      <ConfirmDialog isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Delete Day Record" message="This will permanently delete this day's sales record." confirmLabel="Delete" variant="danger" />
    </div>
  );
}
