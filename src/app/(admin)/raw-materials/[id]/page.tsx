"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import AutoAmount from "@/components/ui/AutoAmount";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { PlusIcon, CloseIcon, TrashBinIcon, PencilIcon } from "@/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface RawMaterial {
  _id: string; name: string; unit: string; stockUnit: string; conversionRate: number;
  category: string; currentStock: number; minimumStock: number; unitCost: number;
  supplierId: { _id: string; name: string; phone?: string; whatsapp?: string; email?: string } | null;
  totalReceived: number; totalConsumed: number; lastReceivedDate?: string; lastConsumedDate?: string;
  totalBatchStock: number; averageCost: number; batchCount: number; notes: string;
}

interface Batch {
  _id: string; batchNumber: string; receivedQuantity: number; availableQuantity: number;
  unit: string; unitPrice: number; totalCost: number; itemCount: number; itemUnit: string;
  status: string; locationType: string; locationId: { _id: string; name: string } | string;
  consumedQuantity: number; receivedDate?: string; qualityNotes: string; createdAt: string;
}

interface StockMovement {
  _id: string; type: string; quantity: number; unit: string; unitCost: number;
  reference: string; notes: string; performedBy: string; createdAt: string;
}

const movementTypeColors: Record<string, string> = {
  purchase: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  consumption: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  adjustment: "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  waste: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  return: "bg-theme-pink-50 text-theme-pink-700 dark:bg-theme-pink-500/10 dark:text-theme-pink-400",
  correction: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

const statusColors: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  pending: "light", "partially-received": "warning", received: "success", consumed: "info", expired: "error",
};

export default function RawMaterialDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const initialTab = searchParams.get("tab") || "overview";

  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [stockAmount, setStockAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [consumeLocationType, setConsumeLocationType] = useState("factory");
  const [consumeLocationId, setConsumeLocationId] = useState("");
  const [consumePurpose, setConsumePurpose] = useState("production");
  const [consumeDate, setConsumeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [consumeNotes, setConsumeNotes] = useState("");
  const [allocations, setAllocations] = useState<Array<{ batchId: string; quantity: number; itemCount: number }>>([]);
  const [factories, setFactories] = useState<{ _id: string; name: string }[]>([]);
  const [depots, setDepots] = useState<{ _id: string; name: string }[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editMinimumStock, setEditMinimumStock] = useState(0);
  const [editUnitCost, setEditUnitCost] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editCategory, setEditCategory] = useState("chemical");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [supplierOpts, setSupplierOpts] = useState<{ value: string; label: string }[]>([]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/raw-materials/${id}`).then((r) => r.json()),
      fetch(`/api/raw-materials/${id}/movements?limit=50`).then((r) => r.json()),
      fetch(`/api/raw-materials/batches?rawMaterialId=${id}`).then((r) => r.json()),
    ]).then(([mat, mvmts, batchData]) => {
      setMaterial(mat);
      setMovements(Array.isArray(mvmts) ? mvmts : []);
      setBatches(Array.isArray(batchData) ? batchData : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) fetchData();
    fetch("/api/factories").then((r) => r.json()).then((d) => setFactories(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/depots").then((r) => r.json()).then((d) => setDepots(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/suppliers").then((r) => r.json()).then((d: { _id: string; name: string }[]) => setSupplierOpts(Array.isArray(d) ? d.map((s) => ({ value: s._id, label: s.name })) : [])).catch(() => {});
  }, [id]);

  const openEditModal = () => {
    if (!material) return;
    setEditName(material.name); setEditUnit(material.unit); setEditMinimumStock(material.minimumStock);
    setEditUnitCost(material.unitCost); setEditNotes(material.notes || ""); setEditCategory(material.category);
    setEditSupplierId(material.supplierId?._id ?? ""); setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) { showError("Name is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), unit: editUnit, minimumStock: editMinimumStock, unitCost: editUnitCost, supplierId: editSupplierId || undefined, notes: editNotes, category: editCategory }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Material updated"); setShowEditModal(false); fetchData();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/raw-materials/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to delete"); return; }
      showSuccess("Material deleted"); setDeleteTarget(null); router.push("/raw-materials");
    } catch { showError("Network error"); }
  };

  const handleAddStock = async () => {
    if (stockAmount <= 0) { showError("Enter a valid quantity"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${id}/stock`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: stockAmount }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Stock added"); setShowStockModal(false); setStockAmount(0); fetchData();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const consumeLocationOptions = consumeLocationType === "factory"
    ? factories.map((f) => ({ value: f._id, label: f.name }))
    : depots.map((d) => ({ value: d._id, label: d.name }));

  const availableBatches = useMemo(() =>
    batches.filter((b) => b.availableQuantity > 0 && (b.locationType === consumeLocationType) && (typeof b.locationId === "object" ? b.locationId._id : b.locationId) === consumeLocationId),
    [batches, consumeLocationType, consumeLocationId]
  );

  const totalConsumeQty = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
  const totalConsumeCost = allocations.reduce((s, a) => {
    const batch = batches.find((b) => b._id === a.batchId);
    return s + (Number(a.quantity) || 0) * (batch?.unitPrice || 0);
  }, 0);

  const addAllocation = () => setAllocations([...allocations, { batchId: "", quantity: 0, itemCount: 0 }]);
  const updateAllocation = (i: number, field: string, value: string | number) => {
    const updated = [...allocations];
    updated[i] = { ...updated[i], [field]: value };
    setAllocations(updated);
  };
  const removeAllocation = (i: number) => setAllocations(allocations.filter((_, idx) => idx !== i));

  const handleConsume = async () => {
    if (!consumeLocationId) { showError("Select a location"); return; }
    if (allocations.length === 0) { showError("Add at least one batch allocation"); return; }
    const invalid = allocations.find((a) => !a.batchId || a.quantity <= 0);
    if (invalid) { showError("Each allocation needs a batch and quantity > 0"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/raw-materials/consume", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMaterialId: id,
          locationType: consumeLocationType,
          locationId: consumeLocationId,
          purpose: consumePurpose,
          date: consumeDate,
          notes: consumeNotes,
          allocations: allocations.map((a) => ({ batchId: a.batchId, quantity: Number(a.quantity), itemCount: Number(a.itemCount) || 0 })),
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Consumption recorded");
      setShowConsumeModal(false);
      setAllocations([]); setConsumeLocationId(""); setConsumeNotes("");
      fetchData();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!material) return <div className="p-8 text-center text-gray-500">Material not found.</div>;

  const isLow = material.minimumStock > 0 && material.currentStock < material.minimumStock;
  const isOut = material.currentStock <= 0;
  const supplier = material.supplierId;
  const totalBatchValue = batches.reduce((s, b) => s + b.availableQuantity * b.unitPrice, 0);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "batches", label: `Batches (${material.batchCount || batches.length})` },
    { key: "movements", label: "History" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={material.name} />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" startIcon={<PencilIcon />} onClick={openEditModal}>Edit</Button>
          <Button variant="outline" size="sm" startIcon={<TrashBinIcon />} onClick={() => setDeleteTarget(id)} className="text-error-600 hover:text-error-700 dark:text-error-400">Delete</Button>
          {supplier?.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${supplier!.phone}`, "_self")}>Call Supplier</Button>}
          {supplier?.whatsapp && <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${supplier!.whatsapp!.replace(/[^0-9]/g, "")}`, "_blank")}>WhatsApp</Button>}
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => { setStockAmount(0); setShowStockModal(true); }}>Add Stock</Button>
          <Button variant="outline" size="sm" onClick={() => { setAllocations([]); setConsumeLocationId(""); setShowConsumeModal(true); }}>Consume</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">{material.currentStock.toLocaleString()} <span className="text-sm font-normal text-gray-400">{material.unit}</span></h4>
          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${isOut ? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400" : isLow ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" : "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"}`}>
            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Minimum Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">{material.minimumStock.toLocaleString()} <span className="text-sm font-normal text-gray-400">{material.unit}</span></h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Batches</p>
          <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">{batches.filter((b) => b.availableQuantity > 0).length}</h4>
          {material.averageCost > 0 && <p className="text-xs text-gray-400 mt-1">Avg cost: ₦{material.averageCost.toLocaleString()}/{material.unit}</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Consumed</p>
          <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">{(material.totalConsumed ?? 0).toLocaleString()}</h4>
          {material.lastConsumedDate && <p className="text-xs text-gray-400 mt-1">Last: {formatDate(material.lastConsumedDate)}</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Batch Stock Value</p>
          <AutoAmount value={`₦${totalBatchValue.toLocaleString()}`} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Material Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Category</dt><dd className="text-gray-800 dark:text-white/90 capitalize">{material.category}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Unit</dt><dd className="text-gray-800 dark:text-white/90">{material.unit}</dd></div>
              {material.stockUnit && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Stock Unit</dt><dd className="text-gray-800 dark:text-white/90">{material.stockUnit} ({material.conversionRate} {material.unit}/{material.stockUnit})</dd></div>}
              {supplier && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" />
                  <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Supplier</dt><dd><Link href={`/suppliers/${supplier._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{supplier.name}</Link></dd></div>
                  {supplier.phone && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone</dt><dd className="text-gray-800 dark:text-white/90">{supplier.phone}</dd></div>}
                </>
              )}
              {material.notes && <><div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" /><div><dt className="text-gray-500 dark:text-gray-400 mb-1">Notes</dt><dd className="text-gray-600 dark:text-gray-300">{material.notes}</dd></div></>}
            </dl>
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Recent Batches</h3>
            </div>
            {batches.length === 0 ? (
              <p className="p-5 text-sm text-gray-500 text-center">No batches yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Batch</TableCell>
                    <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                    <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Received</TableCell>
                    <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Available</TableCell>
                    <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Items</TableCell>
                    <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.slice(0, 5).map((b) => (
                    <TableRow key={b._id}>
                      <TableCell className="py-2 text-theme-sm font-mono text-blue-600 dark:text-blue-400">{b.batchNumber}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{b.locationType}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{b.receivedQuantity.toLocaleString()} {b.unit}</TableCell>
                      <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">{b.availableQuantity.toLocaleString()} {b.unit}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{b.itemCount > 0 ? `${b.itemCount} ${b.itemUnit}` : "—"}</TableCell>
                      <TableCell className="py-2"><Badge variant="light" color={statusColors[b.status] ?? "light"}>{b.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {activeTab === "batches" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">All Batches ({batches.length})</h3>
            <Link href="/raw-materials/batches"><Button size="sm" variant="outline">View All Batches</Button></Link>
          </div>
          {batches.length === 0 ? (
            <p className="p-8 text-sm text-gray-500 text-center">No batches for this material yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Batch #</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Received</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Available</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Consumed</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Items</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit Cost</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Value</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => {
                  const loc = typeof b.locationId === "object" ? b.locationId : null;
                  return (
                    <TableRow key={b._id}>
                      <TableCell className="py-2 text-theme-sm font-mono text-blue-600 dark:text-blue-400">{b.batchNumber}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{b.locationType}{loc ? ` — ${loc.name}` : ""}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{b.receivedQuantity.toLocaleString()} {b.unit}</TableCell>
                      <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">{b.availableQuantity.toLocaleString()} {b.unit}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{b.consumedQuantity.toLocaleString()} {b.unit}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{b.itemCount > 0 ? `${b.itemCount} ${b.itemUnit}` : "—"}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">₦{b.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-800 dark:text-white/90">₦{(b.availableQuantity * b.unitPrice).toLocaleString()}</TableCell>
                      <TableCell className="py-2"><Badge variant="light" color={statusColors[b.status] ?? "light"}>{b.status}</Badge></TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{b.receivedDate ? formatDate(b.receivedDate) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {activeTab === "movements" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Stock Movement History</h3>
          </div>
          {movements.length === 0 ? (
            <p className="p-5 text-sm text-gray-500 text-center">No movements recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Reference</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">By</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mv) => (
                  <TableRow key={mv._id}>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(mv.createdAt)}</TableCell>
                    <TableCell className="py-2"><span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${movementTypeColors[mv.type] || ""}`}>{mv.type}</span></TableCell>
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
      )}

      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowStockModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Add Stock</h3>
              <button onClick={() => setShowStockModal(false)} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Add</label>
                <Input type="number" placeholder="0" value={stockAmount} onChange={(e) => setStockAmount(Number(e.target.value))} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowStockModal(false)} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleAddStock} disabled={submitting || stockAmount <= 0}>{submitting ? "Saving..." : "Add Stock"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConsumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowConsumeModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Consume — {material.name}</h3>
              <button onClick={() => setShowConsumeModal(false)} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
                  <Select options={[{ value: "factory", label: "Factory" }, { value: "depot", label: "Depot" }]} value={consumeLocationType} onChange={(v) => { setConsumeLocationType(v); setConsumeLocationId(""); setAllocations([]); }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <Select options={[{ value: "", label: "Select" }, ...consumeLocationOptions]} value={consumeLocationId} onChange={(v) => { setConsumeLocationId(v); setAllocations([]); }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose</label>
                  <Select options={[{ value: "production", label: "Production" }, { value: "wastage", label: "Wastage" }, { value: "adjustment", label: "Adjustment" }, { value: "transfer", label: "Transfer" }, { value: "other", label: "Other" }]} value={consumePurpose} onChange={setConsumePurpose} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <Input type="date" value={consumeDate} onChange={(e) => setConsumeDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <Input placeholder="Optional..." value={consumeNotes} onChange={(e) => setConsumeNotes(e.target.value)} />
                </div>
              </div>

              {consumeLocationId && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Batch Allocations</p>
                    <Button type="button" size="sm" variant="outline" startIcon={<PlusIcon />} onClick={addAllocation}>Add</Button>
                  </div>
                  {allocations.length > 0 && (
                    <div className="space-y-2">
                      {allocations.map((alloc, i) => {
                        const batch = batches.find((b) => b._id === alloc.batchId);
                        const maxQty = alloc.batchId ? (availableBatches.find((b) => b._id === alloc.batchId)?.availableQuantity ?? 0) : 0;
                        return (
                          <div key={i} className="flex gap-2 items-end">
                            <div className="flex-1">
                              <select className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" value={alloc.batchId} onChange={(e) => updateAllocation(i, "batchId", e.target.value)}>
                                <option value="">Select batch</option>
                                {availableBatches.map((b) => (
                                  <option key={b._id} value={b._id} disabled={allocations.some((a, j) => j !== i && a.batchId === b._id)}>
                                    {b.batchNumber} — {b.availableQuantity} {b.unit} @ ₦{b.unitPrice.toLocaleString()}/kg
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-28">
                              <Input type="number" placeholder="Qty" value={alloc.quantity} onChange={(e) => updateAllocation(i, "quantity", Number(e.target.value))} />
                            </div>
                            <div className="w-24">
                              <Input type="number" placeholder="Items" value={alloc.itemCount} onChange={(e) => updateAllocation(i, "itemCount", Number(e.target.value))} />
                            </div>
                            <div className="w-32 text-sm text-gray-500 dark:text-gray-400">
                              {batch ? `₦${((Number(alloc.quantity) || 0) * batch.unitPrice).toLocaleString()}` : ""}
                            </div>
                            <button type="button" onClick={() => removeAllocation(i)} className="text-red-500 hover:text-red-700 p-1"><TrashBinIcon className="w-4 h-4" /></button>
                          </div>
                        );
                      })}
                      <div className="flex justify-end gap-6 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span>Total: <strong>{totalConsumeQty.toLocaleString()} {material.unit}</strong></span>
                        <span>Cost: <strong>₦{totalConsumeCost.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  )}
                  {allocations.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Click "Add" to select batches to consume from.</p>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowConsumeModal(false)} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleConsume} disabled={submitting || allocations.length === 0}>{submitting ? "Saving..." : "Record Consumption"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Edit Material</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400"><CloseIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Unit</label><Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label><Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Min Stock</label><Input type="number" value={editMinimumStock} onChange={(e) => setEditMinimumStock(Number(e.target.value))} /></div>
                <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Unit Cost</label><Input type="number" value={editUnitCost} onChange={(e) => setEditUnitCost(Number(e.target.value))} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Supplier</label><Select options={[{ value: "", label: "None" }, ...supplierOpts]} value={editSupplierId} onChange={setEditSupplierId} /></div>
              <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label><Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)} disabled={submitting}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleEditSave} disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Material"
        message="Are you sure you want to delete this raw material? This action cannot be undone."
      />
    </div>
  );
}
