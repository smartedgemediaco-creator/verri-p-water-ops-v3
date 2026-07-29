"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Input from "@/components/form/input/InputField";
import AutoAmount from "@/components/ui/AutoAmount";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { ListIcon, DollarLineIcon, PlusIcon, TrashBinIcon } from "@/icons";

interface PurchaseOrderItem {
  rawMaterialId?: string | { _id: string; name: string; unit: string };
  itemName?: string;
  itemDescription?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  quantityReceived: number;
  unitCount: number;
  itemUnit: string;
}

interface SupplierRef {
  _id: string;
  name: string;
  supplyType?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

interface PurchaseOrder {
  _id: string;
  supplierId?: SupplierRef;
  supplierName?: string;
  orderNumber: string;
  items: PurchaseOrderItem[];
  status: "draft" | "sent" | "confirmed" | "partially-received" | "received" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  amountPaid: number;
  deliveryStatus: "pending" | "in-transit" | "delivered" | "partial";
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  totalAmount: number;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  deliveryLocationType?: "" | "factory" | "depot";
  deliveryLocationId?: string;
}

interface FormItem {
  rawMaterialId: string;
  itemName: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  quantityReceived: number;
  unitCount: number;
  itemUnit: string;
  isCustom: boolean;
}

interface SupplierOption {
  _id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
}

interface RawMatOption {
  _id: string;
  name: string;
  unit: string;
}

const statusColor: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  draft: "light",
  sent: "info",
  confirmed: "warning",
  "partially-received": "info",
  received: "success",
  cancelled: "error",
};

const paymentColor: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  unpaid: "error",
  partial: "warning",
  paid: "success",
};

const deliveryColor: Record<string, "light" | "info" | "warning" | "success"> = {
  pending: "light",
  "in-transit": "info",
  partial: "warning",
  delivered: "success",
};

function emptyFormItem(isCustom = false): FormItem {
  return { rawMaterialId: "", itemName: "", itemDescription: "", quantity: 1, unit: "", unitPrice: 0, quantityReceived: 0, unitCount: 0, itemUnit: "", isCustom };
}

const defaultForm = {
  supplierId: "", supplierName: "", expectedDate: "", notes: "",
  deliveryLocationType: "" as "" | "factory" | "depot",
  deliveryLocationId: "",
  items: [emptyFormItem(false)],
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMatOption[]>([]);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formSaving, setFormSaving] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<PurchaseOrder | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);
  const [editSaving, setEditSaving] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PurchaseOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const [statusTarget, setStatusTarget] = useState<{ id: string; status: string; label: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/purchase-orders")
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  const fetchSuppliers = () => {
    fetch("/api/suppliers").then((r) => r.json()).then((data) => setSuppliers(Array.isArray(data) ? data : [])).catch(() => {});
  };

  const fetchRawMaterials = () => {
    fetch("/api/raw-materials").then((r) => r.json()).then((data) => setRawMaterials(Array.isArray(data) ? data : [])).catch(() => {});
  };

  useEffect(() => { fetchOrders(); fetchSuppliers(); fetchRawMaterials(); }, []);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.filter((o) => o.status === "received").reduce((s, o) => s + (o.totalAmount ?? 0), 0);
    const awaiting = orders.filter((o) => o.status === "sent" || o.status === "confirmed").length +
      orders.filter((o) => o.status === "partially-received").length;
    const unpaid = orders
      .filter((o) => o.status !== "draft" && o.status !== "cancelled" && o.paymentStatus !== "paid")
      .reduce((s, o) => s + (o.totalAmount ?? 0) - (o.amountPaid ?? 0), 0);
    const received = orders.filter((o) => o.status === "received").length;
    return { totalOrders, totalSpent, awaiting, unpaid, received };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = !search ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.supplierId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.supplierName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchSupplier = !supplierFilter ||
        o.supplierId?._id === supplierFilter ||
        (!o.supplierId && supplierFilter === "__none__");
      return matchSearch && matchStatus && matchSupplier;
    });
  }, [orders, search, statusFilter, supplierFilter]);

  /* ── Create ── */
  const handleCreate = async () => {
    if (!form.supplierId && !form.supplierName.trim()) { showError("Select a supplier or enter a name"); return; }
    const valid = form.items.filter((i) => (i.isCustom ? i.itemName.trim() : i.rawMaterialId) && i.quantity > 0);
    if (!valid.length) { showError("Add at least one item"); return; }
    setFormSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: form.supplierId || undefined,
          supplierName: form.supplierName,
          expectedDate: form.expectedDate || undefined,
          notes: form.notes,
          deliveryLocationType: form.deliveryLocationType || undefined,
          deliveryLocationId: form.deliveryLocationId || undefined,
          items: valid.map((i) => ({
            rawMaterialId: i.isCustom ? undefined : i.rawMaterialId,
            itemName: i.isCustom ? i.itemName : undefined,
            itemDescription: i.itemDescription,
            quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice,
            unitCount: i.unitCount || 0, itemUnit: i.itemUnit || "",
          })),
        }),
      });
      if (!res.ok) { showError("Failed to create order"); return; }
      showSuccess("Purchase order created");
      setShowForm(false); setForm(defaultForm); fetchOrders();
    } catch { showError("Network error"); } finally { setFormSaving(false); }
  };

  /* ── Edit ── */
  const openEdit = (o: PurchaseOrder) => {
    setEditTarget(o);
    setEditForm({
      supplierId: o.supplierId?._id || "",
      supplierName: o.supplierName || "",
      expectedDate: o.expectedDate ? o.expectedDate.slice(0, 10) : "",
      notes: o.notes || "",
      deliveryLocationType: o.deliveryLocationType || "",
      deliveryLocationId: o.deliveryLocationId || "",
      items: o.items.map((it) => {
        const mat = typeof it.rawMaterialId === "object" ? it.rawMaterialId : null;
        return {
          rawMaterialId: mat?._id || (typeof it.rawMaterialId === "string" ? it.rawMaterialId : ""),
          itemName: it.itemName || "",
          itemDescription: it.itemDescription || "",
          quantity: it.quantity,
          unit: it.unit || mat?.unit || "",
          unitPrice: it.unitPrice,
          quantityReceived: it.quantityReceived || 0,
          unitCount: it.unitCount || 0,
          itemUnit: it.itemUnit || "",
          isCustom: !mat,
        };
      }),
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    const valid = editForm.items.filter((i) => (i.isCustom ? i.itemName.trim() : i.rawMaterialId) && i.quantity > 0);
    if (!valid.length) { showError("Add at least one item"); return; }
    for (const item of valid) {
      if (item.quantity < item.quantityReceived) {
        showError(`Quantity for "${item.itemName || item.rawMaterialId}" cannot be less than already received (${item.quantityReceived})`);
        return;
      }
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: editForm.supplierId || undefined,
          supplierName: editForm.supplierName,
          expectedDate: editForm.expectedDate || undefined,
          notes: editForm.notes,
          deliveryLocationType: editForm.deliveryLocationType || undefined,
          deliveryLocationId: editForm.deliveryLocationId || undefined,
          items: valid.map((i) => ({
            rawMaterialId: i.isCustom ? undefined : i.rawMaterialId,
            itemName: i.isCustom ? i.itemName : undefined,
            itemDescription: i.itemDescription,
            quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice,
            unitCount: i.unitCount || 0, itemUnit: i.itemUnit || "",
            quantityReceived: i.quantityReceived,
          })),
        }),
      });
      if (!res.ok) { showError("Failed to update order"); return; }
      showSuccess("Purchase order updated");
      setShowEdit(false); setEditTarget(null); fetchOrders();
    } catch { showError("Network error"); } finally { setEditSaving(false); }
  };

  /* ── Status ── */
  const handleStatus = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${statusTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusTarget.status }),
      });
      if (!res.ok) { const e = await res.json(); showError(e.error || "Status update failed"); return; }
      showSuccess(`Order marked as ${statusTarget.label}`);
      setStatusTarget(null); fetchOrders();
    } catch { showError("Network error"); } finally { setStatusLoading(false); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/purchase-orders/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      showSuccess("Purchase order deleted"); setDeleteTarget(null); fetchOrders();
    } catch { showError("Failed to delete purchase order"); }
  };

  /* ── Payment ── */
  const handlePayment = async () => {
    if (!paymentTarget || paymentAmount <= 0) { showError("Enter a valid amount"); return; }
    const outstanding = paymentTarget.totalAmount - paymentTarget.amountPaid;
    if (paymentAmount > outstanding) { showError(`Amount exceeds outstanding ₦${outstanding.toLocaleString()}`); return; }
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${paymentTarget._id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: paymentAmount, method: paymentMethod, reference: paymentRef }),
      });
      if (!res.ok) { const e = await res.json(); showError(e.error || "Payment failed"); return; }
      showSuccess("Payment recorded");
      setShowPayment(false); setPaymentTarget(null); setPaymentAmount(0); setPaymentMethod("transfer"); setPaymentRef("");
      fetchOrders();
    } catch { showError("Network error"); } finally { setPaymentSaving(false); }
  };

  /* ── Form helpers ── */
  const updateItem = (items: FormItem[], i: number, field: string, value: string | number) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    return next;
  };

  const rmSelect = (items: FormItem[], i: number, id: string, mats: RawMatOption[]) => {
    const next = [...items];
    const rm = mats.find((r) => r._id === id);
    next[i] = { ...next[i], rawMaterialId: id, unit: rm?.unit || next[i].unit };
    return next;
  };

  const toggleCustom = (item: FormItem) => ({ ...item, isCustom: !item.isCustom, rawMaterialId: "", itemName: "", unit: "" });

  const calcTotal = (items: FormItem[]) => items.reduce((s, it) => s + (it.quantity ?? 0) * (it.unitPrice ?? 0), 0);

  /* ── Status action button ── */
  const statusAction = (o: PurchaseOrder) => {
    if (o.status === "draft") return <Button size="sm" variant="primary" onClick={() => setStatusTarget({ id: o._id, status: "sent", label: "Sent" })}>Send</Button>;
    if (o.status === "sent") return <Button size="sm" variant="outline" onClick={() => setStatusTarget({ id: o._id, status: "confirmed", label: "Confirmed" })}>Confirm</Button>;
    if (o.status === "confirmed" || o.status === "partially-received") {
      return <Link href={`/purchase-orders/${o._id}`}><Button size="sm" variant="primary">Receive</Button></Link>;
    }
    return null;
  };

  /* ── Render ── */
  return (
    <div>
      <PageBreadcrumb pageTitle="Purchases" />
      <div className="flex items-center justify-end gap-3 mb-6 -mt-2">
        <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon className="size-4" /> New Purchase</Button>
        <Button variant="outline" size="sm" onClick={fetchOrders}>Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <ListIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats.totalOrders}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
          <AutoAmount value={`₦${(stats.totalSpent ?? 0).toLocaleString()}`} />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-3">
            <ListIcon className="text-amber-600 size-5 dark:text-amber-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting Delivery</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats.awaiting}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <DollarLineIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Unpaid</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">₦{stats.unpaid.toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <ListIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Received</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats.received}</h4>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input placeholder="Search by order # or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-52">
          <Select
            options={[
              { value: "", label: "All Suppliers" },
              ...suppliers.map((s) => ({ value: s._id, label: s.name })),
              { value: "__none__", label: "No Supplier (Walk-in)" },
            ]}
            value={supplierFilter} onChange={setSupplierFilter}
          />
        </div>
        <div className="w-48">
          <Select
            options={[
              { value: "", label: "All Statuses" },
              { value: "draft", label: "Draft" },
              { value: "sent", label: "Sent" },
              { value: "confirmed", label: "Confirmed" },
              { value: "partially-received", label: "Partially Received" },
              { value: "received", label: "Received" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            value={statusFilter} onChange={setStatusFilter}
          />
        </div>
      </div>

      {/* Table */}
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
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Payment</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Delivery</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>Loading...</TableCell></TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>{orders.length === 0 ? "No purchase orders found." : "No orders match your search."}</TableCell></TableRow>
            ) : (
              filteredOrders.map((o) => {
                const supplier = o.supplierId as SupplierRef;
                const isOverdue = o.expectedDate && new Date(o.expectedDate) < new Date() && (o.status === "sent" || o.status === "confirmed");
                return (
                  <TableRow key={o._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      <Link href={`/purchase-orders/${o._id}`} className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline">{o.orderNumber}</Link>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm">
                      <div className="flex flex-col">
                        {supplier?._id ? (
                          <Link href={`/suppliers/${supplier._id}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{supplier.name}</Link>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{o.supplierName || "—"}</span>
                        )}
                        {supplier?.phone && (
                          <div className="flex gap-2 mt-0.5">
                            <button onClick={() => window.open(`tel:${supplier.phone}`, "_self")} className="text-[11px] text-gray-400 hover:text-green-600">Call</button>
                            {supplier.whatsapp && <button onClick={() => window.open(`https://wa.me/${supplier.whatsapp!.replace(/[^0-9]/g, "")}`, "_blank")} className="text-[11px] text-gray-400 hover:text-green-600">WhatsApp</button>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(o.orderDate)}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{o.items?.length ?? 0}</TableCell>
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{(o.totalAmount ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3">
                      <Badge variant="light" color={statusColor[o.status] ?? "light"}>{o.status}</Badge>
                      {isOverdue && <span className="block text-xs text-red-500 dark:text-red-400 mt-0.5">Overdue!</span>}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="light" color={paymentColor[o.paymentStatus] ?? "light"}>{o.paymentStatus}</Badge>
                      {o.paymentStatus !== "paid" && o.status !== "draft" && o.status !== "cancelled" && (
                        <button
                          onClick={() => { setPaymentTarget(o); setPaymentAmount(o.totalAmount - o.amountPaid); setShowPayment(true); }}
                          className="block text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                        >Pay</button>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="light" color={deliveryColor[o.deliveryStatus] ?? "light"}>{o.deliveryStatus}</Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-2 items-center">
                        {statusAction(o)}
                        {(o.status === "draft" || o.status === "sent") && (
                          <button onClick={() => openEdit(o)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">Edit</button>
                        )}
                        {o.status === "draft" && (
                          <button onClick={() => setDeleteTarget(o._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                            <TrashBinIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── ConfirmDialogs ── */}
      <ConfirmDialog
        isOpen={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatus}
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

      {/* ── Payment Modal ── */}
      {showPayment && paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!paymentSaving) { setShowPayment(false); setPaymentTarget(null); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Record Payment</h3>
              <button onClick={() => { setShowPayment(false); setPaymentTarget(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                <p className="text-gray-600 dark:text-gray-300 font-medium">{paymentTarget.orderNumber}</p>
                <p className="text-gray-500 dark:text-gray-400">Total: ₦{paymentTarget.totalAmount.toLocaleString()}</p>
                <p className="text-gray-500 dark:text-gray-400">Paid: ₦{paymentTarget.amountPaid.toLocaleString()}</p>
                <p className="text-red-600 dark:text-red-400 font-medium">Outstanding: ₦{(paymentTarget.totalAmount - paymentTarget.amountPaid).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (₦)</label>
                <Input type="number" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Method</label>
                <Select options={[
                  { value: "transfer", label: "Bank Transfer" },
                  { value: "cash", label: "Cash" },
                  { value: "pos", label: "POS" },
                  { value: "cheque", label: "Cheque" },
                  { value: "other", label: "Other" },
                ]} value={paymentMethod} onChange={setPaymentMethod} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reference (optional)</label>
                <Input placeholder="e.g. transfer ref, receipt #" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowPayment(false); setPaymentTarget(null); }} disabled={paymentSaving}>Cancel</Button>
                <Button variant="primary" onClick={handlePayment} disabled={paymentSaving || paymentAmount <= 0}>{paymentSaving ? "Saving..." : "Record Payment"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/40 pt-10" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">New Purchase</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Supplier</label>
              <select
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value, supplierName: "" })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="">Walk-in / No Supplier</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            {!form.supplierId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Supplier Name *</label>
                <input
                  type="text" value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  placeholder="e.g. Office Supplies Ltd, Generator Parts"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expected Delivery</label>
              <input
                type="date" value={form.expectedDate}
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, items: [...form.items, emptyFormItem(false)] })}>+ Add Item</Button>
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const items = [...form.items];
                        items[i] = toggleCustom(items[i]);
                        setForm({ ...form, items });
                      }}
                      className={`text-[10px] font-medium px-2 py-1 rounded-full transition-colors cursor-pointer ${item.isCustom ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/20" : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20"}`}
                    >
                      {item.isCustom ? "Custom Item" : "Raw Material"}
                    </button>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 ml-auto">
                      Subtotal: <span className="text-green-600 dark:text-green-400">₦{((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString()}</span>
                    </span>
                    {form.items.length > 1 && (
                      <button onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-700 text-sm leading-none">&times;</button>
                    )}
                  </div>
                  <div className="flex gap-2 items-end">
                    {item.isCustom ? (
                      <>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Item Name *</label>
                          <input type="text" value={item.itemName} onChange={(e) => setForm({ ...form, items: updateItem(form.items, i, "itemName", e.target.value) })} placeholder="e.g. Generator Oil" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">Unit</label>
                          <input type="text" value={item.unit} onChange={(e) => setForm({ ...form, items: updateItem(form.items, i, "unit", e.target.value) })} placeholder="pcs/ltrs/kg" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                        </div>
                      </>
                    ) : (
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Material</label>
                        <select
                          value={item.rawMaterialId}
                          onChange={(e) => setForm({ ...form, items: rmSelect(form.items, i, e.target.value, rawMaterials) })}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                        >
                          <option value="" disabled>Select</option>
                          {rawMaterials.map((rm) => <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>)}
                        </select>
                      </div>
                    )}
                    <div className="w-20">
                      <label className="block text-xs text-gray-500 mb-1">Qty</label>
                      <input type="number" min={1} value={item.quantity} onChange={(e) => setForm({ ...form, items: updateItem(form.items, i, "quantity", Number(e.target.value)) })} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Unit Price (₦)</label>
                      <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => setForm({ ...form, items: updateItem(form.items, i, "unitPrice", Number(e.target.value)) })} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                  </div>
                  <div className="flex gap-2 items-end mt-2">
                    <div className="w-20">
                      <label className="block text-xs text-gray-500 mb-1">Item Count</label>
                      <input type="number" min={0} value={item.unitCount} onChange={(e) => setForm({ ...form, items: updateItem(form.items, i, "unitCount", Number(e.target.value)) })} placeholder="e.g. 300" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Item Unit</label>
                      <input type="text" value={item.itemUnit} onChange={(e) => setForm({ ...form, items: updateItem(form.items, i, "itemUnit", e.target.value) })} placeholder="rolls/bags" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <input type="text" value={item.itemDescription} onChange={(e) => setForm({ ...form, items: updateItem(form.items, i, "itemDescription", e.target.value) })} placeholder="Optional notes..." className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs text-gray-600 dark:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={2} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none" />
            </div>

            {form.items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Order Total ({form.items.length} item{form.items.length !== 1 ? "s" : ""})</span>
                <span className="text-lg font-bold text-gray-800 dark:text-white/90">₦{calcTotal(form.items).toLocaleString()}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" disabled={formSaving} onClick={handleCreate}>{formSaving ? "Creating..." : "Create Order"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEdit && editTarget && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/40 pt-10" onClick={() => { if (!editSaving) { setShowEdit(false); setEditTarget(null); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Edit {editTarget.orderNumber}</h3>
                {editTarget.items.some((it) => (it.quantityReceived ?? 0) > 0) && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Has received items</span>
                )}
              </div>
              <button onClick={() => { setShowEdit(false); setEditTarget(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Supplier</label>
              <select
                value={editForm.supplierId}
                onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value, supplierName: "" })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="">No Supplier</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            {!editForm.supplierId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Supplier Name</label>
                <input type="text" value={editForm.supplierName} onChange={(e) => setEditForm({ ...editForm, supplierName: e.target.value })} placeholder="Supplier name" className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expected Delivery</label>
              <input type="date" value={editForm.expectedDate} onChange={(e) => setEditForm({ ...editForm, expectedDate: e.target.value })} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
                <Button size="sm" variant="outline" onClick={() => setEditForm({ ...editForm, items: [...editForm.items, { ...emptyFormItem(false), quantityReceived: 0 }] })}>+ Add Item</Button>
              </div>
              {editForm.items.map((item, i) => {
                const isPartial = (item.quantityReceived ?? 0) > 0;
                return (
                  <div key={i} className={`border rounded-lg p-3 mb-2 ${isPartial ? "border-amber-300 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-500/5" : "border-gray-200 dark:border-gray-700"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const items = [...editForm.items];
                          items[i] = toggleCustom(items[i]);
                          setEditForm({ ...editForm, items });
                        }}
                        className={`text-[10px] font-medium px-2 py-1 rounded-full transition-colors cursor-pointer ${item.isCustom ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/20" : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20"}`}
                      >
                        {item.isCustom ? "Custom Item" : "Raw Material"}
                      </button>
                      {isPartial && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          {item.quantityReceived} received
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 ml-auto">
                        Subtotal: <span className="text-green-600 dark:text-green-400">₦{((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString()}</span>
                      </span>
                      {editForm.items.length > 1 && (
                        <button onClick={() => setEditForm({ ...editForm, items: editForm.items.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-700 text-sm leading-none">&times;</button>
                      )}
                    </div>
                    <div className="flex gap-2 items-end">
                      {item.isCustom ? (
                        <>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Item Name *</label>
                            <input type="text" value={item.itemName} onChange={(e) => setEditForm({ ...editForm, items: updateItem(editForm.items, i, "itemName", e.target.value) })} placeholder="Item name" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 mb-1">Unit</label>
                            <input type="text" value={item.unit} onChange={(e) => setEditForm({ ...editForm, items: updateItem(editForm.items, i, "unit", e.target.value) })} placeholder="unit" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                          </div>
                        </>
                      ) : (
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Material</label>
                          <select
                            value={item.rawMaterialId}
                            onChange={(e) => setEditForm({ ...editForm, items: rmSelect(editForm.items, i, e.target.value, rawMaterials) })}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                          >
                            <option value="" disabled>Select</option>
                            {rawMaterials.map((rm) => <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>)}
                          </select>
                        </div>
                      )}
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input type="number" min={isPartial ? item.quantityReceived : 1} value={item.quantity} onChange={(e) => setEditForm({ ...editForm, items: updateItem(editForm.items, i, "quantity", Number(e.target.value)) })} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                        {isPartial && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">min: {item.quantityReceived}</p>}
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-1">Unit Price (₦)</label>
                        <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => setEditForm({ ...editForm, items: updateItem(editForm.items, i, "unitPrice", Number(e.target.value)) })} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                      </div>
                    </div>
                    <div className="flex gap-2 items-end mt-2">
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">Item Count</label>
                        <input type="number" min={0} value={item.unitCount} onChange={(e) => setEditForm({ ...editForm, items: updateItem(editForm.items, i, "unitCount", Number(e.target.value)) })} placeholder="e.g. 300" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-1">Item Unit</label>
                        <input type="text" value={item.itemUnit} onChange={(e) => setEditForm({ ...editForm, items: updateItem(editForm.items, i, "itemUnit", e.target.value) })} placeholder="rolls/bags" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <input type="text" value={item.itemDescription} onChange={(e) => setEditForm({ ...editForm, items: updateItem(editForm.items, i, "itemDescription", e.target.value) })} placeholder="Notes..." className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs text-gray-600 dark:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional notes..." rows={2} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none" />
            </div>

            {editForm.items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Order Total ({editForm.items.length} item{editForm.items.length !== 1 ? "s" : ""})</span>
                  <span className="text-lg font-bold text-gray-800 dark:text-white/90">₦{calcTotal(editForm.items).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Already Received</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">₦{editForm.items.reduce((s, it) => s + (it.quantityReceived ?? 0) * (it.unitPrice ?? 0), 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-gray-200 dark:border-gray-700 pt-1">
                  <span className="text-gray-500 dark:text-gray-400">Remaining to Receive</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">₦{editForm.items.reduce((s, it) => s + ((it.quantity ?? 0) - (it.quantityReceived ?? 0)) * (it.unitPrice ?? 0), 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowEdit(false); setEditTarget(null); }} disabled={editSaving}>Cancel</Button>
              <Button size="sm" disabled={editSaving} onClick={handleEdit}>{editSaving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
