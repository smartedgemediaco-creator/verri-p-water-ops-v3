"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import AutoAmount from "@/components/ui/AutoAmount";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { ListIcon, DollarLineIcon, TrashBinIcon, PlusIcon, CloseIcon } from "@/icons";
import { usePdfDownload } from "@/hooks/usePdfDownload";

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
  batchIds: string[];
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

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTarget, setStatusTarget] = useState<{ id: string; status: string; label: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string; phone?: string; whatsapp?: string }[]>([]);
  const [rawMaterials, setRawMaterials] = useState<{ _id: string; name: string; unit: string }[]>([]);
  const [factories, setFactories] = useState<{ _id: string; name: string }[]>([]);
  const [depots, setDepots] = useState<{ _id: string; name: string }[]>([]);
  const [poForm, setPoForm] = useState({
    supplierId: "", supplierName: "", expectedDate: "", notes: "",
    deliveryLocationType: "" as "" | "factory" | "depot",
    deliveryLocationId: "",
    items: [{ rawMaterialId: "", itemName: "", itemDescription: "", quantity: 1, unit: "", unitPrice: 0, unitCount: 0, itemUnit: "", isCustom: false }],
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PurchaseOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PurchaseOrder | null>(null);
  const [editForm, setEditForm] = useState({
    supplierId: "", supplierName: "", expectedDate: "", notes: "",
    deliveryLocationType: "" as "" | "factory" | "depot",
    deliveryLocationId: "",
    items: [] as Array<{ rawMaterialId: string; itemName: string; itemDescription: string; quantity: number; unit: string; unitPrice: number; unitCount: number; itemUnit: string; isCustom: boolean; quantityReceived: number }>,
  });
  const [editSaving, setEditSaving] = useState(false);
  const { ref: pdfRef, loading: pdfLoading, download } = usePdfDownload("purchase-orders-list", { title: "Purchase Orders Report" });

  const fetchSuppliers = () => {
    fetch("/api/suppliers").then((r) => r.json()).then((data) => setSuppliers(Array.isArray(data) ? data : [])).catch(() => {});
  };
  const fetchRawMaterials = () => {
    fetch("/api/raw-materials").then((r) => r.json()).then((data) => setRawMaterials(Array.isArray(data) ? data : [])).catch(() => {});
  };
  const fetchFactories = () => {
    fetch("/api/factories").then((r) => r.json()).then((data) => setFactories(Array.isArray(data) ? data : [])).catch(() => {});
  };
  const fetchDepots = () => {
    fetch("/api/depots").then((r) => r.json()).then((data) => setDepots(Array.isArray(data) ? data : [])).catch(() => {});
  };

  const handleNewOrder = async () => {
    if (!poForm.supplierId && !poForm.supplierName.trim()) { showError("Select a supplier or enter a supplier name"); return; }
    const validItems = poForm.items.filter((i) => (i.isCustom ? i.itemName.trim() : i.rawMaterialId) && i.quantity > 0);
    if (validItems.length === 0) { showError("Add at least one item"); return; }
    setFormSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: poForm.supplierId || undefined,
          supplierName: poForm.supplierName,
          expectedDate: poForm.expectedDate || undefined,
          notes: poForm.notes,
          deliveryLocationType: poForm.deliveryLocationType || undefined,
          deliveryLocationId: poForm.deliveryLocationId || undefined,
          items: validItems.map((i) => ({
            rawMaterialId: i.isCustom ? undefined : i.rawMaterialId,
            itemName: i.isCustom ? i.itemName : undefined,
            itemDescription: i.itemDescription,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
            unitCount: i.unitCount || 0,
            itemUnit: i.itemUnit || "",
          })),
        }),
      });
      if (!res.ok) { showError("Failed to create order"); return; }
      showSuccess("Purchase order created");
      setShowForm(false);
      setPoForm({
        supplierId: "", supplierName: "", expectedDate: "", notes: "",
        deliveryLocationType: "", deliveryLocationId: "",
        items: [{ rawMaterialId: "", itemName: "", itemDescription: "", quantity: 1, unit: "", unitPrice: 0, unitCount: 0, itemUnit: "", isCustom: false }],
      });
      fetchOrders();
    } catch { showError("Network error"); }
    finally { setFormSaving(false); }
  };

  const addItem = () => setPoForm({ ...poForm, items: [...poForm.items, { rawMaterialId: "", itemName: "", itemDescription: "", quantity: 1, unit: "", unitPrice: 0, unitCount: 0, itemUnit: "", isCustom: false }] });
  const updateItem = (i: number, field: string, value: string | number) => {
    const items = [...poForm.items];
    items[i] = { ...items[i], [field]: value };
    setPoForm({ ...poForm, items });
  };
  const removeItem = (i: number) => {
    if (poForm.items.length <= 1) return;
    setPoForm({ ...poForm, items: poForm.items.filter((_, idx) => idx !== i) });
  };

  useEffect(() => { fetchSuppliers(); fetchRawMaterials(); fetchFactories(); fetchDepots(); }, []);

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/purchase-orders")
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const totalSpent = orders
    .filter((o) => o.status === "received")
    .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);

  const pending = orders.filter((o) => o.status === "sent" || o.status === "confirmed").length;
  const partiallyReceived = orders.filter((o) => o.status === "partially-received").length;
  const unpaidCount = orders.filter((o) => o.paymentStatus !== "paid" && o.status !== "draft" && o.status !== "cancelled").length;
  const totalUnpaid = orders
    .filter((o) => o.paymentStatus !== "paid" && o.status !== "draft" && o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.totalAmount ?? 0) - (o.amountPaid ?? 0), 0);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = !search || o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.supplierId?.name?.toLowerCase().includes(search.toLowerCase()) || o.supplierName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchSupplier = !supplierFilter || o.supplierId?._id === supplierFilter || (!o.supplierId && supplierFilter === "__none__");
      return matchSearch && matchStatus && matchSupplier;
    });
  }, [orders, search, statusFilter, supplierFilter]);

  const handleStatusUpdate = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${statusTarget.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusTarget.status }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Status update failed"); return; }
      showSuccess(`Order marked as ${statusTarget.label}`);
      setStatusTarget(null); fetchOrders();
    } catch { showError("Network error"); } finally { setStatusLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/purchase-orders/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showSuccess("Purchase order deleted"); setDeleteTarget(null); fetchOrders();
    } catch { showError("Failed to delete purchase order"); }
  };

  const handlePayment = async () => {
    if (!paymentTarget || paymentAmount <= 0) { showError("Enter a valid amount"); return; }
    if (paymentAmount > (paymentTarget.totalAmount - paymentTarget.amountPaid)) {
      showError(`Amount exceeds outstanding balance of ₦${(paymentTarget.totalAmount - paymentTarget.amountPaid).toLocaleString()}`);
      return;
    }
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${paymentTarget._id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: paymentAmount, method: paymentMethod, reference: paymentRef }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Payment failed"); return; }
      showSuccess("Payment recorded"); setShowPaymentModal(false); setPaymentTarget(null);
      setPaymentAmount(0); setPaymentMethod("transfer"); setPaymentRef("");
      fetchOrders();
    } catch { showError("Network error"); } finally { setPaymentSaving(false); }
  };

  const statusAction = (order: PurchaseOrder) => {
    if (order.status === "draft") {
      return <Button size="sm" variant="primary" onClick={() => setStatusTarget({ id: order._id, status: "sent", label: "Sent" })}>Send</Button>;
    }
    if (order.status === "sent") {
      return <Button size="sm" variant="outline" onClick={() => setStatusTarget({ id: order._id, status: "confirmed", label: "Confirmed" })}>Confirm</Button>;
    }
    if (order.status === "confirmed" || order.status === "partially-received") {
      return <Button size="sm" variant="primary" onClick={() => setStatusTarget({ id: order._id, status: "received", label: "Received" })}>Receive</Button>;
    }
    return null;
  };

  const openContact = (phone: string) => {
    if (phone) window.open(`tel:${phone}`, "_self");
  };

  const openWhatsApp = (phone: string) => {
    if (phone) window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const openEditModal = (order: PurchaseOrder) => {
    setEditTarget(order);
    setEditForm({
      supplierId: order.supplierId?._id || "",
      supplierName: order.supplierName || "",
      expectedDate: order.expectedDate ? order.expectedDate.slice(0, 10) : "",
      notes: order.notes || "",
      deliveryLocationType: order.deliveryLocationType || "",
      deliveryLocationId: order.deliveryLocationId || "",
      items: order.items.map((it) => {
        const mat = typeof it.rawMaterialId === "object" ? it.rawMaterialId : null;
        return {
          rawMaterialId: mat?._id || (typeof it.rawMaterialId === "string" ? it.rawMaterialId : ""),
          itemName: it.itemName || "",
          itemDescription: it.itemDescription || "",
          quantity: it.quantity,
          unit: it.unit || mat?.unit || "",
          unitPrice: it.unitPrice,
          unitCount: it.unitCount || 0,
          itemUnit: it.itemUnit || "",
          isCustom: !mat,
          quantityReceived: it.quantityReceived || 0,
        };
      }),
    });
    setShowEditModal(true);
  };

  const updateEditItem = (i: number, field: string, value: string | number) => {
    const items = [...editForm.items];
    items[i] = { ...items[i], [field]: value };
    setEditForm({ ...editForm, items });
  };
  const addEditItem = () => setEditForm({ ...editForm, items: [...editForm.items, { rawMaterialId: "", itemName: "", itemDescription: "", quantity: 1, unit: "", unitPrice: 0, unitCount: 0, itemUnit: "", isCustom: false, quantityReceived: 0 }] });
  const removeEditItem = (i: number) => {
    if (editForm.items.length <= 1) return;
    setEditForm({ ...editForm, items: editForm.items.filter((_, idx) => idx !== i) });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    const validItems = editForm.items.filter((i) => (i.isCustom ? i.itemName.trim() : i.rawMaterialId) && i.quantity > 0);
    if (validItems.length === 0) { showError("Add at least one item"); return; }
    for (const item of validItems) {
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
          items: validItems.map((i) => ({
            rawMaterialId: i.isCustom ? undefined : i.rawMaterialId,
            itemName: i.isCustom ? i.itemName : undefined,
            itemDescription: i.itemDescription,
            quantity: i.quantity,
            unit: i.unit,
            unitPrice: i.unitPrice,
            unitCount: i.unitCount || 0,
            itemUnit: i.itemUnit || "",
            quantityReceived: i.quantityReceived,
          })),
        }),
      });
      if (!res.ok) { showError("Failed to update order"); return; }
      showSuccess("Purchase order updated");
      setShowEditModal(false);
      setEditTarget(null);
      fetchOrders();
    } catch { showError("Network error"); }
    finally { setEditSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Purchase Orders" />
        <div className="flex gap-3">
          <Button size="sm" onClick={() => setShowForm(true)}><PlusIcon className="size-4" /> New Order</Button>
          <Button variant="outline" size="sm" onClick={fetchOrders}>Refresh</Button>
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>{pdfLoading ? "Generating..." : "Download PDF"}</Button>
        </div>
      </div>

      <div ref={pdfRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <ListIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{orders.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
          <AutoAmount value={`₦${(totalSpent ?? 0).toLocaleString()}`} />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-3">
            <ListIcon className="text-amber-600 size-5 dark:text-amber-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Delivery</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{pending + partiallyReceived}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <DollarLineIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Unpaid Orders</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{unpaidCount}</h4>
          {totalUnpaid > 0 && <p className="text-xs text-red-500 dark:text-red-400 mt-1">₦{totalUnpaid.toLocaleString()} outstanding</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <ListIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Received</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{orders.filter((o) => o.status === "received").length}</h4>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input placeholder="Search by order # or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-48">
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
                          <Link href={`/suppliers/${supplier._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{supplier.name}</Link>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{o.supplierName || "—"}</span>
                        )}
                        {supplier?.phone && (
                          <div className="flex gap-1.5 mt-0.5">
                            <button onClick={() => openContact(supplier.phone!)} className="text-xs text-gray-400 hover:text-green-600">📞 Call</button>
                            {supplier.whatsapp && <button onClick={() => openWhatsApp(supplier.whatsapp!)} className="text-xs text-gray-400 hover:text-green-600">💬 WhatsApp</button>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(o.orderDate)}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
                      {o.items?.some((it) => it.itemName) && (
                        <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[120px]">
                          {o.items.filter((it) => it.itemName).map((it) => it.itemName).join(", ")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{(o.totalAmount ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3">
                      <Badge variant="light" color={statusColor[o.status] ?? "light"}>{o.status}</Badge>
                      {isOverdue && <span className="block text-xs text-red-500 dark:text-red-400 mt-0.5">Overdue!</span>}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="light" color={paymentColor[o.paymentStatus] ?? "light"}>{o.paymentStatus}</Badge>
                      {o.paymentStatus !== "paid" && o.status !== "draft" && o.status !== "cancelled" && (
                        <button onClick={() => { setPaymentTarget(o); setPaymentAmount(o.totalAmount - o.amountPaid); setShowPaymentModal(true); }} className="block text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5">Record Payment</button>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="light" color={deliveryColor[o.deliveryStatus] ?? "light"}>{o.deliveryStatus}</Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-2 items-center">
                        {statusAction(o)}
                        {(o.status === "draft" || o.status === "sent") && (
                          <button onClick={() => openEditModal(o)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                            Edit
                          </button>
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

      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!paymentSaving) { setShowPaymentModal(false); setPaymentTarget(null); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Record Payment</h3>
              <button onClick={() => { setShowPaymentModal(false); setPaymentTarget(null); }} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                <p className="text-gray-600 dark:text-gray-300"><strong>{paymentTarget.orderNumber}</strong></p>
                <p className="text-gray-500 dark:text-gray-400">Total: ₦{paymentTarget.totalAmount.toLocaleString()}</p>
                <p className="text-gray-500 dark:text-gray-400">Paid: ₦{paymentTarget.amountPaid.toLocaleString()}</p>
                <p className="text-red-600 dark:text-red-400 font-medium">Outstanding: ₦{(paymentTarget.totalAmount - paymentTarget.amountPaid).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₦)</label>
                <Input type="number" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
                <Select options={[
                  { value: "transfer", label: "Bank Transfer" },
                  { value: "cash", label: "Cash" },
                  { value: "pos", label: "POS" },
                  { value: "cheque", label: "Cheque" },
                  { value: "other", label: "Other" },
                ]} value={paymentMethod} onChange={setPaymentMethod} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference (optional)</label>
                <Input placeholder="e.g. transfer ref, receipt #" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowPaymentModal(false); setPaymentTarget(null); }} disabled={paymentSaving}>Cancel</Button>
                <Button variant="primary" onClick={handlePayment} disabled={paymentSaving || paymentAmount <= 0}>{paymentSaving ? "Saving..." : "Record Payment"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">New Purchase Order</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier (optional)</label>
              <select
                value={poForm.supplierId}
                onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value, supplierName: "" })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="">Walk-in / No Supplier</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            {!poForm.supplierId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={poForm.supplierName}
                  onChange={(e) => setPoForm({ ...poForm, supplierName: e.target.value })}
                  placeholder="e.g. Office Supplies Ltd, Generator Parts, etc."
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                />
              </div>
            )}

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
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const items = [...poForm.items];
                        items[i] = { ...items[i], isCustom: !items[i].isCustom, rawMaterialId: "", itemName: "", unit: "" };
                        setPoForm({ ...poForm, items });
                      }}
                      className={`text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${item.isCustom ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"}`}
                    >
                      {item.isCustom ? "Custom Item" : "Raw Material"}
                    </button>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 ml-auto">
                      Item Total: <span className="text-green-600 dark:text-green-400">₦{((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString()}</span>
                    </span>
                    {poForm.items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 text-sm">&times;</button>
                    )}
                  </div>
                  <div className="flex gap-2 items-end">
                    {item.isCustom ? (
                      <>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Item Name *</label>
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateItem(i, "itemName", e.target.value)}
                            placeholder="e.g. Generator Oil, Office Chairs, Packaging Tape"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItem(i, "unit", e.target.value)}
                            placeholder="pcs/ltrs/kg"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Material</label>
                        <select
                          value={item.rawMaterialId}
                          onChange={(e) => {
                            const items = [...poForm.items];
                            const rm = rawMaterials.find((r) => r._id === e.target.value);
                            items[i] = { ...items[i], rawMaterialId: e.target.value, unit: rm?.unit || items[i].unit };
                            setPoForm({ ...poForm, items });
                          }}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                        >
                          <option value="" disabled>Select</option>
                          {rawMaterials.map((rm) => <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>)}
                        </select>
                      </div>
                    )}
                    <div className="w-20">
                      <label className="block text-xs text-gray-500 mb-1">Qty ({item.unit || "unit"})</label>
                      <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs text-gray-500 mb-1">Unit Price (₦)</label>
                      <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                  </div>
                  <div className="flex gap-2 items-end mt-2">
                    <div className="w-20">
                      <label className="block text-xs text-gray-500 mb-1">Item Count</label>
                      <input type="number" min={0} value={item.unitCount} onChange={(e) => updateItem(i, "unitCount", Number(e.target.value))} placeholder="e.g. 300" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Item Unit</label>
                      <input type="text" value={item.itemUnit} onChange={(e) => updateItem(i, "itemUnit", e.target.value)} placeholder="rolls/bags/etc" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
                      <input
                        type="text"
                        value={item.itemDescription}
                        onChange={(e) => updateItem(i, "itemDescription", e.target.value)}
                        placeholder="Any additional notes..."
                        className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs text-gray-600 dark:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Optional notes..." rows={2} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Location</label>
                <select
                  value={poForm.deliveryLocationType}
                  onChange={(e) => setPoForm({ ...poForm, deliveryLocationType: e.target.value as "" | "factory" | "depot", deliveryLocationId: "" })}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                >
                  <option value="">Not set</option>
                  <option value="factory">Factory</option>
                  <option value="depot">Depot</option>
                </select>
              </div>
              {poForm.deliveryLocationType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {poForm.deliveryLocationType === "factory" ? "Factory" : "Depot"} *
                  </label>
                  <select
                    value={poForm.deliveryLocationId}
                    onChange={(e) => setPoForm({ ...poForm, deliveryLocationId: e.target.value })}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                  >
                    <option value="" disabled>Select</option>
                    {(poForm.deliveryLocationType === "factory" ? factories : depots).map((loc) => (
                      <option key={loc._id} value={loc._id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {poForm.items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Order Total ({poForm.items.length} item{poForm.items.length !== 1 ? "s" : ""})</span>
                <span className="text-lg font-bold text-gray-800 dark:text-white/90">
                  ₦{poForm.items.reduce((sum, it) => sum + (it.quantity ?? 0) * (it.unitPrice ?? 0), 0).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" disabled={formSaving} onClick={handleNewOrder}>{formSaving ? "Creating..." : "Create Order"}</Button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!editSaving) { setShowEditModal(false); setEditTarget(null); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Edit {editTarget.orderNumber}</h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                {editTarget.items.filter((it) => (it.quantityReceived ?? 0) > 0).length > 0 ? "Partially received — edits limited" : "No items received yet"}
              </span>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={editForm.supplierName}
                  onChange={(e) => setEditForm({ ...editForm, supplierName: e.target.value })}
                  placeholder="Supplier name"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={editForm.expectedDate}
                onChange={(e) => setEditForm({ ...editForm, expectedDate: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
                <Button size="sm" variant="outline" onClick={addEditItem}>+ Add Item</Button>
              </div>
              {editForm.items.map((item, i) => {
                const mat = typeof editTarget.items[i]?.rawMaterialId === "object" ? editTarget.items[i].rawMaterialId as { _id: string; name: string; unit: string } : null;
                const isPartial = (item.quantityReceived ?? 0) > 0;
                const maxQty = isPartial ? undefined : undefined;
                return (
                  <div key={i} className={`border rounded-lg p-3 mb-2 ${isPartial ? "border-amber-300 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-500/5" : "border-gray-200 dark:border-gray-700"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const items = [...editForm.items];
                          items[i] = { ...items[i], isCustom: !items[i].isCustom, rawMaterialId: "", itemName: "", unit: "" };
                          setEditForm({ ...editForm, items });
                        }}
                        className={`text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${item.isCustom ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"}`}
                      >
                        {item.isCustom ? "Custom Item" : "Raw Material"}
                      </button>
                      {isPartial && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          {item.quantityReceived} received
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 ml-auto">
                        Item Total: <span className="text-green-600 dark:text-green-400">₦{((item.quantity ?? 0) * (item.unitPrice ?? 0)).toLocaleString()}</span>
                      </span>
                      {editForm.items.length > 1 && (
                        <button onClick={() => removeEditItem(i)} className="text-red-500 hover:text-red-700 text-sm">&times;</button>
                      )}
                    </div>
                    <div className="flex gap-2 items-end">
                      {item.isCustom ? (
                        <>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Item Name *</label>
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => updateEditItem(i, "itemName", e.target.value)}
                              placeholder="Item name"
                              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 mb-1">Unit</label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updateEditItem(i, "unit", e.target.value)}
                              placeholder="unit"
                              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Material</label>
                          <select
                            value={item.rawMaterialId}
                            onChange={(e) => {
                              const items = [...editForm.items];
                              const rm = rawMaterials.find((r) => r._id === e.target.value);
                              items[i] = { ...items[i], rawMaterialId: e.target.value, unit: rm?.unit || items[i].unit };
                              setEditForm({ ...editForm, items });
                            }}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                          >
                            <option value="" disabled>Select</option>
                            {rawMaterials.map((rm) => <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>)}
                          </select>
                        </div>
                      )}
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">Qty ({item.unit || "unit"})</label>
                        <input
                          type="number"
                          min={isPartial ? item.quantityReceived : 1}
                          value={item.quantity}
                          onChange={(e) => updateEditItem(i, "quantity", Number(e.target.value))}
                          className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                        />
                        {isPartial && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">min: {item.quantityReceived}</p>}
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">Unit Price (₦)</label>
                        <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => updateEditItem(i, "unitPrice", Number(e.target.value))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                      </div>
                    </div>
                    <div className="flex gap-2 items-end mt-2">
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">Item Count</label>
                        <input type="number" min={0} value={item.unitCount} onChange={(e) => updateEditItem(i, "unitCount", Number(e.target.value))} placeholder="e.g. 300" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-1">Item Unit</label>
                        <input type="text" value={item.itemUnit} onChange={(e) => updateEditItem(i, "itemUnit", e.target.value)} placeholder="rolls/bags" className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Description</label>
                        <input
                          type="text"
                          value={item.itemDescription}
                          onChange={(e) => updateEditItem(i, "itemDescription", e.target.value)}
                          placeholder="Notes..."
                          className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs text-gray-600 dark:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional notes..." rows={2} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Location</label>
                <select
                  value={editForm.deliveryLocationType}
                  onChange={(e) => setEditForm({ ...editForm, deliveryLocationType: e.target.value as "" | "factory" | "depot", deliveryLocationId: "" })}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                >
                  <option value="">Not set</option>
                  <option value="factory">Factory</option>
                  <option value="depot">Depot</option>
                </select>
              </div>
              {editForm.deliveryLocationType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {editForm.deliveryLocationType === "factory" ? "Factory" : "Depot"}
                  </label>
                  <select
                    value={editForm.deliveryLocationId}
                    onChange={(e) => setEditForm({ ...editForm, deliveryLocationId: e.target.value })}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                  >
                    <option value="" disabled>Select</option>
                    {(editForm.deliveryLocationType === "factory" ? factories : depots).map((loc) => (
                      <option key={loc._id} value={loc._id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {editForm.items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Order Total ({editForm.items.length} item{editForm.items.length !== 1 ? "s" : ""})</span>
                  <span className="text-lg font-bold text-gray-800 dark:text-white/90">
                    ₦{editForm.items.reduce((sum, it) => sum + (it.quantity ?? 0) * (it.unitPrice ?? 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Already Received</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    ₦{editForm.items.reduce((sum, it) => sum + (it.quantityReceived ?? 0) * (it.unitPrice ?? 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-gray-200 dark:border-gray-700 pt-1">
                  <span className="text-gray-500 dark:text-gray-400">Remaining to Receive</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    ₦{editForm.items.reduce((sum, it) => sum + ((it.quantity ?? 0) - (it.quantityReceived ?? 0)) * (it.unitPrice ?? 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowEditModal(false); setEditTarget(null); }} disabled={editSaving}>Cancel</Button>
              <Button size="sm" disabled={editSaving} onClick={handleEditSave}>{editSaving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
