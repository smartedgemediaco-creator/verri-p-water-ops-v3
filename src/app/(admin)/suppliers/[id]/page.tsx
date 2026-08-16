"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { PlusIcon, CloseIcon } from "@/icons";

interface Supplier {
  _id: string; name: string; phone: string; phone2: string; email: string; whatsapp: string;
  contactPerson: string; address: string; supplyType: string; materialProvided: string;
  totalOwedToUs: number; totalWeOwe: number; netBalance: number;
  isActive: boolean; notes: string;
}

interface SupplierPO {
  _id: string; orderNumber: string; status: string; paymentStatus: string;
  totalAmount: number; amountPaid: number; orderDate: string; items: { quantity: number }[];
}

interface LedgerEntry {
  _id: string; date: string; type: string; description: string;
  orderId?: { _id: string; orderNumber: string } | string;
  debit: number; credit: number; amount: number;
  paymentMethod?: string; reference: string; runningBalance: number; notes: string;
}

const statusColor: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  draft: "light", sent: "info", confirmed: "warning", "partially-received": "info", received: "success", cancelled: "error",
};

const ledgerTypeColors: Record<string, string> = {
  order: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "payment-sent": "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  "payment-received": "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  return: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  adjustment: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
  "credit-note": "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

export default function SupplierDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orders, setOrders] = useState<SupplierPO[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerType, setLedgerType] = useState("payment-sent");
  const [ledgerAmount, setLedgerAmount] = useState(0);
  const [ledgerMethod, setLedgerMethod] = useState("transfer");
  const [ledgerRef, setLedgerRef] = useState("");
  const [ledgerNotes, setLedgerNotes] = useState("");
  const [ledgerSaving, setLedgerSaving] = useState(false);

  const fetchData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/suppliers/${id}`).then((r) => r.json()),
      fetch(`/api/purchase-orders?supplierId=${id}`).then((r) => r.json()),
      fetch(`/api/suppliers/${id}/ledger`).then((r) => r.json()).catch(() => []),
      fetch(`/api/suppliers/${id}/balance`).then((r) => r.json()).catch(() => null),
    ]).then(([sup, poData, ledgerData, balance]) => {
      setSupplier(sup);
      setOrders(Array.isArray(poData) ? poData : []);
      setLedger(Array.isArray(ledgerData) ? ledgerData : []);
      if (balance) {
        setSupplier((prev) => prev ? { ...prev, totalOwedToUs: balance.totalOwedToUs, totalWeOwe: balance.totalWeOwe, netBalance: balance.netBalance } : prev);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleLedgerEntry = async () => {
    if (ledgerAmount <= 0) { showError("Enter a valid amount"); return; }
    setLedgerSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${id}/ledger`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: ledgerType, amount: ledgerAmount, paymentMethod: ledgerMethod, reference: ledgerRef, notes: ledgerNotes }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Entry recorded"); setShowLedgerModal(false);
      setLedgerAmount(0); setLedgerRef(""); setLedgerNotes(""); fetchData();
    } catch { showError("Network error"); } finally { setLedgerSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!supplier) return <div className="p-8 text-center text-gray-500">Supplier not found.</div>;

  const outstanding = orders.filter((o) => o.paymentStatus !== "paid").reduce((s, o) => s + o.totalAmount - o.amountPaid, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={supplier.name} />
        <div className="flex gap-3">
          {supplier.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${supplier.phone}`, "_self")}>Call</Button>}
          {supplier.whatsapp && <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${supplier.whatsapp.replace(/[^0-9]/g, "")}`, "_blank")}>WhatsApp</Button>}
          {supplier.email && <Button variant="outline" size="sm" onClick={() => window.open(`mailto:${supplier.email}`, "_self")}>Email</Button>}
          <Button variant="primary" size="sm" onClick={() => window.open(`/purchase-orders`, "_self")}>New Order</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{orders.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
          <AutoAmount value={`₦${outstanding.toLocaleString()}`} />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">We Owe Them</p>
          <h4 className="mt-1 font-bold text-red-600 dark:text-red-400 text-title-sm">₦{(supplier.totalWeOwe ?? 0).toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">They Owe Us</p>
          <h4 className="mt-1 font-bold text-green-600 dark:text-green-400 text-title-sm">₦{(supplier.totalOwedToUs ?? 0).toLocaleString()}</h4>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {[
          { key: "orders", label: `Orders (${orders.length})` },
          { key: "ledger", label: `Ledger (${ledger.length})` },
          { key: "info", label: "Info" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "orders" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
          {orders.length === 0 ? (
            <p className="p-5 text-sm text-gray-500 text-center">No purchase orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Order #</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Items</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Paid</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o._id}>
                    <TableCell className="py-2 text-theme-sm">
                      <Link href={`/purchase-orders/${o._id}`} className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline">{o.orderNumber}</Link>
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(o.orderDate)}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{(o.items?.length ?? 0)}</TableCell>
                    <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{o.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">₦{o.amountPaid.toLocaleString()}</TableCell>
                    <TableCell className="py-2"><Badge variant="light" color={statusColor[o.status] ?? "light"}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Supplier Ledger</h3>
            <Button size="sm" variant="primary" startIcon={<PlusIcon />} onClick={() => setShowLedgerModal(true)}>New Entry</Button>
          </div>
          {ledger.length === 0 ? (
            <p className="p-8 text-sm text-gray-500 text-center">No ledger entries yet. Record payments or adjustments here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Debit</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Credit</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Balance</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Method</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Reference</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((entry) => {
                  const orderId = typeof entry.orderId === "object" ? entry.orderId : null;
                  return (
                    <TableRow key={entry._id}>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(entry.date)}</TableCell>
                      <TableCell className="py-2">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${ledgerTypeColors[entry.type] || ""}`}>{entry.type.replace("-", " ")}</span>
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-600 dark:text-gray-300">
                        {entry.description}
                        {orderId && <Link href={`/purchase-orders/${orderId._id}`} className="ml-1 text-blue-600 dark:text-blue-400 hover:underline text-xs">({orderId.orderNumber})</Link>}
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm font-medium text-red-600 dark:text-red-400">
                        {entry.debit > 0 ? `₦${entry.debit.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm font-medium text-blue-600 dark:text-blue-400">
                        {entry.credit > 0 ? `₦${entry.credit.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        ₦{entry.runningBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{entry.paymentMethod || "—"}</TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{entry.reference || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {activeTab === "info" && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm max-w-2xl">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Type</dt><dd className="text-gray-800 dark:text-white/90 capitalize">{supplier.supplyType}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><Badge variant="light" color={supplier.isActive ? "success" : "error"}>{supplier.isActive ? "Active" : "Inactive"}</Badge></dd></div>
            {supplier.contactPerson && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Contact Person</dt><dd className="text-gray-800 dark:text-white/90">{supplier.contactPerson}</dd></div>}
            {supplier.phone && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone</dt><dd className="text-gray-800 dark:text-white/90">{supplier.phone}</dd></div>}
            {supplier.phone2 && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone 2</dt><dd className="text-gray-800 dark:text-white/90">{supplier.phone2}</dd></div>}
            {supplier.whatsapp && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">WhatsApp</dt><dd className="text-gray-800 dark:text-white/90">{supplier.whatsapp}</dd></div>}
            {supplier.email && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Email</dt><dd className="text-gray-800 dark:text-white/90">{supplier.email}</dd></div>}
            {supplier.address && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Address</dt><dd className="text-gray-800 dark:text-white/90 text-right max-w-[60%]">{supplier.address}</dd></div>}
            {supplier.materialProvided && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Material</dt><dd className="text-gray-800 dark:text-white/90">{supplier.materialProvided}</dd></div>}
            {supplier.notes && <><div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" /><div><dt className="text-gray-500 dark:text-gray-400 mb-1">Notes</dt><dd className="text-gray-600 dark:text-gray-300">{supplier.notes}</dd></div></>}
          </dl>
        </div>
      )}

      {showLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!ledgerSaving) setShowLedgerModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">New Ledger Entry — {supplier.name}</h3>
              <button onClick={() => setShowLedgerModal(false)} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                <Select options={[
                  { value: "payment-sent", label: "Payment Sent (we paid them)" },
                  { value: "payment-received", label: "Payment Received (they paid us)" },
                  { value: "return", label: "Return (goods returned)" },
                  { value: "adjustment", label: "Adjustment" },
                  { value: "credit-note", label: "Credit Note" },
                ]} value={ledgerType} onChange={setLedgerType} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₦) *</label>
                <Input type="number" value={ledgerAmount} onChange={(e) => setLedgerAmount(Number(e.target.value))} />
              </div>
              {["payment-sent", "payment-received"].includes(ledgerType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                  <Select options={[{ value: "transfer", label: "Bank Transfer" }, { value: "cash", label: "Cash" }, { value: "pos", label: "POS" }, { value: "cheque", label: "Cheque" }, { value: "other", label: "Other" }]} value={ledgerMethod} onChange={setLedgerMethod} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference (optional)</label>
                <Input placeholder="Transfer ref, receipt #" value={ledgerRef} onChange={(e) => setLedgerRef(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <Input placeholder="Description..." value={ledgerNotes} onChange={(e) => setLedgerNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowLedgerModal(false)} disabled={ledgerSaving}>Cancel</Button>
                <Button variant="primary" onClick={handleLedgerEntry} disabled={ledgerSaving || ledgerAmount <= 0}>{ledgerSaving ? "Saving..." : "Record Entry"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
