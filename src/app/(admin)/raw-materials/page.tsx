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
import AutoAmount from "@/components/ui/AutoAmount";
import { PlusIcon, CloseIcon, ArrowDownIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import { formatDate } from "@/lib/dateFormat";

interface RawMaterial {
  _id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  supplierId: { _id: string; name: string } | null;
  notes: string;
}

interface StockMovement {
  _id: string;
  type: string;
  quantity: number;
  unit: string;
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
}

const CATEGORIES = [
  { value: "chemical", label: "Chemical" },
  { value: "packaging", label: "Packaging" },
  { value: "filter", label: "Filter" },
  { value: "label", label: "Label" },
  { value: "other", label: "Other" },
];

const CONSUMPTION_TYPES = [
  { value: "consumption", label: "Production" },
  { value: "waste", label: "Wastage" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [receiveTarget, setReceiveTarget] = useState<RawMaterial | null>(null);
  const [receiveQty, setReceiveQty] = useState(0);
  const [receiveUnit, setReceiveUnit] = useState("");
  const [receiveCost, setReceiveCost] = useState(0);
  const [receiveNotes, setReceiveNotes] = useState("");

  const [consumeTarget, setConsumeTarget] = useState<RawMaterial | null>(null);
  const [consumeQty, setConsumeQty] = useState(0);
  const [consumeType, setConsumeType] = useState("consumption");
  const [consumeNotes, setConsumeNotes] = useState("");

  const [movementTarget, setMovementTarget] = useState<RawMaterial | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementLoading, setMovementLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<RawMaterial | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("chemical");
  const [minimumStock, setMinimumStock] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([]);

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

  useEffect(() => {
    fetchMaterials();
    fetchSuppliers();
    fetchStats();
  }, []);

  const resetForm = () => {
    setName(""); setUnit(""); setCategory("chemical");
    setMinimumStock(0); setUnitCost(0); setSupplierId(""); setNotes("");
  };

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
        body: JSON.stringify({
          name: name.trim(), unit, category, minimumStock, unitCost,
          supplierId: supplierId || undefined, notes,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Operation failed"); return; }
      showSuccess(editTarget ? "Material updated" : "Material added");
      setShowEditModal(false); setShowAddModal(false); setEditTarget(null); resetForm();
      fetchMaterials(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const openReceive = (m: RawMaterial) => {
    setReceiveTarget(m);
    setReceiveQty(0);
    setReceiveUnit(m.unit || "");
    setReceiveCost(m.unitCost || 0);
    setReceiveNotes("");
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!receiveTarget || receiveQty <= 0) { showError("Enter a valid quantity"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/raw-materials/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMaterialId: receiveTarget._id,
          locationType: "factory",
          locationId: "none",
          receivedQuantity: receiveQty,
          unit: receiveUnit || receiveTarget.unit,
          unitPrice: receiveCost || undefined,
          qualityNotes: receiveNotes || undefined,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to record stock"); return; }
      showSuccess("Stock added");
      setShowReceiveModal(false); setReceiveTarget(null);
      fetchMaterials(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const openConsume = (m: RawMaterial) => {
    setConsumeTarget(m);
    setConsumeQty(0);
    setConsumeType("consumption");
    setConsumeNotes("");
    setShowConsumeModal(true);
  };

  const handleConsume = async () => {
    if (!consumeTarget || consumeQty <= 0) { showError("Enter a valid quantity"); return; }
    if (consumeQty > consumeTarget.currentStock) {
      showError(`Insufficient stock. Available: ${consumeTarget.currentStock} ${consumeTarget.unit}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${consumeTarget._id}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: consumeQty, type: consumeType, notes: consumeNotes }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Consumption recorded");
      setShowConsumeModal(false); setConsumeTarget(null);
      fetchMaterials(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const openMovements = async (m: RawMaterial) => {
    setMovementTarget(m); setShowMovementModal(true); setMovementLoading(true);
    try {
      const res = await fetch(`/api/raw-materials/${m._id}/movements?limit=50`);
      const data = await res.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch { setMovements([]); } finally { setMovementLoading(false); }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.supplierId?.name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || m.category === categoryFilter;
      const isLow = m.minimumStock > 0 && m.currentStock < m.minimumStock;
      const isOut = m.currentStock <= 0;
      const status = isOut ? "out" : isLow ? "low" : "in";
      const matchStatus = !stockStatusFilter || stockStatusFilter === status;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [materials, search, categoryFilter, stockStatusFilter]);

  const lowStockItems = materials.filter((m) => m.currentStock < m.minimumStock && m.minimumStock > 0);
  const outOfStockItems = materials.filter((m) => m.currentStock <= 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Materials" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => { fetchMaterials(); fetchStats(); }}>
            Refresh
          </Button>
          <Link href="/purchase-orders">
            <Button variant="outline" size="sm" startIcon={<PlusIcon />}>New Purchase</Button>
          </Link>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => { setEditTarget(null); resetForm(); setShowAddModal(true); }}>
            Add Material
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Materials</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.totalMaterials ?? materials.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.lowStockCount ?? lowStockItems.length}</h4>
          {lowStockItems.length > 0 && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">{lowStockItems.map((m) => m.name).join(", ")}</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.outOfStockCount ?? outOfStockItems.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock Value</p>
          <AutoAmount value={`₦${(stats?.totalStockValue ?? 0).toLocaleString()}`} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="w-56">
          <Input placeholder="Search by name or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-44">
          <Select options={[{ value: "", label: "All Categories" }, ...CATEGORIES]} value={categoryFilter} onChange={setCategoryFilter} />
        </div>
        <div className="w-40">
          <Select
            options={[
              { value: "", label: "All Stock" },
              { value: "in", label: "In Stock" },
              { value: "low", label: "Low Stock" },
              { value: "out", label: "Out of Stock" },
            ]}
            value={stockStatusFilter}
            onChange={setStockStatusFilter}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Stock</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Min Stock</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>Loading...</TableCell></TableRow>
            ) : filteredMaterials.length === 0 ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>
                {materials.length === 0 ? 'No raw materials found. Click "Add Material" to create one.' : "No materials match your search."}
              </TableCell></TableRow>
            ) : (
              filteredMaterials.map((m) => {
                const isLow = m.minimumStock > 0 && m.currentStock < m.minimumStock;
                const isOut = m.currentStock <= 0;
                return (
                  <TableRow key={m._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 text-theme-sm font-medium">
                      <Link href={`/raw-materials/${m._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{m.name}</Link>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                        isOut ? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400" :
                        isLow ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" :
                        "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOut ? "bg-gray-500" : isLow ? "bg-error-500" : "bg-success-500"
                        }`} />
                        {(m.currentStock ?? 0).toLocaleString()} {m.unit || ""}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(m.minimumStock ?? 0).toLocaleString()} {m.unit || ""}</TableCell>
                    <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{m.category}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {m.supplierId ? (
                        <Link href={`/suppliers/${m.supplierId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{m.supplierId.name}</Link>
                      ) : <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => openReceive(m)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors">
                          <PlusIcon className="w-3.5 h-3.5 mr-1" /> Receive Stock
                        </button>
                        <button onClick={() => openConsume(m)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-colors">
                          <ArrowDownIcon className="w-3.5 h-3.5 mr-1" /> Use Stock
                        </button>
                        <Link href="/purchase-orders" className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 transition-colors">
                          New PO
                        </Link>
                        <button onClick={() => openMovements(m)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                          History
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

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowAddModal(false); resetForm(); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Add Material</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <Input placeholder="e.g. kg, litres" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <Input type="number" placeholder="0" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock</label>
                  <Input type="number" placeholder="0" value={minimumStock} onChange={(e) => setMinimumStock(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                  <Select options={suppliers} placeholder="Select supplier" value={supplierId} onChange={setSupplierId} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={notes} onChange={setNotes} rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowAddModal(false); resetForm(); }} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Saving..." : "Add Material"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowEditModal(false); setEditTarget(null); resetForm(); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Edit Material</h3>
              <button onClick={() => { setShowEditModal(false); setEditTarget(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <Input placeholder="e.g. kg, litres" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <Input type="number" placeholder="0" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock</label>
                  <Input type="number" placeholder="0" value={minimumStock} onChange={(e) => setMinimumStock(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                  <Select options={suppliers} placeholder="Select supplier" value={supplierId} onChange={setSupplierId} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={notes} onChange={setNotes} rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowEditModal(false); setEditTarget(null); resetForm(); }} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Saving..." : "Update"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {showReceiveModal && receiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowReceiveModal(false); setReceiveTarget(null); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Receive Stock</h3>
              <button onClick={() => { setShowReceiveModal(false); setReceiveTarget(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-800 dark:text-white/90">{receiveTarget.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Current stock: {(receiveTarget.currentStock ?? 0).toLocaleString()} {receiveTarget.unit || ""}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Received *</label>
                <Input type="number" placeholder="0" value={receiveQty} onChange={(e) => setReceiveQty(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                <Input placeholder={receiveTarget.unit || "unit"} value={receiveUnit} onChange={(e) => setReceiveUnit(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦, optional)</label>
                <Input type="number" placeholder="0" value={receiveCost} onChange={(e) => setReceiveCost(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <TextArea placeholder="Notes about this receipt..." value={receiveNotes} onChange={setReceiveNotes} rows={2} />
              </div>
              {receiveQty > 0 && receiveCost > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total Cost</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">₦{(receiveQty * receiveCost).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => { setShowReceiveModal(false); setReceiveTarget(null); }} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleReceive} disabled={submitting || receiveQty <= 0}>
                  {submitting ? "Saving..." : "Add to Stock"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Use Stock Modal */}
      {showConsumeModal && consumeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowConsumeModal(false); setConsumeTarget(null); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Use Stock</h3>
              <button onClick={() => { setShowConsumeModal(false); setConsumeTarget(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-800 dark:text-white/90">{consumeTarget.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Available: <strong>{(consumeTarget.currentStock ?? 0).toLocaleString()}</strong> {consumeTarget.unit || ""}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Use *</label>
                <Input type="number" placeholder="0" value={consumeQty} onChange={(e) => setConsumeQty(Number(e.target.value))} />
                {consumeQty > 0 && consumeTarget && (
                  <p className={`text-xs mt-1 ${consumeQty > consumeTarget.currentStock ? "text-red-500" : "text-gray-400"}`}>
                    {consumeQty > consumeTarget.currentStock ? "Exceeds available stock!" : `Remaining: ${(consumeTarget.currentStock - consumeQty).toLocaleString()} ${consumeTarget.unit || ""}`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <Select options={CONSUMPTION_TYPES} value={consumeType} onChange={setConsumeType} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <TextArea placeholder="Reason or reference..." value={consumeNotes} onChange={setConsumeNotes} rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => { setShowConsumeModal(false); setConsumeTarget(null); }} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleConsume} disabled={submitting || consumeQty <= 0}>
                  {submitting ? "Saving..." : "Use Material"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showMovementModal && movementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowMovementModal(false); setMovementTarget(null); setMovements([]); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Stock History — {movementTarget.name}</h3>
              <button onClick={() => { setShowMovementModal(false); setMovementTarget(null); setMovements([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
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
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Notes</TableCell>
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
                        <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{mv.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
