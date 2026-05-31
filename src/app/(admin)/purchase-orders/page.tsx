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
import { ListIcon, DollarLineIcon, TrashBinIcon } from "@/icons";

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
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:gap-6 mb-6">
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
    </div>
  );
}
