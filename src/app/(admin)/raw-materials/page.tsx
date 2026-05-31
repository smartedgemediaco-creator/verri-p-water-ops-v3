"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AutoAmount from "@/components/ui/AutoAmount";
import { PlusIcon, TrashBinIcon, PencilIcon, BoxIcon, GroupIcon, CloseIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";

interface RawMaterial {
  _id: string;
  name: string;
  unit: string;
  category: "chemical" | "packaging" | "filter" | "label" | "other";
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  supplierId: { _id: string; name: string } | null;
  notes: string;
}

const CATEGORIES = [
  { value: "chemical", label: "Chemical" },
  { value: "packaging", label: "Packaging" },
  { value: "filter", label: "Filter" },
  { value: "label", label: "Label" },
  { value: "other", label: "Other" },
];

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockTarget, setStockTarget] = useState<string | null>(null);
  const [stockAmount, setStockAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<RawMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("chemical");
  const [currentStock, setCurrentStock] = useState(0);
  const [minimumStock, setMinimumStock] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchMaterials = () => {
    setLoading(true);
    fetch("/api/raw-materials")
      .then((r) => r.json())
      .then((data) => setMaterials(data))
      .finally(() => setLoading(false));
  };

  const fetchSuppliers = () => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) => {
        if (Array.isArray(data)) {
          setSuppliers(data.map((s) => ({ value: s._id, label: s.name })));
        }
      });
  };

  useEffect(() => { fetchMaterials(); fetchSuppliers(); }, []);

  const resetForm = () => {
    setName("");
    setUnit("");
    setCategory("chemical");
    setCurrentStock(0);
    setMinimumStock(0);
    setUnitCost(0);
    setSupplierId("");
    setNotes("");
  };

  const openEdit = (m: RawMaterial) => {
    setEditTarget(m);
    setName(m.name);
    setUnit(m.unit);
    setCategory(m.category);
    setCurrentStock(m.currentStock);
    setMinimumStock(m.minimumStock);
    setUnitCost(m.unitCost);
    setSupplierId(m.supplierId?._id ?? "");
    setNotes(m.notes);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditTarget(null);
    resetForm();
    setShowModal(true);
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
        body: JSON.stringify({ name: name.trim(), unit, category, currentStock, minimumStock, unitCost, supplierId: supplierId || undefined, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Operation failed");
        return;
      }
      showSuccess(editTarget ? "Material updated" : "Material added");
      setShowModal(false);
      setEditTarget(null);
      resetForm();
      fetchMaterials();
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/raw-materials/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    showSuccess("Material deleted");
    setDeleteTarget(null);
    fetchMaterials();
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
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to record stock");
        return;
      }
      showSuccess("Stock recorded");
      setShowStockModal(false);
      setStockTarget(null);
      setStockAmount(0);
      fetchMaterials();
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockItems = materials.filter((m) => m.currentStock < m.minimumStock);
  const totalStockValue = materials.reduce((sum, m) => sum + (m.currentStock ?? 0) * (m.unitCost ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Raw Materials" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={fetchMaterials}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
            Add Material
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/raw-materials" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg dark:bg-teal-500/10 mb-3">
            <BoxIcon className="text-teal-600 size-5 dark:text-teal-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Materials</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{materials.length}</h4>
        </Link>
        <Link href="/raw-materials" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <GroupIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{lowStockItems.length}</h4>
        </Link>
        <Link href="/raw-materials" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <BoxIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock Value</p>
          <AutoAmount value={`₦${totalStockValue.toLocaleString()}`} />
        </Link>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowModal(false); setEditTarget(null); resetForm(); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                {editTarget ? "Edit Material" : "Add Material"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditTarget(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <Input placeholder="Material name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <Input placeholder="e.g. kg, litres, rolls" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <Select options={CATEGORIES} value={category} onChange={setCategory} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                  <Select options={suppliers} placeholder="Select supplier" value={supplierId} onChange={setSupplierId} />
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <Input type="number" placeholder="0" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={notes} onChange={setNotes} rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowModal(false); setEditTarget(null); resetForm(); }} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update Material" : "Add Material"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowStockModal(false); setStockTarget(null); setStockAmount(0); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Record Stock</h3>
              <button onClick={() => { setShowStockModal(false); setStockTarget(null); setStockAmount(0); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter the quantity to add to current stock.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Add</label>
                <Input type="number" placeholder="0" value={stockAmount} onChange={(e) => setStockAmount(Number(e.target.value))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowStockModal(false); setStockTarget(null); setStockAmount(0); }} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleRecordStock} disabled={submitting || stockAmount <= 0}>
                  {submitting ? "Saving..." : "Record Stock"}
                </Button>
              </div>
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
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Current Stock</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Min Stock</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit Cost</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>Loading...</TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>No raw materials found. Click &quot;Add Material&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              materials.map((m) => {
                const isLow = m.currentStock < m.minimumStock;
                return (
                  <TableRow key={m._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90"><Link href={`/raw-materials/${m._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{m.name}</Link></TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{m.unit || <span className="text-gray-400">&mdash;</span>}</TableCell>
                    <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{m.category}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{(m.currentStock ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(m.minimumStock ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">₦{(m.unitCost ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{m.supplierId?.name ?? <span className="text-gray-400">&mdash;</span>}</TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        isLow
                          ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                          : "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                      }`}>
                        {isLow ? "Low Stock" : "In Stock"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setStockTarget(m._id); setStockAmount(0); setShowStockModal(true); }} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors">
                          <PlusIcon className="w-3.5 h-3.5 mr-1" /> Stock
                        </button>
                        <button onClick={() => openEdit(m)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                          <PencilIcon className="w-3.5 h-3.5 mr-1" /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(m._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                          <TrashBinIcon className="w-3.5 h-3.5 mr-1" /> Delete
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
