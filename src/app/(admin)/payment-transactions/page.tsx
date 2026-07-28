"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/tables/Pagination";
import DatePicker from "@/components/form/date-picker";
import Link from "next/link";
import { BoxIconLine, DollarLineIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface PaymentTransaction {
  _id: string;
  terminalSerial: string;
  transactionRef: string;
  amount: number;
  paymentMethod: string;
  responseCode: string;
  maskedPan?: string;
  cardScheme?: string;
  acquirer?: string;
  transactionDate: string;
  posDeviceId?: { _id: string; name: string } | null;
  saleId?: { _id: string; totalAmount: number; customerName: string } | null;
  status: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "unmatched", label: "Unmatched" },
  { value: "matched", label: "Matched" },
  { value: "ignored", label: "Ignored" },
];

const LOCATION_TYPES = [
  { value: "factory", label: "Factory" },
  { value: "depot", label: "Depot" },
  { value: "truck", label: "Truck" },
];

export default function PaymentTransactionsPage() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [dateKey, setDateKey] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const { ref, loading: pdfLoading, download } = usePdfDownload("pos-transactions-list", { title: "POS Transactions Report" });
  const [manualSerial, setManualSerial] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualProvider, setManualProvider] = useState("moniepoint");
  const [manualRef, setManualRef] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);

  const [convertTarget, setConvertTarget] = useState<PaymentTransaction | null>(null);
  const [convertProduct, setConvertProduct] = useState("");
  const [convertLocationType, setConvertLocationType] = useState("depot");
  const [convertLocations, setConvertLocations] = useState<{ value: string; label: string }[]>([]);
  const [convertLocationId, setConvertLocationId] = useState("");
  const [convertQty, setConvertQty] = useState("1");
  const [convertCustomer, setConvertCustomer] = useState("");
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/factories").then((r) => r.json()),
      fetch("/api/depots").then((r) => r.json()),
    ]).then(([p, f, d]) => {
      if (Array.isArray(p)) setProducts(p.map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      if (Array.isArray(f)) setFactories(f.map((x: { _id: string; name: string; location: string }) => ({ value: x._id, label: `${x.name} — ${x.location}` })));
      if (Array.isArray(d)) setDepots(d.map((x: { _id: string; name: string; location: string }) => ({ value: x._id, label: `${x.name} — ${x.location}` })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (convertLocationType === "factory") setConvertLocations(factories); // eslint-disable-line react-hooks/set-state-in-effect
    else if (convertLocationType === "depot") setConvertLocations(depots); // eslint-disable-line react-hooks/set-state-in-effect
    else setConvertLocations([]); // eslint-disable-line react-hooks/set-state-in-effect
    setConvertLocationId(""); // eslint-disable-line react-hooks/set-state-in-effect
  }, [convertLocationType, factories, depots]);

  const submitManual = async () => {
    if (!manualSerial || !manualAmount) return;
    setManualSubmitting(true);
    try {
      const res = await fetch("/api/payment-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminalSerial: manualSerial,
          amount: parseFloat(manualAmount),
          provider: manualProvider,
          transactionRef: manualRef || undefined,
          transactionDate: manualDate || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to add transaction");
        return;
      }
      showSuccess("Manual transaction added");
      setShowManual(false);
      setManualSerial("");
      setManualAmount("");
      setManualRef("");
      setManualDate("");
      loadTransactions();
    } catch {
      showError("Network error");
    } finally {
      setManualSubmitting(false);
    }
  };

  const loadTransactions = (overrides?: { page?: number }) => {
    setLoading(true);
    const params = new URLSearchParams();
    const p = overrides?.page ?? page;
    if (status) params.set("status", status);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", p.toString());
    params.set("limit", "30");

    fetch(`/api/payment-transactions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data.transactions ?? []);
        setPagination(data.pagination ?? { page: 1, limit: 30, total: 0, totalPages: 0 });
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const handleFilter = () => { setPage(1); loadTransactions({ page: 1 }); };

  const resetFilters = () => {
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setDateKey((k) => k + 1);
    loadTransactions({ page: 1 });
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/payment-transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      showSuccess(`Transaction marked as ${newStatus}`);
      loadTransactions();
    } catch {
      showError("Failed to update status");
    }
  };

  const openConvert = (txn: PaymentTransaction) => {
    setConvertTarget(txn);
    setConvertProduct("");
    setConvertLocationType("depot");
    setConvertLocationId("");
    setConvertQty("1");
    setConvertCustomer("");
  };

  const closeConvert = () => {
    setConvertTarget(null);
    setConvertSubmitting(false);
  };

  const doConvert = async () => {
    if (!convertTarget) return;
    setConvertSubmitting(true);
    try {
      const res = await fetch(`/api/payment-transactions/${convertTarget._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: convertProduct,
          quantity: parseInt(convertQty) || 1,
          customerName: convertCustomer,
          locationType: convertLocationType,
          locationId: convertLocationId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Conversion failed");
        return;
      }
      showSuccess("Sale created from POS transaction");
      closeConvert();
      loadTransactions();
    } catch {
      showError("Network error");
    } finally {
      setConvertSubmitting(false);
    }
  };

  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
  const matchedCount = transactions.filter((t) => t.status === "matched").length;
  const unmatchedCount = transactions.filter((t) => t.status === "unmatched").length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/payment-transactions/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to delete"); return; }
      showSuccess("Transaction deleted"); setDeleteTarget(null); loadTransactions();
    } catch { showError("Network error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="POS Transactions" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => setShowManual(true)}>
            Manual Entry
          </Button>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:gap-6 mb-6">
        <Link href="/payment-transactions" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <BoxIconLine className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{pagination.total}</h4>
        </Link>
        <Link href="/payment-transactions" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <BoxIconLine className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Matched</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{matchedCount}</h4>
        </Link>
        <Link href="/payment-transactions" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-3">
            <BoxIconLine className="text-amber-600 size-5 dark:text-amber-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Unmatched</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{unmatchedCount}</h4>
        </Link>
        <Link href="/payment-transactions" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <DollarLineIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">₦{totalAmount.toLocaleString()}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Select options={STATUS_OPTIONS} placeholder="Filter status" value={status} onChange={setStatus} />
          <DatePicker key={`start-${dateKey}`} id="pt-start-date" placeholder="Start Date" defaultDate={startDate || undefined} onChange={(_dates, ds) => setStartDate(ds)} />
          <DatePicker key={`end-${dateKey}`} id="pt-end-date" placeholder="End Date" defaultDate={endDate || undefined} onChange={(_dates, ds) => setEndDate(ds)} />
        </div>
        <div className="flex gap-3">
          <Button variant="primary" size="sm" onClick={handleFilter}>Apply</Button>
          <Button variant="outline" size="sm" onClick={resetFilters}>Reset</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Terminal</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Ref</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Amount</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Method</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Matched Sale</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>No POS transactions synced yet.</TableCell>
              </TableRow>
            ) : (
              transactions.map((txn) => (
                <TableRow key={txn._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="font-mono text-xs">{txn.terminalSerial}</span>
                      {txn.posDeviceId && <span className="block text-xs text-gray-400">{txn.posDeviceId.name}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">{txn.transactionRef.slice(-12)}</TableCell>
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{txn.amount.toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{txn.paymentMethod}</TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                      txn.status === "matched" ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" :
                      txn.status === "unmatched" ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400" :
                      "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {txn.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{new Date(txn.transactionDate).toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {txn.saleId ? (
                      <span>₦{txn.saleId.totalAmount?.toLocaleString()} — {txn.saleId.customerName || "N/A"}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {txn.status === "unmatched" && (
                        <button onClick={() => openConvert(txn)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors">
                          Convert to Sale
                        </button>
                      )}
                      {txn.status === "unmatched" && (
                        <button onClick={() => updateStatus(txn._id, "ignored")} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-500/10 dark:text-gray-400 dark:hover:bg-gray-500/20 transition-colors">
                          Ignore
                        </button>
                      )}
                      {txn.status === "ignored" && (
                        <button onClick={() => updateStatus(txn._id, "unmatched")} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-colors">
                          Restore
                        </button>
                      )}
                      {txn.status === "matched" && txn.saleId && (
                        <span className="text-xs text-gray-400">Linked</span>
                      )}
                      <button onClick={() => setDeleteTarget(txn._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                        <TrashBinIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1}&ndash;{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => { setPage(p); loadTransactions({ page: p }); }} />
          </div>
        )}
      </div>

      {convertTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={closeConvert}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-1">Convert to Sale</h3>
            <p className="text-xs text-gray-400 mb-4">
              ₦{convertTarget.amount.toLocaleString()} from {convertTarget.terminalSerial} — {new Date(convertTarget.transactionDate).toLocaleString()}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product *</label>
                <Select options={products} placeholder="Select product" value={convertProduct} onChange={setConvertProduct} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <Input type="number" placeholder="1" value={convertQty} onChange={(e) => setConvertQty(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
                  <Select options={LOCATION_TYPES} value={convertLocationType} onChange={setConvertLocationType} />
                </div>
              </div>
              {convertLocations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <Select options={convertLocations} placeholder={`Select ${convertLocationType}`} value={convertLocationId} onChange={setConvertLocationId} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                <Input placeholder="e.g. John Doe" value={convertCustomer} onChange={(e) => setConvertCustomer(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-6">
              <Button variant="outline" size="sm" onClick={closeConvert} disabled={convertSubmitting}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={doConvert} disabled={convertSubmitting || !convertProduct || !convertLocationId}>
                {convertSubmitting ? "Converting..." : "Create Sale"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showManual && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowManual(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Manual POS Transaction Entry</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terminal Serial *</label>
                <Input placeholder="e.g. P260XXXXX" value={manualSerial} onChange={(e) => setManualSerial(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₦) *</label>
                  <Input type="number" placeholder="0" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                  <Select options={[
                    { value: "moniepoint", label: "Moniepoint" },
                    { value: "opay", label: "Opay" },
                    { value: "palmpay", label: "Palmpay" },
                    { value: "other", label: "Other" },
                  ]} value={manualProvider} onChange={setManualProvider} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Ref</label>
                  <Input placeholder="Auto-generated if empty" value={manualRef} onChange={(e) => setManualRef(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-6">
              <Button variant="outline" size="sm" onClick={() => setShowManual(false)} disabled={manualSubmitting}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={submitManual} disabled={manualSubmitting || !manualSerial || !manualAmount}>
                {manualSubmitting ? "Submitting..." : "Add Transaction"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this POS transaction? This action cannot be undone."
      />
    </div>
  );
}
