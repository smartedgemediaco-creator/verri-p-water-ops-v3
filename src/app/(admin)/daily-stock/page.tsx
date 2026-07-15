"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface DayRecord {
  _id: string;
  date: string;
  locationType: "factory" | "depot";
  locationId: string;
  startStock: number;
  bagsProduced: number;
  factorySale: number;
  bigTruck: number;
  returnedBigTruck: number;
  smallTruck1: number;
  returnedSmallTruck1: number;
  smallTruck2: number;
  returnedSmallTruck2: number;
  depot: number;
  tricycle: number;
  shortage: number;
  wastage: number;
  totalSold: number;
  totalReturned: number;
  endStock: number;
  [key: string]: unknown;
}

interface ColumnDef {
  _id: string;
  key: string;
  label: string;
  type: "sale" | "return" | "custom";
  order: number;
}

const BUILTIN_SALE = ["factorySale", "bigTruck", "smallTruck1", "smallTruck2", "depot", "tricycle"];
const BUILTIN_RETURN = ["returnedBigTruck", "returnedSmallTruck1", "returnedSmallTruck2"];

const PAGE_SIZE = 10;

const FACTORY_LOCATIONS = [
  { id: "6a295e6ccdd91fcbe1b7f4b8", name: "Akobo Factory" },
];

const DEPOT_LOCATIONS = [
  { id: "6a295e6ccdd91fcbe1b7f4b9", name: "Ibadan Depot" },
];

export default function DailyStockPage() {
  const searchParams = useSearchParams();
  const locationType = (searchParams.get("type") as "factory" | "depot") || "factory";
  const locations = locationType === "factory" ? FACTORY_LOCATIONS : DEPOT_LOCATIONS;
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || "");
  const isFactory = locationType === "factory";

  const [records, setRecords] = useState<DayRecord[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [addDayDate, setAddDayDate] = useState("");
  const [showAddDay, setShowAddDay] = useState(false);
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);

  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, number>>>({});
  const [savingBatch, setSavingBatch] = useState(false);
  const dirtyCount = Object.keys(pendingChanges).length;

  const [showAddCol, setShowAddCol] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<"sale" | "return" | "custom">("custom");
  const [addColConfirm, setAddColConfirm] = useState(false);
  const [addingCol, setAddingCol] = useState(false);

  const locationParam = useMemo(() => JSON.stringify({ type: locationType, id: selectedLocationId }), [locationType, selectedLocationId]);

  const fetchRecords = useCallback(() => {
    if (!selectedLocationId) return;
    fetch(`/api/daily-stock?location=${encodeURIComponent(locationParam)}`)
      .then((r) => r.json())
      .then((data) => { setRecords(Array.isArray(data) ? data : []); })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [locationParam, selectedLocationId]);

  const fetchColumns = useCallback(() => {
    if (!selectedLocationId) return;
    if (!isFactory) { setColumns([]); return; }
    fetch(`/api/daily-stock/columns?location=${encodeURIComponent(locationParam)}`)
      .then((r) => r.json())
      .then((data) => { setColumns(Array.isArray(data) ? data : []); })
      .catch(() => setColumns([]));
  }, [locationParam, selectedLocationId, isFactory]);

  useEffect(() => { fetchRecords(); fetchColumns(); }, [fetchRecords, fetchColumns]);

  useEffect(() => { setPage(1); setPendingChanges({}); }, [selectedLocationId]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const isCurrentDay = (date: string) => date === todayStr || (latestRecord && date === latestRecord.date && !records.some(r => r.date > date));

  const saleKeys = columns.filter((c) => c.type === "sale").map((c) => c.key);
  const returnKeys = columns.filter((c) => c.type === "return").map((c) => c.key);
  const allSaleKeys = [...BUILTIN_SALE, ...saleKeys];
  const allReturnKeys = [...BUILTIN_RETURN, ...returnKeys];

  const totalDays = records.length;
  const totalProduced = records.reduce((s, r) => s + (Number(r.bagsProduced) || 0), 0);
  const totalSold = records.reduce((s, r) => allSaleKeys.reduce((sum, k) => sum + (Number(r[k]) || 0), s), 0);
  const totalReturned = records.reduce((s, r) => allReturnKeys.reduce((sum, k) => sum + (Number(r[k]) || 0), s), 0);
  const currentEndStock = latestRecord?.endStock ?? 0;

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRecords = records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const calcTotalSold = (d: DayRecord) => allSaleKeys.reduce((sum, k) => sum + (Number(d[k]) || 0), 0);
  const calcTotalReturned = (d: DayRecord) => allReturnKeys.reduce((sum, k) => sum + (Number(d[k]) || 0), 0);
  const calcEndStock = (d: DayRecord) => (Number(d.startStock) || 0) + (Number(d.bagsProduced) || 0) + calcTotalReturned(d) - calcTotalSold(d) - (Number(d.shortage) || 0) - (Number(d.wastage) || 0);

  const handleChange = (id: string, field: string, rawValue: string) => {
    const num = Number(rawValue) || 0;
    setRecords((prev) => prev.map((r) => {
      if (r._id !== id) return r;
      const updated = { ...r, [field]: num };
      updated.totalSold = allSaleKeys.reduce((sum, k) => sum + (Number(updated[k]) || 0), 0);
      updated.totalReturned = allReturnKeys.reduce((sum, k) => sum + (Number(updated[k]) || 0), 0);
      updated.endStock = (Number(updated.startStock) || 0) + (Number(updated.bagsProduced) || 0) + updated.totalReturned - updated.totalSold - (Number(updated.shortage) || 0) - (Number(updated.wastage) || 0);
      return updated;
    }));
    setPendingChanges((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: num },
    }));
  };

  const saveAll = async () => {
    setSavingBatch(true);
    const ids = Object.keys(pendingChanges);
    let failed = 0;
    for (const id of ids) {
      const fields = pendingChanges[id];
      try {
        const res = await fetch(`/api/daily-stock/${id}`, {
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
      const startStock = latestRecord?.endStock ?? 0;
      const res = await fetch("/api/daily-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: addDayDate, startStock, locationType, locationId: selectedLocationId }),
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
    const res = await fetch(`/api/daily-stock/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) { showError("Failed"); return; }
    showSuccess("Deleted");
    setDeleteTarget(null);
    fetchRecords();
  };

  const doAddColumn = async () => {
    if (!newColLabel.trim()) { showError("Enter a column name"); return; }
    setAddingCol(true);
    try {
      const res = await fetch("/api/daily-stock/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newColLabel.trim(), type: newColType, locationType, locationId: selectedLocationId }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed" })); showError(err.error || "Failed"); return; }
      showSuccess(`Column "${newColLabel.trim()}" added`);
      setShowAddCol(false);
      setNewColLabel("");
      setNewColType("custom");
      setAddColConfirm(false);
      fetchColumns();
    } catch { showError("Network error"); } finally { setAddingCol(false); }
  };

  const cls = (id: string, field: string) =>
    `w-full px-1.5 py-1 text-xs text-right border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors ${
      pendingChanges[id]?.[field] != null
        ? "border-amber-400 dark:border-amber-500 ring-1 ring-amber-200 dark:ring-amber-800"
        : "border-gray-200 dark:border-gray-600"
    }`;

  const title = isFactory ? "Daily Stock (Factories)" : "Daily Stock (Depots)";

  const headerCells = [
    "Date", "Start Stock", "Produced", "Factory Sale",
    "Big Truck", "Ret. Big Truck", "Small Truck 1", "Ret. ST1",
    "Small Truck 2", "Ret. ST2", "Depot", "Tricycle",
    "Shortage", "Wastage",
    ...columns.map((c) => c.label),
    "Total Sold", "Total Returned", "End Stock", "Actions",
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={title} />
        <div className="flex gap-2">
          {isFactory && (
            <Button variant="outline" size="sm" onClick={() => { setNewColLabel(""); setNewColType("custom"); setAddColConfirm(false); setShowAddCol(true); }}>
              + Add Column
            </Button>
          )}
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setAddDayDate(tomorrow.toISOString().slice(0, 10));
            setShowAddDay(true);
          }}>
            Add New Day
          </Button>
        </div>
      </div>

      {locations.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Location:</label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        {[
          { label: "Total Days", value: totalDays },
          { label: "Total Produced", value: totalProduced },
          { label: "Total Sold", value: totalSold },
          { label: "Total Returned", value: totalReturned },
          { label: "Current End Stock", value: currentEndStock },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white/90">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {headerCells.map((h) => (
                  <th key={h} className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={headerCells.length} className="text-center py-10 text-gray-500">Loading...</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr><td colSpan={headerCells.length} className="text-center py-10 text-gray-500">No records yet. Click &quot;Add New Day&quot; to start tracking.</td></tr>
              ) : (
                paginatedRecords.map((d) => {
                  const editable = isCurrentDay(d.date);
                  return (
                    <tr key={d._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-1.5 py-1.5 font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">{d.date}</td>
                      <td className="px-1.5 py-1.5">
                        <input type="number" value={d.startStock ?? 0} disabled={!editable}
                          onChange={(e) => handleChange(d._id, "startStock", e.target.value)}
                          className={`${cls(d._id, "startStock")} ${!editable ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50" : ""}`} />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <input type="number" value={(d.bagsProduced ?? 0) as number}
                          onChange={(e) => handleChange(d._id, "bagsProduced", e.target.value)}
                          className={cls(d._id, "bagsProduced")} />
                      </td>
                      {(["factorySale", "bigTruck", "returnedBigTruck", "smallTruck1", "returnedSmallTruck1", "smallTruck2", "returnedSmallTruck2", "depot", "tricycle", "shortage", "wastage"] as const).map((f) => (
                        <td key={f} className="px-1.5 py-1.5">
                          <input type="number" value={(d as unknown as Record<string, number>)[f] ?? 0}
                            onChange={(e) => handleChange(d._id, f, e.target.value)}
                            className={cls(d._id, f)} />
                        </td>
                      ))}
                      {columns.map((col) => (
                        <td key={col.key} className="px-1.5 py-1.5">
                          <input type="number" value={(d as unknown as Record<string, number>)[col.key] ?? 0}
                            onChange={(e) => handleChange(d._id, col.key, e.target.value)}
                            className={cls(d._id, col.key)} />
                        </td>
                      ))}
                      <td className="px-1.5 py-1.5 text-right font-semibold text-gray-800 dark:text-white/90">{calcTotalSold(d).toLocaleString()}</td>
                      <td className="px-1.5 py-1.5 text-right font-semibold text-gray-800 dark:text-white/90">{calcTotalReturned(d).toLocaleString()}</td>
                      <td className="px-1.5 py-1.5 text-right font-bold text-brand-600 dark:text-brand-400">{calcEndStock(d).toLocaleString()}</td>
                      <td className="px-1.5 py-1.5">
                        <button onClick={() => setDeleteTarget(d._id)} className="text-red-500 hover:text-red-700 text-xs">Del</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && records.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold text-gray-800 dark:text-white/90">
                  <td className="px-1.5 py-2">Totals</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (Number(r.startStock) || 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (Number(r.bagsProduced) || 0), 0).toLocaleString()}</td>
                  {(["factorySale", "bigTruck", "returnedBigTruck", "smallTruck1", "returnedSmallTruck1", "smallTruck2", "returnedSmallTruck2", "depot", "tricycle", "shortage", "wastage"] as const).map((f) => (
                    <td key={f} className="px-1.5 py-2 text-right">
                      {records.reduce((s, r) => s + (Number((r as unknown as Record<string, number>)[f]) || 0), 0).toLocaleString()}
                    </td>
                  ))}
                  {columns.map((col) => (
                    <td key={col.key} className="px-1.5 py-2 text-right">
                      {records.reduce((s, r) => s + (Number((r as unknown as Record<string, number>)[col.key]) || 0), 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-1.5 py-2 text-right">{totalSold.toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{totalReturned.toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{currentEndStock.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          {dirtyCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-500/20">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                {dirtyCount} unsaved change{dirtyCount > 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={discardChanges}>Discard</Button>
                <Button size="sm" onClick={saveAll} disabled={savingBatch}>
                  {savingBatch ? "Saving..." : "Update"}
                </Button>
              </div>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, records.length)} of {records.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs rounded border ${p === safePage
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddDay && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowAddDay(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add New Day</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" value={addDayDate} onChange={(e) => setAddDayDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            </div>
            {latestRecord && (
              <p className="text-xs text-gray-400">Start stock will be set to previous day&apos;s end stock: <strong>{latestRecord.endStock.toLocaleString()}</strong></p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAddDay(false)}>Cancel</Button>
              <Button size="sm" disabled={adding} onClick={addNewDay}>{adding ? "Adding..." : "Add Day"}</Button>
            </div>
          </div>
        </div>
      )}

      {showAddCol && isFactory && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowAddCol(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add Column</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Add a new truck, tricycle, or tracking column. It will appear on all days.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Column Name</label>
              <input type="text" value={newColLabel} onChange={(e) => setNewColLabel(e.target.value)} placeholder="e.g. Truck 3, Van 1"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <div className="flex gap-2">
                {(["custom", "sale", "return"] as const).map((t) => (
                  <button key={t} onClick={() => setNewColType(t)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${newColType === t
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                    }`}>
                    {t === "custom" ? "General" : t === "sale" ? "Counts as Sale" : "Counts as Return"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {newColType === "sale" ? "This column will be added to Total Sold" : newColType === "return" ? "This column will be added to Total Returned" : "Standalone column — won't affect totals"}
              </p>
            </div>
            {!addColConfirm ? (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowAddCol(false)}>Cancel</Button>
                <Button size="sm" onClick={() => setAddColConfirm(true)}>Next</Button>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Confirm new column</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Add &quot;<strong>{newColLabel}</strong>&quot; ({newColType}) to the daily stock tracker? This will appear as a new editable column on all existing and future days.
                </p>
                <div className="flex gap-2 justify-end mt-3">
                  <Button variant="outline" size="sm" onClick={() => setAddColConfirm(false)}>Back</Button>
                  <Button size="sm" disabled={addingCol} onClick={doAddColumn}>{addingCol ? "Adding..." : "Confirm Add"}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Day Record"
        message="This will permanently delete this day's record."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
