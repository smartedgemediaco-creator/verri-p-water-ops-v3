"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { BoxIcon, GroupIcon, DollarLineIcon, PencilIcon, PlusIcon, CloseIcon, BoltIcon } from "@/icons";
import { LightbulbIcon, AlertTriangleIcon, CheckCircleIcon, TrendingUpIcon } from "lucide-react";

interface RawMaterial {
  _id: string; name: string; unit: string; category: string;
  currentStock: number; minimumStock: number; unitCost: number;
  supplierId: { _id: string; name: string } | null;
  notes: string; createdAt: string;
}

interface Supplier { _id: string; name: string; phone: string; email: string; }
interface Insights {
  currentStock: number; minimumStock: number; unitCost: number; stockValue: number;
  totalOrdered: number; timesOrdered: number; totalSpent: number; needsReorder: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  chemical: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  packaging: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  filter: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  label: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

export default function RawMaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAmount, setStockAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([]);

  const [form, setForm] = useState({
    name: "", unit: "", category: "chemical",
    currentStock: 0, minimumStock: 0, unitCost: 0, supplierId: "", notes: "",
  });

  const fetchAll = async () => {
    try {
      const res = await fetch(`/api/raw-materials/${id}`);
      const data = await res.json();
      setMaterial(data);
      if (data?.supplierId?._id) {
        const supRes = await fetch(`/api/suppliers/${data.supplierId._id}`);
        if (supRes.ok) setSupplier(await supRes.json());
      }
      const supListRes = await fetch(`/api/suppliers`);
      const supData = await supListRes.json();
      if (Array.isArray(supData)) {
        setSuppliers(supData.map((s: { _id: string; name: string }) => ({ value: s._id, label: s.name })));
      }
      const insRes = await fetch(`/api/raw-materials/${id}/insights`);
      if (insRes.ok) setInsights(await insRes.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [id]); // eslint-disable-line react-hooks/set-state-in-effect

  const openEdit = () => {
    if (!material) return;
    setForm({
      name: material.name, unit: material.unit ?? "",
      category: material.category,
      currentStock: material.currentStock, minimumStock: material.minimumStock,
      unitCost: material.unitCost,
      supplierId: material.supplierId?._id ?? "",
      notes: material.notes ?? "",
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { showError("Failed to update material"); return; }
      showSuccess("Material updated");
      setShowEditModal(false);
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleRecordStock = async () => {
    if (stockAmount <= 0) { showError("Enter a valid quantity"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: stockAmount }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to record stock"); return; }
      showSuccess("Stock recorded");
      setShowStockModal(false);
      setStockAmount(0);
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  if (loading || !material) return (
    <div>
      <PageBreadcrumb pageTitle="Raw Material" />
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading material details...</div>
    </div>
  );

  const isLow = material.currentStock < material.minimumStock;
  const stockValue = (material.currentStock ?? 0) * (material.unitCost ?? 0);
  const stockPct = material.minimumStock > 0 ? Math.min(100, Math.round((material.currentStock / material.minimumStock) * 100)) : material.currentStock > 0 ? 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={`Material: ${material.name}`} />
        <div className="flex gap-2">
          <Button size="sm" startIcon={<PencilIcon />} onClick={openEdit}>Edit Material</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-teal-100 dark:bg-teal-500/10">
            <BoxIcon className="w-7 h-7 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{material.name}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                isLow
                  ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                  : "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
              }`}>
                {isLow ? "Low Stock" : "In Stock"}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${CATEGORY_COLORS[material.category] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>{material.category}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Unit: {material.unit || "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-2">
            <BoxIcon className="text-blue-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Stock</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{(material.currentStock ?? 0).toLocaleString()} {material.unit}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-2">
            <GroupIcon className="text-amber-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Min Stock</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{(material.minimumStock ?? 0).toLocaleString()} {material.unit}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <DollarLineIcon className="text-red-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Unit Cost</p>
          <AutoAmount value={`₦${(material.unitCost ?? 0).toLocaleString()}`} className="text-gray-800 dark:text-white !text-xs" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-2">
            <DollarLineIcon className="text-purple-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Stock Value</p>
          <AutoAmount value={`₦${stockValue.toLocaleString()}`} className="text-gray-800 dark:text-white !text-xs" />
        </div>
      </div>

      {insights && (() => {
        const advice: { type: "positive" | "warning" | "critical" | "insight"; icon: React.ReactNode; title: string; message: string; href: string }[] = [];

        if (insights.currentStock === 0) {
          advice.push({ type: "critical", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "Out of Stock", href: "/raw-materials", message: "This material has zero stock. Immediate reorder required to avoid production stoppage." });
        } else if (insights.needsReorder) {
          const suggestedQty = Math.max(insights.minimumStock * 2 - insights.currentStock, insights.minimumStock);
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />, title: "Reorder Required", href: "/raw-materials", message: `Current stock (${insights.currentStock.toLocaleString()}) is at or below minimum (${insights.minimumStock.toLocaleString()}). Suggested reorder: ${suggestedQty.toLocaleString()} units.` });
        } else if (insights.currentStock > insights.minimumStock * 2) {
          advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "Healthy Stock", href: "/raw-materials", message: `Current stock (${insights.currentStock.toLocaleString()}) is well above minimum levels. No reorder needed.` });
        }

        if (insights.timesOrdered > 0) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "Supply History", href: "/purchase-orders", message: `Ordered ${insights.timesOrdered} time(s) totaling ${insights.totalOrdered.toLocaleString()} units (₦${insights.totalSpent.toLocaleString()} spent).` });
        }

        return (
          <>
            {advice.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <LightbulbIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Material Advisory</h3>
                </div>
                <div className="space-y-3">
                  {advice.map((a, i) => (
                    <Link key={i} href={a.href} className={`flex gap-3 p-3 rounded-lg hover:shadow-theme-sm transition-shadow ${a.type === "critical" ? "bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10" : a.type === "warning" ? "bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10" : a.type === "positive" ? "bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10" : "bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10"}`}>
                      <div className="flex-shrink-0 mt-0.5">{a.icon}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{a.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{a.message}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BoltIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Material Stats</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Link href="/raw-materials" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Current Stock</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.currentStock ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/raw-materials" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Min Stock</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.minimumStock ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/raw-materials" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Stock Value</p>
                  <p className="text-xs font-bold text-purple-700 dark:text-purple-400">₦{(insights.stockValue ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/purchase-orders" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Times Ordered</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{insights.timesOrdered}</p>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link href="/purchase-orders" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Ordered</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.totalOrdered ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/costs" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Spent</p>
                  <p className="text-xs font-bold text-error-700 dark:text-error-400">₦{(insights.totalSpent ?? 0).toLocaleString()}</p>
                </Link>
              </div>
            </div>
          </>
        );
      })()}

      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" startIcon={<PlusIcon />} onClick={() => { setStockAmount(0); setShowStockModal(true); }}>Record Stock</Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Stock Level</h3>
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>Current: {(material.currentStock ?? 0).toLocaleString()} {material.unit}</span>
          <span>Minimum: {(material.minimumStock ?? 0).toLocaleString()} {material.unit}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isLow ? "bg-error-500" : "bg-success-500"}`}
            style={{ width: `${Math.min(100, stockPct)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{stockPct}% of minimum stock level</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Material Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500 dark:text-gray-400">Name</span><p className="font-medium text-gray-800 dark:text-white/90">{material.name}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Category</span><p className="font-medium text-gray-800 dark:text-white/90 capitalize">{material.category}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Unit</span><p className="font-medium text-gray-800 dark:text-white/90">{material.unit || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Current Stock</span><p className="font-medium text-gray-800 dark:text-white/90">{(material.currentStock ?? 0).toLocaleString()} {material.unit}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Minimum Stock</span><p className="font-medium text-gray-800 dark:text-white/90">{(material.minimumStock ?? 0).toLocaleString()} {material.unit}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Unit Cost</span><p className="font-medium text-gray-800 dark:text-white/90">₦{(material.unitCost ?? 0).toLocaleString()}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Stock Value</span><p className="font-medium text-gray-800 dark:text-white/90">₦{stockValue.toLocaleString()}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Supplier</span><p className="font-medium text-gray-800 dark:text-white/90">{material.supplierId?.name ?? "—"}</p></div>
          <div className="col-span-2"><span className="text-gray-500 dark:text-gray-400">Notes</span><p className="font-medium text-gray-800 dark:text-white/90">{material.notes || "—"}</p></div>
        </div>
      </div>

      {supplier && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Supplier</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 dark:text-white/90">{supplier.name}</p>
              <p className="text-sm text-gray-500">{supplier.phone || "—"} {supplier.email ? `· ${supplier.email}` : ""}</p>
            </div>
            <Link href={`/suppliers/${supplier._id}`}>
              <Button variant="outline" size="sm">View Supplier</Button>
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-gray-400">
        <button onClick={fetchAll} className="text-blue-500 hover:text-blue-600 underline mr-4">Refresh</button>
        {material?.name ?? "Raw Material"}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowEditModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Edit Material</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <InputField type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <InputField type="text" placeholder="e.g. kg" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <Select options={[{ value: "chemical", label: "Chemical" }, { value: "packaging", label: "Packaging" }, { value: "filter", label: "Filter" }, { value: "label", label: "Label" }, { value: "other", label: "Other" }]} value={form.category} onChange={v => setForm({ ...form, category: v })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                  <Select options={suppliers} placeholder="Select supplier" value={form.supplierId} onChange={v => setForm({ ...form, supplierId: v })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Stock</label>
                  <InputField type="number" placeholder="0" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: Number(e.target.value) })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock</label>
                  <InputField type="number" placeholder="0" value={form.minimumStock} onChange={e => setForm({ ...form, minimumStock: Number(e.target.value) })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <InputField type="number" placeholder="0" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: Number(e.target.value) })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} rows={3} /></div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !form.name}>{submitting ? "Saving..." : "Update Material"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowStockModal(false); setStockAmount(0); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Record Stock</h3>
              <button onClick={() => { setShowStockModal(false); setStockAmount(0); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter the quantity to add to current stock of <strong>{material.name}</strong>.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Add ({material.unit || "units"})</label>
              <InputField type="number" placeholder="0" value={stockAmount} onChange={e => setStockAmount(Number(e.target.value))} />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleRecordStock} disabled={submitting || stockAmount <= 0}>{submitting ? "Saving..." : "Record Stock"}</Button>
              <Button variant="outline" onClick={() => { setShowStockModal(false); setStockAmount(0); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
