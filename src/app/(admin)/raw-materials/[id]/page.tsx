"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import AutoAmount from "@/components/ui/AutoAmount";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { PlusIcon, CloseIcon, PencilIcon, ArrowDownIcon } from "@/icons";

interface RawMaterial {
  _id: string; name: string; unit: string; category: string;
  currentStock: number; minimumStock: number; unitCost: number;
  supplierId: { _id: string; name: string; phone?: string } | null;
  notes: string;
}

interface StockMovement {
  _id: string; type: string; quantity: number; unit: string;
  reference: string; notes: string; performedBy: string; createdAt: string;
}

interface PoItem {
  rawMaterialId: string;
  quantity: number;
  received: number;
  unitPrice: number;
}

interface PurchaseOrder {
  _id: string; orderNumber: string; status: string; totalAmount: number;
  supplier: { _id: string; name: string } | null;
  items: PoItem[];
  createdAt: string;
}

const movementTypeColors: Record<string, string> = {
  purchase: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  consumption: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  adjustment: "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  waste: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  return: "bg-theme-pink-50 text-theme-pink-700 dark:bg-theme-pink-500/10 dark:text-theme-pink-400",
  correction: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
  other: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

export default function RawMaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("history");
  const [submitting, setSubmitting] = useState(false);

  const [factories, setFactories] = useState<{ _id: string; name: string }[]>([]);
  const [depots, setDepots] = useState<{ _id: string; name: string }[]>([]);
  const [supplierOpts, setSupplierOpts] = useState<{ value: string; label: string }[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMinStock, setEditMinStock] = useState(0);
  const [editUnitCost, setEditUnitCost] = useState(0);
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [recQty, setRecQty] = useState(0);
  const [recUnit, setRecUnit] = useState("");
  const [recUnitPrice, setRecUnitPrice] = useState(0);
  const [recLocationType, setRecLocationType] = useState("factory");
  const [recLocationId, setRecLocationId] = useState("");
  const [recDate, setRecDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [recNotes, setRecNotes] = useState("");

  const [showUseModal, setShowUseModal] = useState(false);
  const [useQty, setUseQty] = useState(0);
  const [useReason, setUseReason] = useState("consumption");
  const [useNotes, setUseNotes] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/raw-materials/${id}`).then(r => r.json()),
      fetch(`/api/raw-materials/${id}/movements?limit=50`).then(r => r.json()),
      fetch("/api/purchase-orders").then(r => r.json()),
    ]).then(([mat, mvts, pos]) => {
      setMaterial(mat);
      setMovements(Array.isArray(mvts) ? mvts : []);
      setPurchaseOrders(Array.isArray(pos) ? pos : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) fetchData();
    fetch("/api/factories").then(r => r.json()).then(d => setFactories(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/depots").then(r => r.json()).then(d => setDepots(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/suppliers").then(r => r.json()).then((d: { _id: string; name: string }[]) =>
      setSupplierOpts(Array.isArray(d) ? d.map(s => ({ value: s._id, label: s.name })) : [])
    ).catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const linkedPOs = purchaseOrders.filter(po =>
    Array.isArray(po.items) && po.items.some(item => item.rawMaterialId === id)
  );

  const openEditModal = () => {
    if (!material) return;
    setEditName(material.name);
    setEditUnit(material.unit);
    setEditCategory(material.category);
    setEditMinStock(material.minimumStock);
    setEditUnitCost(material.unitCost);
    setEditSupplierId(material.supplierId?._id ?? "");
    setEditNotes(material.notes || "");
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) { showError("Name is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          unit: editUnit,
          category: editCategory,
          minimumStock: editMinStock,
          unitCost: editUnitCost,
          supplierId: editSupplierId || undefined,
          notes: editNotes,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to update"); return; }
      showSuccess("Material updated");
      setShowEditModal(false);
      fetchData();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const handleReceiveStock = async () => {
    if (recQty <= 0) { showError("Enter a valid quantity"); return; }
    if (!recLocationId) { showError("Select a location"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/raw-materials/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMaterialId: id,
          locationType: recLocationType,
          locationId: recLocationId,
          receivedQuantity: recQty,
          unit: recUnit || material?.unit || "kg",
          unitPrice: recUnitPrice,
          supplierId: material?.supplierId?._id || undefined,
          receivedDate: recDate,
          qualityNotes: recNotes,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to receive stock"); return; }
      showSuccess("Stock received");
      setShowReceiveModal(false);
      setRecQty(0); setRecUnit(""); setRecUnitPrice(0); setRecLocationId(""); setRecNotes("");
      fetchData();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const handleUseStock = async () => {
    if (useQty <= 0) { showError("Enter a valid quantity"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${id}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: useQty,
          type: useReason,
          notes: useNotes || undefined,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to record consumption"); return; }
      showSuccess("Stock consumed");
      setShowUseModal(false);
      setUseQty(0); setUseNotes(""); setUseReason("consumption");
      fetchData();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  if (loading && !material) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>;
  }
  if (!material) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Material not found.</div>;
  }

  const isLow = material.minimumStock > 0 && material.currentStock < material.minimumStock;
  const isOut = material.currentStock <= 0;
  const supplier = material.supplierId;

  const recLocationOpts = recLocationType === "factory"
    ? factories.map(f => ({ value: f._id, label: f.name }))
    : depots.map(d => ({ value: d._id, label: d.name }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={material.name} />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" startIcon={<PencilIcon />} onClick={openEditModal}>Edit</Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/purchase-orders/new?rawMaterialId=${id}`)}>
            New PO
          </Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => { setRecQty(0); setRecUnit(material.unit); setRecUnitPrice(material.unitCost); setRecLocationId(""); setRecNotes(""); setRecDate(new Date().toISOString().split("T")[0]); setShowReceiveModal(true); }}>
            Receive Stock
          </Button>
          <Button variant="outline" size="sm" startIcon={<ArrowDownIcon />} onClick={() => { setUseQty(0); setUseReason("consumption"); setUseNotes(""); setShowUseModal(true); }}>
            Use Stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 dark:text-white/90 text-xl">
            {material.currentStock.toLocaleString()}{" "}
            <span className="text-sm font-normal text-gray-400">{material.unit}</span>
          </h4>
          <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full ${
            isOut
              ? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400"
              : isLow
                ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
                : "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
          }`}>
            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Minimum Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 dark:text-white/90 text-xl">
            {material.minimumStock.toLocaleString()}{" "}
            <span className="text-sm font-normal text-gray-400">{material.unit}</span>
          </h4>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Supplier</p>
          {supplier ? (
            <>
              <p className="mt-1 font-medium text-gray-800 dark:text-white/90 text-sm">{supplier.name}</p>
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {supplier.phone}
                </a>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">No supplier linked</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Unit Cost</p>
          <AutoAmount value={`₦${(material.unitCost ?? 0).toLocaleString()}`} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {[
          { key: "history", label: "History" },
          { key: "linked-pos", label: `Linked POs (${linkedPOs.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "history" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Stock Movement History</h3>
          </div>
          {movements.length === 0 ? (
            <p className="p-8 text-sm text-gray-500 text-center">No movements recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Direction</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Reference</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">By</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(mv => {
                  const isIn = mv.quantity > 0;
                  return (
                    <TableRow key={mv._id}>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(mv.createdAt)}</TableCell>
                      <TableCell className="py-2">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${movementTypeColors[mv.type] || ""}`}>
                          {mv.type}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={`text-xs font-medium ${isIn ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {isIn ? "In" : "Out"}
                        </span>
                      </TableCell>
                      <TableCell className={`py-2 text-theme-sm font-medium ${isIn ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {isIn ? "+" : ""}{mv.quantity.toLocaleString()} {mv.unit}
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{mv.reference || "—"}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{mv.performedBy || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {activeTab === "linked-pos" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Purchase Orders</h3>
            <Link href={`/purchase-orders/new?rawMaterialId=${id}`}>
              <Button size="sm" variant="outline" startIcon={<PlusIcon />}>New PO</Button>
            </Link>
          </div>
          {linkedPOs.length === 0 ? (
            <p className="p-8 text-sm text-gray-500 text-center">No purchase orders for this material.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">PO #</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ordered</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Received</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Pending</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Payment</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedPOs.map(po => {
                  const item = po.items.find(i => i.rawMaterialId === id);
                  const ordered = item?.quantity ?? 0;
                  const received = item?.received ?? 0;
                  const pending = ordered - received;

                  let statusColor: "primary" | "success" | "warning" | "error" | "info" | "light" | "dark" = "light";
                  if (po.status === "received" || po.status === "completed") statusColor = "success";
                  else if (po.status === "confirmed" || po.status === "sent") statusColor = "info";
                  else if (po.status === "pending") statusColor = "warning";
                  else if (po.status === "cancelled") statusColor = "error";

                  return (
                    <TableRow key={po._id}>
                      <TableCell className="py-2">
                        <Link href={`/purchase-orders/${po._id}`} className="text-theme-sm font-mono text-blue-600 dark:text-blue-400 hover:underline">
                          {po.orderNumber || po._id.slice(-6).toUpperCase()}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{po.supplier?.name || "—"}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-800 dark:text-white/90">{ordered.toLocaleString()}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-green-600 dark:text-green-400">{received.toLocaleString()}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-800 dark:text-white/90">{pending > 0 ? pending.toLocaleString() : "—"}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="light" color={statusColor}>{po.status}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">—</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowEditModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Edit Material</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <Input value={editUnit} onChange={e => setEditUnit(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock</label>
                  <Input type="number" value={editMinStock} onChange={e => setEditMinStock(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <Input type="number" value={editUnitCost} onChange={e => setEditUnitCost(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                <Select options={[{ value: "", label: "None" }, ...supplierOpts]} value={editSupplierId} onChange={setEditSupplierId} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea value={editNotes} onChange={setEditNotes} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)} disabled={submitting}>Cancel</Button>
              <Button variant="primary" onClick={handleEditSave} disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowReceiveModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Receive Stock — {material.name}</h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type *</label>
                  <Select
                    options={[{ value: "factory", label: "Factory" }, { value: "depot", label: "Depot" }]}
                    value={recLocationType}
                    onChange={v => { setRecLocationType(v); setRecLocationId(""); }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                  <Select
                    options={[{ value: "", label: "Select location" }, ...recLocationOpts]}
                    value={recLocationId}
                    onChange={setRecLocationId}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                  <Input type="number" placeholder="0" value={recQty} onChange={e => setRecQty(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <Input placeholder={material.unit} value={recUnit} onChange={e => setRecUnit(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <Input type="number" placeholder="0" value={recUnitPrice} onChange={e => setRecUnitPrice(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <Input type="date" value={recDate} onChange={e => setRecDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Quality check notes, condition on arrival..." value={recNotes} onChange={setRecNotes} rows={2} />
              </div>
              {recQty > 0 && recUnitPrice > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total Cost</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">₦{(recQty * recUnitPrice).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => setShowReceiveModal(false)} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleReceiveStock} disabled={submitting || recQty <= 0 || !recLocationId}>
                  {submitting ? "Saving..." : "Receive Stock"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowUseModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Use Stock — {material.name}</h3>
              <button onClick={() => setShowUseModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                <Input type="number" placeholder="0" value={useQty} onChange={e => setUseQty(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <Select
                  options={[
                    { value: "consumption", label: "Production" },
                    { value: "waste", label: "Wastage" },
                    { value: "adjustment", label: "Adjustment" },
                    { value: "other", label: "Other" },
                  ]}
                  value={useReason}
                  onChange={setUseReason}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={useNotes} onChange={setUseNotes} rows={2} />
              </div>
              {useQty > 0 && material.unitCost > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Estimated Cost</span>
                  <span className="font-semibold text-gray-800 dark:text-white/90">₦{(useQty * material.unitCost).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => setShowUseModal(false)} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleUseStock} disabled={submitting || useQty <= 0}>
                  {submitting ? "Saving..." : "Use Stock"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
