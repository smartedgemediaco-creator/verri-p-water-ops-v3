"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { ListIcon, DollarLineIcon, TrashBinIcon, PlusIcon } from "@/icons";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface PurchaseOrderItem {
  rawMaterialId: string;
  quantity: number;
  unitPrice: number;
}

interface SupplierRef {
  _id: string;
  name: string;
  supplyType?: string;
}

interface PurchaseOrder {
  _id: string;
  supplierId: SupplierRef;
  orderNumber: string;
  items: PurchaseOrderItem[];
  status: "draft" | "sent" | "confirmed" | "received" | "cancelled";
  orderDate: string;
  expectedDate?: string;
  totalAmount: number;
  notes: string;
}

const statusColor: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  draft: "light",
  sent: "info",
  confirmed: "warning",
  received: "success",
  cancelled: "error",
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTarget, setStatusTarget] = useState<{ id: string; status: string; label: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string }[]>([]);
  const [rawMaterials, setRawMaterials] = useState<{ _id: string; name: string; unit: string }[]>([]);
  const [poForm, setPoForm] = useState({ supplierId: "", expectedDate: "", notes: "", items: [{ rawMaterialId: "", quantity: 1, unitPrice: 0 }] });
  const { ref, loading: pdfLoading, download } = usePdfDownload("purchase-orders-list");

  const fetchSuppliers = () => {
    fetch("/api/suppliers").then((r) => r.json()).then((data) => setSuppliers(Array.isArray(data) ? data : [])).catch(() => {});
  };
  const fetchRawMaterials = () => {
    fetch("/api/raw-materials").then((r) => r.json()).then((data) => setRawMaterials(Array.isArray(data) ? data : [])).catch(() => {});
  };

  const handleNewOrder = async () => {
    if (!poForm.supplierId) { showError("Select a supplier"); return; }
    setFormSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: poForm.supplierId,
          expectedDate: poForm.expectedDate || undefined,
          notes: poForm.notes,
          items: poForm.items.filter((i) => i.rawMaterialId && i.quantity > 0),
        }),
      });
      if (!res.ok) { showError("Failed to create order"); return; }
      showSuccess("Purchase order created");
      setShowForm(false);
      setPoForm({ supplierId: "", expectedDate: "", notes: "", items: [{ rawMaterialId: "", quantity: 1, unitPrice: 0 }] });
      fetchOrders();
    } catch { showError("Network error"); }
    finally { setFormSaving(false); }
  };

  const addItem = () => setPoForm({ ...poForm, items: [...poForm.items, { rawMaterialId: "", quantity: 1, unitPrice: 0 }] });
  const updateItem = (i: number, field: string, value: string | number) => {
    const items = [...poForm.items];
    items[i] = { ...items[i], [field]: value };
    setPoForm({ ...poForm, items });
  };
  const removeItem = (i: number) => {
    if (poForm.items.length <= 1) return;
    setPoForm({ ...poForm, items: poForm.items.filter((_, idx) => idx !== i) });
  };

  useEffect(() => {
    fetchSuppliers();
    fetchRawMaterials();
  }, []);

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/purchase-orders")
      .then((r) => r.json())
      .then((data) => setOrders(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const totalSpent = orders
    .filter((o) => o.status === "received")
    .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

  const pending = orders.filter((o) => o.status === "sent" || o.status === "confirmed").length;

  const now = new Date();
  const receivedThisMonth = orders.filter(
    (o) => o.status === "received" && new Date(o.orderDate).getMonth() === now.getMonth() && new Date(o.orderDate).getFullYear() === now.getFullYear()
  ).length;

  const handleStatusUpdate = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${statusTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusTarget.status }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Status update failed");
        return;
      }
      showSuccess(`Order marked as ${statusTarget.label}`);
      setStatusTarget(null);
      fetchOrders();
    } catch {
      showError("Network error");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/purchase-orders/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showSuccess("Purchase order deleted");
      setDeleteTarget(null);
      fetchOrders();
    } catch {
      showError("Failed to delete purchase order");
    }
  };

  const statusAction = (order: PurchaseOrder) => {
    if (order.status === "draft") {
      return (
        <Button size="sm" variant="primary" onClick={() => setStatusTarget({ id: order._id, status: "sent", label: "Sent" })}>
          Send
        </Button>
      );
    }
    if (order.status === "sent") {
      return (
        <Button size="sm" variant="outline" onClick={() => setStatusTarget({ id: order._id, status: "confirmed", label: "Confirmed" })}>
          Confirm
        </Button>
      );
    }
    if (order.status === "confirmed") {
      return (
        <Button size="sm" variant="primary" onClick={() => setStatusTarget({ id: order._id, status: "received", label: "Received" })}>
          Receive
        </Button>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Purchase Orders" />
        <div className="flex gap-3">
          <Button size="sm" onClick={() => setShowForm(true)}>
            <PlusIcon className="size-4" />
            New Order
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:gap-6 mb-6">
        <Link href="/purchase-orders" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <ListIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{orders.length}</h4>
        </Link>
        <Link href="/purchase-orders" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">&#8358;{(totalSpent ?? 0).toLocaleString()}</h4>
        </Link>
        <Link href="/purchase-orders" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-3">
            <ListIcon className="text-amber-600 size-5 dark:text-amber-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{pending}</h4>
        </Link>
        <Link href="/purchase-orders" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <ListIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Received This Month</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{receivedThisMonth}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Order #</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Items</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>No purchase orders found.</TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                    <span className="font-mono text-xs">{o.orderNumber}</span>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {o.supplierId ? (
                      <Link href={`/suppliers/${(o.supplierId as SupplierRef)._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {(o.supplierId as SupplierRef).name}
                      </Link>
                    ) : <span className="text-gray-400">&mdash;</span>}
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(o.orderDate)}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(o.items?.length ?? 0)} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}</TableCell>
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">&#8358;{(o.totalAmount ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="py-3">
                    <Badge variant="light" color={statusColor[o.status] ?? "light"}>{o.status}</Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-2 items-center">
                      {statusAction(o)}
                      {o.status === "draft" && (
                        <button
                          onClick={() => setDeleteTarget(o._id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                        >
                          <TrashBinIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusUpdate}
        title={`Mark as ${statusTarget?.label ?? ""}`}
        message={`Are you sure you want to mark this purchase order as "${statusTarget?.label ?? ""}"?`}
        confirmLabel={`Mark as ${statusTarget?.label ?? ""}`}
        loading={statusLoading}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Purchase Order"
        message="This will permanently delete this purchase order. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">New Purchase Order</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
              <select
                value={poForm.supplierId}
                onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="" disabled>Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={poForm.expectedDate}
                onChange={(e) => setPoForm({ ...poForm, expectedDate: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
                <Button size="sm" variant="outline" onClick={addItem}>+ Add Item</Button>
              </div>
              {poForm.items.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Material</label>
                    <select
                      value={item.rawMaterialId}
                      onChange={(e) => updateItem(i, "rawMaterialId", e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                    >
                      <option value="" disabled>Select</option>
                      {rawMaterials.map((rm) => (
                        <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-gray-500 mb-1">Unit Price (&#8358;)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                    />
                  </div>
                  {poForm.items.length > 1 && (
                    <button
                      onClick={() => removeItem(i)}
                      className="h-10 px-2 text-red-500 hover:text-red-700 text-sm"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={poForm.notes}
                onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" disabled={formSaving} onClick={handleNewOrder}>
                {formSaving ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
