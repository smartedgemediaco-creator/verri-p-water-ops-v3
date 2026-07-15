"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback, useRef } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface DayRecord {
  _id: string;
  date: string;
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
}

const EDITABLE_FIELDS = ["bagsProduced", "factorySale", "bigTruck", "returnedBigTruck", "smallTruck1", "returnedSmallTruck1", "smallTruck2", "returnedSmallTruck2", "depot", "tricycle", "shortage", "wastage"] as const;
const START_STOCK_FIELDS = ["startStock"] as const;

function calcTotalSold(d: DayRecord) {
  return (d.factorySale ?? 0) + (d.bigTruck ?? 0) + (d.smallTruck1 ?? 0) + (d.smallTruck2 ?? 0) + (d.depot ?? 0) + (d.tricycle ?? 0);
}
function calcTotalReturned(d: DayRecord) {
  return (d.returnedBigTruck ?? 0) + (d.returnedSmallTruck1 ?? 0) + (d.returnedSmallTruck2 ?? 0);
}
function calcEndStock(d: DayRecord) {
  return (d.startStock ?? 0) + (d.bagsProduced ?? 0) + calcTotalReturned(d) - calcTotalSold(d) - (d.shortage ?? 0) - (d.wastage ?? 0);
}

export default function DailyStockPage() {
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [addDayDate, setAddDayDate] = useState("");
  const [showAddDay, setShowAddDay] = useState(false);
  const [adding, setAdding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ id: string; field: string; value: number } | null>(null);

  const fetchRecords = useCallback(() => {
    fetch("/api/daily-stock")
      .then((r) => r.json())
      .then((data) => { setRecords(Array.isArray(data) ? data : []); })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const isCurrentDay = (date: string) => date === todayStr || (latestRecord && date === latestRecord.date && !records.some(r => r.date > date));

  const totalDays = records.length;
  const totalProduced = records.reduce((s, r) => s + (r.bagsProduced ?? 0), 0);
  const totalSold = records.reduce((s, r) => s + calcTotalSold(r), 0);
  const totalReturned = records.reduce((s, r) => s + calcTotalReturned(r), 0);
  const currentEndStock = latestRecord?.endStock ?? 0;

  const doAutoSave = async (id: string, field: string, value: number) => {
    setSaving(`${id}-${field}`);
    try {
      const res = await fetch(`/api/daily-stock/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) { showError("Failed to save"); return; }
      const updated = await res.json();
      setRecords((prev) => prev.map((r) => r._id === id ? { ...r, ...updated } : r));
    } catch { showError("Save failed"); }
    finally { setSaving(null); }
  };

  const handleChange = (id: string, field: string, rawValue: string) => {
    const num = Number(rawValue) || 0;
    setRecords((prev) => prev.map((r) => {
      if (r._id !== id) return r;
      const updated = { ...r, [field]: num };
      const totalSold = (updated.factorySale ?? 0) + (updated.bigTruck ?? 0) + (updated.smallTruck1 ?? 0) + (updated.smallTruck2 ?? 0) + (updated.depot ?? 0) + (updated.tricycle ?? 0);
      const totalReturned = (updated.returnedBigTruck ?? 0) + (updated.returnedSmallTruck1 ?? 0) + (updated.returnedSmallTruck2 ?? 0);
      updated.totalSold = totalSold;
      updated.totalReturned = totalReturned;
      updated.endStock = (updated.startStock ?? 0) + (updated.bagsProduced ?? 0) + totalReturned - totalSold - (updated.shortage ?? 0) - (updated.wastage ?? 0);
      return updated;
    }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    pendingSaveRef.current = { id, field, value: num };
    debounceRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        doAutoSave(pendingSaveRef.current.id, pendingSaveRef.current.field, pendingSaveRef.current.value);
        pendingSaveRef.current = null;
      }
    }, 600);
  };

  const handleStartStockChange = (id: string, rawValue: string) => {
    handleChange(id, "startStock", rawValue);
  };

  const addNewDay = async () => {
    if (!addDayDate) { showError("Select a date"); return; }
    setAdding(true);
    try {
      const startStock = latestRecord?.endStock ?? 0;
      const res = await fetch("/api/daily-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: addDayDate, startStock }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed" })); showError(err.error || "Failed"); return; }
      showSuccess("New day added");
      setShowAddDay(false);
      setAddDayDate("");
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

  const cls = (id: string, field: string) =>
    `w-full px-1.5 py-1 text-xs text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors ${saving === `${id}-${field}` ? "ring-2 ring-emerald-400 border-emerald-400" : ""}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Daily Stock Tracker" />
        <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setAddDayDate(tomorrow.toISOString().slice(0, 10));
          setShowAddDay(true);
        }}>
          Add New Day
        </Button>
      </div>

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
                {[
                  "Date", "Start Stock", "Produced", "Factory Sale",
                  "Big Truck", "Ret. Big Truck",
                  "Small Truck 1", "Ret. ST1",
                  "Small Truck 2", "Ret. ST2",
                  "Depot", "Tricycle",
                  "Shortage", "Wastage",
                  "Total Sold", "Total Returned", "End Stock", "Actions"
                ].map((h) => (
                  <th key={h} className="px-1.5 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={18} className="text-center py-10 text-gray-500">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={18} className="text-center py-10 text-gray-500">No records yet. Click &quot;Add New Day&quot; to start tracking.</td></tr>
              ) : (
                records.map((d) => {
                  const editable = isCurrentDay(d.date);
                  return (
                    <tr key={d._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-1.5 py-1.5 font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">{d.date}</td>
                      <td className="px-1.5 py-1.5">
                        <input type="number" value={d.startStock ?? 0} disabled={!editable}
                          onChange={(e) => handleStartStockChange(d._id, e.target.value)}
                          className={`${cls(d._id, "startStock")} ${!editable ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-700/50" : ""}`} />
                      </td>
                      {(["bagsProduced", "factorySale", "bigTruck", "returnedBigTruck", "smallTruck1", "returnedSmallTruck1", "smallTruck2", "returnedSmallTruck2", "depot", "tricycle", "shortage", "wastage"] as const).map((f) => (
                        <td key={f} className="px-1.5 py-1.5">
                          <input type="number" value={(d as unknown as Record<string, number>)[f] ?? 0}
                            onChange={(e) => handleChange(d._id, f, e.target.value)}
                            className={cls(d._id, f)} />
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
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.startStock ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{totalProduced.toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.factorySale ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.bigTruck ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.returnedBigTruck ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.smallTruck1 ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.returnedSmallTruck1 ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.smallTruck2 ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.returnedSmallTruck2 ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.depot ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.tricycle ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.shortage ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{records.reduce((s, r) => s + (r.wastage ?? 0), 0).toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{totalSold.toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{totalReturned.toLocaleString()}</td>
                  <td className="px-1.5 py-2 text-right">{currentEndStock.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
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
