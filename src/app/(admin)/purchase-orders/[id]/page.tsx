"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import AutoAmount from "@/components/ui/AutoAmount";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { CloseIcon } from "@/icons";

interface POItem {
  rawMaterialId?: { _id: string; name: string; unit: string } | string;
  itemName?: string;
  itemDescription?: string;
  quantity: number; unit: string; unitPrice: number; quantityReceived: number;
}

interface PaymentEntry {
  amount: number; method: string; date: string; reference: string; notes: string; recordedBy: string;
}

interface PurchaseOrder {
  _id: string; supplierId?: { _id: string; name: string; phone?: string; whatsapp?: string; email?: string; contactPerson?: string };
  supplierName?: string;
  orderNumber: string; items: POItem[]; status: string; paymentStatus: string; amountPaid: number;
  payments: PaymentEntry[]; deliveryStatus: string; orderDate: string; expectedDate?: string;
  receivedDate?: string; totalAmount: number; contactPhone: string; contactEmail: string; notes: string;
}

const statusColor: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  draft: "light", sent: "info", confirmed: "warning", "partially-received": "info", received: "success", cancelled: "error",
};
const paymentColor: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  unpaid: "error", partial: "warning", paid: "success",
};
const deliveryColor: Record<string, "light" | "info" | "warning" | "success"> = {
  pending: "light", "in-transit": "info", partial: "warning", delivered: "success",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusTarget, setStatusTarget] = useState<{ status: string; label: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const fetchOrder = () => {
    setLoading(true);
    fetch(`/api/purchase-orders/${id}`)
      .then((r) => r.json())
      .then((data) => setOrder(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (id) fetchOrder(); }, [id]);

  const handleStatusUpdate = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusTarget.status }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess(`Marked as ${statusTarget.label}`); setStatusTarget(null); fetchOrder();
    } catch { showError("Network error"); } finally { setStatusLoading(false); }
  };

  const handlePayment = async () => {
    if (paymentAmount <= 0 || !order) { showError("Enter a valid amount"); return; }
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}/payment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: paymentAmount, method: paymentMethod, reference: paymentRef }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Payment recorded"); setShowPaymentModal(false);
      setPaymentAmount(0); setPaymentMethod("transfer"); setPaymentRef(""); fetchOrder();
    } catch { showError("Network error"); } finally { setPaymentSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!order) return <div className="p-8 text-center text-gray-500">Order not found.</div>;

  const supplier = order.supplierId;
  const outstanding = order.totalAmount - order.amountPaid;
  const isOverdue = order.expectedDate && new Date(order.expectedDate) < new Date() && (order.status === "sent" || order.status === "confirmed");
  const statusActions: { status: string; label: string; variant: "primary" | "outline" }[] = [];
  if (order.status === "draft") statusActions.push({ status: "sent", label: "Send", variant: "primary" });
  if (order.status === "sent") statusActions.push({ status: "confirmed", label: "Confirm", variant: "outline" });
  if (order.status === "confirmed" || order.status === "partially-received") statusActions.push({ status: "received", label: "Receive", variant: "primary" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={order.orderNumber} />
        <div className="flex gap-3">
          {supplier?.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${supplier!.phone}`, "_self")}>📞 Call</Button>}
          {supplier?.whatsapp && <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${supplier!.whatsapp!.replace(/[^0-9]/g, "")}`, "_blank")}>💬 WhatsApp</Button>}
          {outstanding > 0 && order.status !== "draft" && order.status !== "cancelled" && (
            <Button variant="primary" size="sm" onClick={() => { setPaymentAmount(outstanding); setShowPaymentModal(true); }}>Record Payment</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
          <AutoAmount value={`₦${order.totalAmount.toLocaleString()}`} />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Amount Paid</p>
          <AutoAmount value={`₦${order.amountPaid.toLocaleString()}`} />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
          <h4 className={`mt-1 font-bold text-title-sm ${outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>₦{outstanding.toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="light" color={statusColor[order.status] ?? "light"}>{order.status}</Badge>
            {isOverdue && <span className="text-xs text-red-500 self-center">Overdue!</span>}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Delivery</p>
          <Badge variant="light" color={deliveryColor[order.deliveryStatus] ?? "light"}>{order.deliveryStatus}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Order Info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Order Date</dt><dd className="text-gray-800 dark:text-white/90">{formatDate(order.orderDate)}</dd></div>
            {order.expectedDate && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Expected</dt><dd className={`${isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-800 dark:text-white/90"}`}>{formatDate(order.expectedDate)}</dd></div>}
            {order.receivedDate && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Received</dt><dd className="text-gray-800 dark:text-white/90">{formatDate(order.receivedDate)}</dd></div>}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" />
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Supplier</dt><dd>{supplier?._id ? <Link href={`/suppliers/${supplier._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{supplier.name}</Link> : <span className="text-gray-800 dark:text-white/90 font-medium">{order.supplierName || "—"}</span>}</dd></div>
            {supplier?.contactPerson && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Contact</dt><dd className="text-gray-800 dark:text-white/90">{supplier.contactPerson}</dd></div>}
            {supplier?.phone && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone</dt><dd className="text-gray-800 dark:text-white/90">{supplier.phone}</dd></div>}
            {supplier?.email && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Email</dt><dd className="text-gray-800 dark:text-white/90">{supplier.email}</dd></div>}
            {order.notes && <><div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" /><div><dt className="text-gray-500 dark:text-gray-400 mb-1">Notes</dt><dd className="text-gray-600 dark:text-gray-300">{order.notes}</dd></div></>}
          </dl>
          {statusActions.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {statusActions.map((a) => (
                <Button key={a.status} size="sm" variant={a.variant} onClick={() => setStatusTarget(a)}>{a.label}</Button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Order Items</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Item</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ordered</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Received</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit Price</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Subtotal</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, i) => {
                const mat = typeof item.rawMaterialId === "object" ? item.rawMaterialId : null;
                return (
                  <TableRow key={i}>
                    <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {mat ? <Link href={`/raw-materials/${mat._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{mat.name}</Link> : (item.itemName || "—")}
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{item.itemDescription || "—"}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{item.quantity.toLocaleString()} {mat?.unit || item.unit || ""}</TableCell>
                    <TableCell className="py-2 text-theme-sm">
                      <span className={item.quantityReceived >= item.quantity ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
                        {(item.quantityReceived ?? 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">₦{item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{(item.quantity * item.unitPrice).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {order.payments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm mb-6">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Payment History ({order.payments.length})</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Amount</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Method</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Reference</TableCell>
                <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Recorded By</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.payments.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(p.date)}</TableCell>
                  <TableCell className="py-2 text-theme-sm font-medium text-green-600 dark:text-green-400">₦{p.amount.toLocaleString()}</TableCell>
                  <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{p.method}</TableCell>
                  <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{p.reference || "—"}</TableCell>
                  <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{p.recordedBy || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        isOpen={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusUpdate}
        title={`Mark as ${statusTarget?.label ?? ""}`}
        message={`Are you sure you want to mark this PO as "${statusTarget?.label ?? ""}"?`}
        confirmLabel={`Mark as ${statusTarget?.label ?? ""}`}
        loading={statusLoading}
        variant="warning"
      />

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!paymentSaving) setShowPaymentModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <p className="text-red-600 dark:text-red-400 font-medium">Outstanding: ₦{outstanding.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₦)</label>
                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
                <Select options={[{ value: "transfer", label: "Bank Transfer" }, { value: "cash", label: "Cash" }, { value: "pos", label: "POS" }, { value: "cheque", label: "Cheque" }, { value: "other", label: "Other" }]} value={paymentMethod} onChange={setPaymentMethod} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference (optional)</label>
                <Input placeholder="Transfer ref, receipt #" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(false)} disabled={paymentSaving}>Cancel</Button>
                <Button variant="primary" onClick={handlePayment} disabled={paymentSaving || paymentAmount <= 0}>{paymentSaving ? "Saving..." : "Record Payment"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
