"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AutoAmount from "@/components/ui/AutoAmount";
import Badge from "@/components/ui/badge/Badge";
import { PlusIcon, TrashBinIcon, PencilIcon, BoxIcon, GroupIcon, CloseIcon, DollarLineIcon, ArrowDownIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import { formatDate } from "@/lib/dateFormat";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface RawMaterial {
  _id: string;
  name: string;
  unit: string;
  stockUnit: string;
  conversionRate: number;
  category: "chemical" | "packaging" | "filter" | "label" | "other";
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  supplierId: { _id: string; name: string; phone?: string; whatsapp?: string } | null;
  totalReceived: number;
  totalConsumed: number;
  lastReceivedDate?: string;
  lastConsumedDate?: string;
  totalBatchStock: number;
  averageCost: number;
  batchCount: number;
  notes: string;
}

interface StockMovement {
  _id: string;
  type: string;
  quantity: number;
  unit: string;
  unitCost: number;
  reference: string;
  notes: string;
  performedBy: string;
  createdAt: string;
}

interface Stats {
  totalMaterials: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  totalReceived: number;
  totalConsumed: number;
  pendingOrders: number;
  unpaidOrders: number;
}

const CATEGORIES = [
  { value: "chemical", label: "Chemical" },
  { value: "packaging", label: "Packaging" },
  { value: "filter", label: "Filter" },
  { value: "label", label: "Label" },
  { value: "other", label: "Other" },
];

const CONSUMPTION_TYPES = [
  { value: "consumption", label: "Production Use" },
  { value: "waste", label: "Waste / Damaged" },
  { value: "adjustment", label: "Manual Adjustment" },
  { value: "return", label: "Return to Supplier" },
];

const movementTypeColors: Record<string, string> = {
  purchase: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  consumption: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  adjustment: "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  waste: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  return: "bg-theme-pink-50 text-theme-pink-700 dark:bg-theme-pink-500/10 dark:text-theme-pink-400",
  correction: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementTarget, setMovementTarget] = useState<RawMaterial | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementLoading, setMovementLoading] = useState(false);
  const [stockTarget, setStockTarget] = useState<string | null>(null);
  const [stockAmount, setStockAmount] = useState(0);
  const [consumeTarget, setConsumeTarget] = useState<RawMaterial | null>(null);
  const [consumeAmount, setConsumeAmount] = useState(0);
  const [consumeType, setConsumeType] = useState("consumption");
  const [consumeNotes, setConsumeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<RawMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [stockUnit, setStockUnit] = useState("");
  const [conversionRate, setConversionRate] = useState(1);
  const [category, setCategory] = useState("chemical");
  const [currentStock, setCurrentStock] = useState(0);
  const [minimumStock, setMinimumStock] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");

  const { ref: pdfRef, loading: pdfLoading, download: downloadPdf } = usePdfDownload("raw-materials-list", { title: "Raw Materials Report" });

  const fetchMaterials = () => {
    setLoading(true);
    fetch("/api/raw-materials")
      .then((r) => r.json())
      .then((data) => setMaterials(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    fetch("/api/raw-materials/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  };

  const fetchSuppliers = () => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) => {
        if (Array.isArray(data)) setSuppliers(data.map((s) => ({ value: s._id, label: s.name })));
      });
  };

  useEffect(() => { fetchMaterials(); fetchSuppliers(); fetchStats(); }, []);

  const resetForm = () => {
    setName(""); setUnit(""); setStockUnit(""); setConversionRate(1); setCategory("chemical");
    setCurrentStock(0); setMinimumStock(0); setUnitCost(0); setSupplierId(""); setNotes("");
  };

  const openEdit = (m: RawMaterial) => {
    setEditTarget(m); setName(m.name); setUnit(m.unit); setStockUnit(m.stockUnit);
    setConversionRate(m.conversionRate); setCategory(m.category); setCurrentStock(m.currentStock);
    setMinimumStock(m.minimumStock); setUnitCost(m.unitCost); setSupplierId(m.supplierId?._id ?? "");
    setNotes(m.notes); setShowModal(true);
  };

  const openAdd = () => { setEditTarget(null); resetForm(); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showError("Name is required"); return; }
    setSubmitting(true);
    try {
      const url = editTarget ? `/api/raw-materials/${editTarget._id}` : "/api/raw-materials";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editTarget
          ? { name: name.trim(), unit, stockUnit, conversionRate, category, minimumStock, unitCost, supplierId: supplierId || undefined, notes }
          : { name: name.trim(), unit, stockUnit, conversionRate, category, currentStock, minimumStock, unitCost, supplierId: supplierId || undefined, notes }
        ),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Operation failed"); return; }
      showSuccess(editTarget ? "Material updated" : "Material added");
      setShowModal(false); setEditTarget(null); resetForm(); fetchMaterials(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/raw-materials/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to delete"); return; }
      showSuccess("Material deleted"); setDeleteTarget(null); fetchMaterials(); fetchStats();
    } catch { showError("Network error"); }
  };

  const handleRecordStock = async () => {
    if (!stockTarget || stockAmount <= 0) { showError("Enter a valid quantity"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${stockTarget}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: stockAmount }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to record stock"); return; }
      showSuccess("Stock recorded"); setShowStockModal(false); setStockTarget(null); setStockAmount(0);
      fetchMaterials(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const handleConsume = async () => {
    if (!consumeTarget || consumeAmount <= 0) { showError("Enter a valid quantity"); return; }
    if (consumeAmount > consumeTarget.currentStock) { showError(`Insufficient stock. Available: ${consumeTarget.currentStock} ${consumeTarget.unit}`); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${consumeTarget._id}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: consumeAmount, type: consumeType, notes: consumeNotes }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to record consumption"); return; }
      showSuccess("Consumption recorded"); setShowConsumeModal(false); setConsumeTarget(null);
      setConsumeAmount(0); setConsumeType("consumption"); setConsumeNotes("");
      fetchMaterials(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const openMovements = async (m: RawMaterial) => {
    setMovementTarget(m); setShowMovementModal(true); setMovementLoading(true);
    try {
      const res = await fetch(`/api/raw-materials/${m._id}/movements?limit=30`);
      const data = await res.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch { setMovements([]); } finally { setMovementLoading(false); }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.supplierId?.name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || m.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [materials, search, categoryFilter]);

  const lowStockItems = materials.filter((m) => m.currentStock < m.minimumStock && m.minimumStock > 0);
  const outOfStockItems = materials.filter((m) => m.currentStock <= 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Raw Materials" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => { fetchMaterials(); fetchStats(); }}>Refresh</Button>
          <Button variant="outline" size="sm" onClick={downloadPdf} disabled={pdfLoading}>{pdfLoading ? "Generating..." : "Download PDF"}</Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={openAdd}>Add Material</Button>
        </div>
      </div>

      <div ref={pdfRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg dark:bg-teal-500/10 mb-3">
            <BoxIcon className="text-teal-600 size-5 dark:text-teal-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Materials</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.totalMaterials ?? materials.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <GroupIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.lowStockCount ?? lowStockItems.length}</h4>
          {lowStockItems.length > 0 && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{lowStockItems.map((m) => m.name).join(", ")}</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-3">
            <GroupIcon className="text-orange-600 size-5 dark:text-orange-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.outOfStockCount ?? outOfStockItems.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <DollarLineIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock Value</p>
          <AutoAmount value={`₦${(stats?.totalStockValue ?? 0).toLocaleString()}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Received</p>
          <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">{(stats?.totalReceived ?? 0).toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Consumed</p>
          <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">{(stats?.totalConsumed ?? 0).toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pending POs</p>
          <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.pendingOrders ?? 0}</h4>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input placeholder="Search by name or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-48">
          <Select options={[{ value: "", label: "All Categories" }, ...CATEGORIES]} value={categoryFilter} onChange={setCategoryFilter} />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowModal(false); setEditTarget(null); resetForm(); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{editTarget ? "Edit Material" : "Add Material"}</h3>
              <button onClick={() => { setShowModal(false); setEditTarget(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <Input placeholder="Material name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <Select options={CATEGORIES} value={category} onChange={setCategory} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit (primary)</label>
                  <Input placeholder="e.g. kg, litres" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Unit (optional)</label>
                  <Input placeholder="e.g. rolls, bags" value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conversion Rate</label>
                  <Input type="number" placeholder="kg per roll" value={conversionRate} onChange={(e) => setConversionRate(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                  <Select options={suppliers} placeholder="Select supplier" value={supplierId} onChange={setSupplierId} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <Input type="number" placeholder="0" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Stock</label>
                  <Input type="number" placeholder="0" value={currentStock} onChange={(e) => setCurrentStock(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Stock</label>
                  <Input type="number" placeholder="0" value={minimumStock} onChange={(e) => setMinimumStock(Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-gray-400 dark:text-gray-500 pb-1">Set min stock to trigger low-stock email alerts automatically.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={notes} onChange={setNotes} rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowModal(false); setEditTarget(null); resetForm(); }} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update" : "Add Material"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowStockModal(false); setStockTarget(null); setStockAmount(0); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Add Stock</h3>
              <button onClick={() => { setShowStockModal(false); setStockTarget(null); setStockAmount(0); }} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter the quantity to add to current stock. This creates a stock movement record.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Add</label>
                <Input type="number" placeholder="0" value={stockAmount} onChange={(e) => setStockAmount(Number(e.target.value))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowStockModal(false); setStockTarget(null); setStockAmount(0); }} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleRecordStock} disabled={submitting || stockAmount <= 0}>{submitting ? "Saving..." : "Record Stock"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConsumeModal && consumeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowConsumeModal(false); setConsumeTarget(null); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Record Consumption</h3>
              <button onClick={() => { setShowConsumeModal(false); setConsumeTarget(null); }} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <p className="text-gray-600 dark:text-gray-300"><strong>{consumeTarget.name}</strong></p>
                <p className="text-gray-500 dark:text-gray-400">Available: <strong>{consumeTarget.currentStock.toLocaleString()}</strong> {consumeTarget.unit}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <Select options={CONSUMPTION_TYPES} value={consumeType} onChange={setConsumeType} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <Input type="number" placeholder="0" value={consumeAmount} onChange={(e) => setConsumeAmount(Number(e.target.value))} />
                {consumeAmount > 0 && consumeTarget && (
                  <p className={`text-xs mt-1 ${consumeAmount > consumeTarget.currentStock ? "text-red-500" : "text-gray-400"}`}>
                    {consumeAmount > consumeTarget.currentStock ? "Exceeds available stock!" : `Remaining: ${(consumeTarget.currentStock - consumeAmount).toLocaleString()} ${consumeTarget.unit}`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <Input placeholder="Reason or reference..." value={consumeNotes} onChange={(e) => setConsumeNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowConsumeModal(false); setConsumeTarget(null); }} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleConsume} disabled={submitting || consumeAmount <= 0}>{submitting ? "Saving..." : "Record Consumption"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMovementModal && movementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowMovementModal(false); setMovementTarget(null); setMovements([]); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Stock History — {movementTarget.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Received: {(movementTarget.totalReceived ?? 0).toLocaleString()} {movementTarget.unit} | Consumed: {(movementTarget.totalConsumed ?? 0).toLocaleString()} {movementTarget.unit}</p>
              </div>
              <button onClick={() => { setShowMovementModal(false); setMovementTarget(null); setMovements([]); }} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6">
              {movementLoading ? (
                <p className="text-center py-8 text-gray-500 text-sm">Loading...</p>
              ) : movements.length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-sm">No stock movements recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Qty</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Reference</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">By</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((mv) => (
                      <TableRow key={mv._id}>
                        <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(mv.createdAt)}</TableCell>
                        <TableCell className="py-2">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${movementTypeColors[mv.type] || ""}`}>{mv.type}</span>
                        </TableCell>
                        <TableCell className={`py-2 text-theme-sm font-medium ${mv.quantity > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {mv.quantity > 0 ? "+" : ""}{mv.quantity.toLocaleString()} {mv.unit}
                        </TableCell>
                        <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{mv.reference || "—"}</TableCell>
                        <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{mv.performedBy || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Stock</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Min</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Batches</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Value</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={10}>Loading...</TableCell></TableRow>
            ) : filteredMaterials.length === 0 ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={10}>{materials.length === 0 ? "No raw materials found. Click \"Add Material\" to create one." : "No materials match your search."}</TableCell></TableRow>
            ) : (
              filteredMaterials.map((m) => {
                const isLow = m.minimumStock > 0 && m.currentStock < m.minimumStock;
                const isOut = m.currentStock <= 0;
                return (
                  <TableRow key={m._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 text-theme-sm font-medium">
                      <Link href={`/raw-materials/${m._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{m.name}</Link>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {m.unit || "—"}
                      {m.stockUnit && <span className="text-xs text-gray-400 ml-1">({m.stockUnit})</span>}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{m.category}</TableCell>
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{(m.currentStock ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(m.minimumStock ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {m.batchCount > 0 ? (
                        <Link href={`/raw-materials/${m._id}?tab=batches`} className="text-blue-600 dark:text-blue-400 hover:underline">{m.batchCount}</Link>
                      ) : <span className="text-gray-400">0</span>}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">₦{((m.totalBatchStock ?? m.currentStock ?? 0) * (m.averageCost ?? m.unitCost ?? 0)).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {m.supplierId ? (
                        <Link href={`/suppliers/${m.supplierId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{m.supplierId.name}</Link>
                      ) : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        isOut ? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400" :
                        isLow ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" :
                        "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                      }`}>
                        {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => { setStockTarget(m._id); setStockAmount(0); setShowStockModal(true); }} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors">
                          <PlusIcon className="w-3.5 h-3.5 mr-0.5" /> Add
                        </button>
                        <button onClick={() => { setConsumeTarget(m); setConsumeAmount(0); setConsumeType("consumption"); setConsumeNotes(""); setShowConsumeModal(true); }} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-colors">
                          <ArrowDownIcon className="w-3.5 h-3.5 mr-0.5" /> Use
                        </button>
                        <Link href={`/raw-materials/${m._id}?tab=batches`} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 transition-colors">
                          Batches
                        </Link>
                        <button onClick={() => openMovements(m)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                          History
                        </button>
                        <button onClick={() => openEdit(m)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-500/10 dark:text-gray-400 dark:hover:bg-gray-500/20 transition-colors">
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(m._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                          <TrashBinIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Material"
        message="This will permanently delete this raw material and all associated data. This action cannot be undone."
        confirmLabel="Delete Material"
        variant="danger"
      />
    </div>
  );
}
