"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { showSuccess, showError } from "@/lib/toast";
import StaffAvatar from "@/components/ui/StaffAvatar";

interface StaffRow {
  staffId: string;
  name: string;
  avatar?: string | null;
  role: string;
  dailyRate: number;
}

interface ProductOption {
  _id: string;
  name: string;
  unit: string;
}

interface ProductionEntry {
  staffId: string;
  name: string;
  avatar?: string | null;
  rate: number;
  bagsProduced: number;
  productId: string;
  notes: string;
}

interface SavedRecord {
  _id: string;
  staffId: string | { _id: string };
  staffName: string;
  productId: string | { _id: string };
  productName: string;
  bagsProduced: number;
  rate: number;
  totalEarned: number;
  date: string;
}

export default function DailyProductionPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [locations, setLocations] = useState<{ type: string; id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState({ type: "", id: "" });
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultProductId, setDefaultProductId] = useState("");

  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [editTarget, setEditTarget] = useState<SavedRecord | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editProductId, setEditProductId] = useState("");
  const [editBags, setEditBags] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/factories").then((r) => r.json()),
      fetch("/api/depots").then((r) => r.json()),
    ]).then(([factories, depots]) => {
      const locs: { type: string; id: string; name: string }[] = [];
      if (Array.isArray(factories)) factories.forEach((f: { _id: string; name: string }) => locs.push({ type: "factory", id: f._id, name: f.name }));
      if (Array.isArray(depots)) depots.forEach((d: { _id: string; name: string }) => locs.push({ type: "depot", id: d._id, name: d.name }));
      setLocations(locs);
      if (locs.length > 0) setSelectedLocation({ type: locs[0].type, id: locs[0].id });
    }).catch(() => {});

    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data.map((p: { _id: string; name: string; unit?: string }) => ({ _id: p._id, name: p.name, unit: p.unit || "" })));
          if (data.length > 0) setDefaultProductId(data[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchDailyStaff = useCallback(async () => {
    if (!selectedLocation.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff?locationType=${selectedLocation.type}&locationId=${selectedLocation.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const dailyWorkers = data.filter((s: StaffRow & { employmentType: string; isActive?: boolean }) => s.employmentType === "daily" && s.isActive);
        setEntries(dailyWorkers.map((s: StaffRow & { _id: string }) => ({
          staffId: s._id,
          name: s.name,
          avatar: s.avatar,
          rate: s.dailyRate || 10,
          bagsProduced: 0,
          productId: defaultProductId,
          notes: "",
        })));
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, defaultProductId]);

  useEffect(() => { fetchDailyStaff(); }, [fetchDailyStaff]);

  const fetchSavedRecords = useCallback(async () => {
    if (!viewMonth) return;
    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/daily-production?month=${viewMonth}`);
      const data = await res.json();
      setSavedRecords(Array.isArray(data) ? data : []);
    } catch {
      setSavedRecords([]);
    } finally {
      setLoadingSaved(false);
    }
  }, [viewMonth]);

  useEffect(() => { fetchSavedRecords(); }, [fetchSavedRecords]);

  const updateEntry = (idx: number, field: keyof ProductionEntry, value: unknown) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const totalBags = entries.reduce((s, e) => s + (Number(e.bagsProduced) || 0), 0);
  const totalEarned = entries.reduce((s, e) => s + (Number(e.bagsProduced) || 0) * (Number(e.rate) || 0), 0);

  const saveAll = async () => {
    const toSave = entries.filter((e) => (Number(e.bagsProduced) || 0) > 0);
    if (toSave.length === 0) { showError("Enter bags produced for at least one worker"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/daily-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: toSave.map((e) => ({
            staffId: e.staffId,
            date: selectedDate,
            productId: e.productId,
            bagsProduced: Number(e.bagsProduced) || 0,
            rate: Number(e.rate) || 0,
            notes: e.notes,
          })),
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed" })); showError(err.error || "Failed to save"); return; }
      showSuccess(`Saved production for ${toSave.length} worker(s)`);
      setEntries((prev) => prev.map((e) => ({ ...e, bagsProduced: 0, notes: "" })));
      fetchSavedRecords();
    } catch { showError("Network error"); } finally { setSaving(false); }
  };

  const deleteRecord = async (id: string) => {
    const res = await fetch(`/api/daily-production/${id}`, { method: "DELETE" });
    if (!res.ok) { showError("Failed to delete"); return; }
    showSuccess("Record deleted");
    fetchSavedRecords();
  };

  const openEdit = (r: SavedRecord) => {
    setEditTarget(r);
    const pid = typeof r.productId === "object" ? r.productId._id : r.productId;
    setEditDate(new Date(r.date).toISOString().slice(0, 10));
    setEditProductId(pid || (products.length > 0 ? products[0]._id : ""));
    setEditBags(String(r.bagsProduced));
    setEditRate(String(r.rate));
    setEditNotes("");
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    const bags = Number(editBags) || 0;
    const rate = Number(editRate) || 0;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/daily-production/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editDate,
          productId: editProductId,
          bagsProduced: bags,
          rate,
          notes: editNotes,
        }),
      });
      if (!res.ok) { showError("Failed to update"); return; }
      showSuccess("Record updated");
      setEditTarget(null);
      fetchSavedRecords();
    } catch { showError("Network error"); }
    finally { setEditSaving(false); }
  };

  const groupedByDate = savedRecords.reduce<Record<string, SavedRecord[]>>((acc, r) => {
    const d = new Date(r.date).toISOString().slice(0, 10);
    (acc[d] ??= []).push(r);
    return acc;
  }, {});

  const staffMonthlyTotals = savedRecords.reduce<Record<string, { bags: number; earned: number }>>((acc, r) => {
    if (!acc[r.staffName]) acc[r.staffName] = { bags: 0, earned: 0 };
    acc[r.staffName].bags += (r.bagsProduced || 0);
    acc[r.staffName].earned += (r.totalEarned || 0);
    return acc;
  }, {});

  const monthTotals = savedRecords.reduce(
    (acc, r) => ({ bags: acc.bags + (r.bagsProduced || 0), earned: acc.earned + (r.totalEarned || 0) }),
    { bags: 0, earned: 0 }
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Daily Staff Pay" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSavedRecords}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Location</label>
          <select value={`${selectedLocation.type}:${selectedLocation.id}`}
            onChange={(e) => {
              const [type, id] = e.target.value.split(":");
              setSelectedLocation({ type, id });
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            {locations.map((l) => (<option key={`${l.type}:${l.id}`} value={`${l.type}:${l.id}`}>{l.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product</label>
          <select value={defaultProductId} onChange={(e) => {
            setDefaultProductId(e.target.value);
            setEntries((prev) => prev.map((en) => ({ ...en, productId: e.target.value })));
          }}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            {products.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Workers</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{entries.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Bags (today)</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalBags.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Earned (today)</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">₦{totalEarned.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Month Bags</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{monthTotals.bags.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">Month Paid</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">₦{monthTotals.earned.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Record Daily Pay — {selectedDate}</h3>
          <Button size="sm" disabled={saving || entries.length === 0} onClick={saveAll}>
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400"></th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Staff Name</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Rate (₦/bag)</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Bags Produced</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Earned (₦)</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500">Loading workers...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500">No casual/daily workers found at this location.</td></tr>
              ) : (
                entries.map((e, i) => {
                  const earned = (Number(e.bagsProduced) || 0) * (Number(e.rate) || 0);
                  return (
                    <tr key={e.staffId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2"><StaffAvatar src={e.avatar} name={e.name} size="sm" /></td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-white/90">{e.name}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={e.rate} onChange={(ev) => updateEntry(i, "rate", Number(ev.target.value) || 0)}
                          className="w-20 px-2 py-1 text-xs text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 outline-none" />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" value={e.bagsProduced || ""} onChange={(ev) => updateEntry(i, "bagsProduced", Number(ev.target.value) || 0)}
                          placeholder="0"
                          className="w-24 px-2 py-1 text-xs text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 outline-none" />
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${earned > 0 ? "text-brand-600 dark:text-brand-400" : "text-gray-400"}`}>
                        ₦{earned.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={e.notes} onChange={(ev) => updateEntry(i, "notes", ev.target.value)}
                          placeholder="Optional"
                          className="w-32 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 outline-none" />
                      </td>
                    </tr>
                  );
                })
              )}
              {entries.length > 0 && (
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-white/5 font-bold text-gray-800 dark:text-white/90">
                  <td className="px-3 py-2" colSpan={3}>Totals</td>
                  <td className="px-3 py-2 text-right text-xs"></td>
                  <td className="px-3 py-2 text-right text-xs">{totalBags.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-xs text-brand-600 dark:text-brand-400">₦{totalEarned.toLocaleString()}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Pay Records</h3>
          <input type="month" value={viewMonth} onChange={(e) => setViewMonth(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Staff</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Product</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Bags</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Total Bags</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Rate</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Earned</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Total Paid</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingSaved ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-500">Loading...</td></tr>
              ) : Object.keys(groupedByDate).length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-500">No records for this month.</td></tr>
              ) : (
                Object.entries(groupedByDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, recs]) => (
                  recs.map((r, i) => (
                    <tr key={r._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                      {i === 0 ? (
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-white/90 whitespace-nowrap" rowSpan={recs.length}>{date}</td>
                      ) : null}
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.staffName}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{r.productName}</td>
                      <td className="px-3 py-2 text-right text-gray-800 dark:text-white/90">{r.bagsProduced.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-800 dark:text-white/90 font-medium">{(staffMonthlyTotals[r.staffName]?.bags || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">₦{r.rate.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-brand-600 dark:text-brand-400">₦{r.totalEarned.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-600 dark:text-green-400">₦{(staffMonthlyTotals[r.staffName]?.earned || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(r)} className="text-[10px] font-medium px-2 py-0.5 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 transition-colors">Edit</button>
                          <button onClick={() => deleteRecord(r._id)} className="text-[10px] font-medium px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 transition-colors">Del</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ))
              )}
            </tbody>
            {Object.keys(groupedByDate).length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-white/5 font-bold text-gray-800 dark:text-white/90">
                  <td className="px-3 py-2.5" colSpan={3}>Totals ({savedRecords.length} records)</td>
                  <td className="px-3 py-2.5 text-right">{monthTotals.bags.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right"></td>
                  <td className="px-3 py-2.5 text-right"></td>
                  <td className="px-3 py-2.5 text-right text-brand-600 dark:text-brand-400">₦{monthTotals.earned.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-green-600 dark:text-green-400">₦{monthTotals.earned.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Edit Record</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Staff</label>
                <div className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 font-medium">{editTarget.staffName}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <select value={editProductId} onChange={(e) => setEditProductId(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10">
                  {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bags Produced</label>
                  <input type="number" value={editBags} onChange={(e) => setEditBags(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Rate (₦/bag)</label>
                  <input type="number" value={editRate} onChange={(e) => setEditRate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Earned</label>
                <div className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-brand-600 dark:text-brand-400 font-bold">
                  ₦{((Number(editBags) || 0) * (Number(editRate) || 0)).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes..."
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button size="sm" onClick={submitEdit} disabled={editSaving}>{editSaving ? "Saving..." : "Update"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
