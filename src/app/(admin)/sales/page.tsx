"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/tables/Pagination";
import DatePicker from "@/components/form/date-picker";
import AutoAmount from "@/components/ui/AutoAmount";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PlusIcon, DollarLineIcon, BoxIconLine, ListIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import DisputeButton from "@/components/disputes/DisputeButton";
import AdminEditButton from "@/components/disputes/AdminEditButton";
import { formatDate } from "@/lib/dateFormat";

interface Sale {
  _id: string;
  locationType: string;
  locationId: string;
  location: { _id: string; name: string } | null;
  productId: { _id: string; name: string } | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName: string;
  date: string;
  paymentMethod: "cash" | "pos" | "transfer" | "credit";
  posDeviceId?: { _id: string; name: string; terminalSerial: string } | null;
  isPaid: boolean;
  paidAmount?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaymentStats {
  byMethod: Record<string, { totalAmount: number; totalQuantity: number; count: number }>;
  grandTotal: number;
  creditOutstanding: number;
  totalSales: number;
}

const PAYMENT_METHODS = [
  { value: "", label: "All Methods" },
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "transfer", label: "Transfer" },
  { value: "credit", label: "Credit" },
];

const CREDIT_STATUSES = [
  { value: "", label: "All Sales" },
  { value: "unpaid", label: "Unpaid Credit" },
  { value: "paid", label: "Paid Credit" },
];

const PAYMENT_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  cash: { bg: "bg-success-50 dark:bg-success-500/10", text: "text-success-700 dark:text-success-400", label: "Cash" },
  pos: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", label: "POS" },
  transfer: { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", label: "Transfer" },
  credit: { bg: "bg-warning-50 dark:bg-warning-500/10", text: "text-warning-700 dark:text-warning-400", label: "Credit" },
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);

  const [filterProduct, setFilterProduct] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [creditStatus, setCreditStatus] = useState("");
  const [page, setPage] = useState(1);
  const [dateKey, setDateKey] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [confirmSettleId, setConfirmSettleId] = useState<string | null>(null);
  const confirmSettleSale = sales.find((s) => s._id === confirmSettleId) ?? null;
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) => {
        if (Array.isArray(data)) {
          setProducts([
            { value: "", label: "All Products" },
            ...data.map((p) => ({ value: p._id, label: p.name })),
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const fetchStats = (params: URLSearchParams) => {
    const statsParams = new URLSearchParams();
    if (params.get("startDate")) statsParams.set("startDate", params.get("startDate")!);
    if (params.get("endDate")) statsParams.set("endDate", params.get("endDate")!);
    if (params.get("productId")) statsParams.set("productId", params.get("productId")!);

    fetch(`/api/sales/stats?${statsParams}`)
      .then((r) => r.json())
      .then(setPaymentStats)
      .catch(() => setPaymentStats(null));
  };

  const fetchSales = (overrides?: { page?: number }) => {
    setLoading(true);
    const params = new URLSearchParams();
    const p = overrides?.page ?? page;
    if (filterProduct) params.set("productId", filterProduct);
    if (customerSearch) params.set("customerName", customerSearch);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (creditStatus) params.set("creditStatus", creditStatus);
    params.set("page", p.toString());
    params.set("limit", "30");

    fetch(`/api/sales?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setSales(data.sales ?? []);
        setPagination(data.pagination ?? { page: 1, limit: 30, total: 0, totalPages: 0 });
      })
      .catch(() => setSales([]))
      .finally(() => setLoading(false));

    fetchStats(params);
  };

  useEffect(() => { fetchSales(); /* eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */ }, []);

  const handleFilter = () => {
    setPage(1);
    fetchSales({ page: 1 });
  };

  const resetFilters = () => {
    setFilterProduct("");
    setCustomerSearch("");
    setStartDate("");
    setEndDate("");
    setPaymentMethod("");
    setCreditStatus("");
    setPage(1);
    setDateKey((k) => k + 1);
    fetchSales({ page: 1 });
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  const doSettle = async () => {
    const id = confirmSettleId;
    if (!id || settling) return;
    setSettling(id);
    try {
      const res = await fetch(`/api/sales/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPaid: true }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showError(err.error || "Failed to settle");
        return;
      }
      showSuccess("Credit sale settled");
      fetchSales();
    } catch {
      showError("Network error");
    } finally {
      setSettling(null);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc: Document) => {
          for (let si = 0; si < clonedDoc.styleSheets.length; si++) {
            const sheet = clonedDoc.styleSheets[si];
            try {
              const removeOklabRules = (rules: CSSRuleList, parent: CSSGroupingRule | CSSStyleSheet) => {
                for (let i = rules.length - 1; i >= 0; i--) {
                  const rule = rules[i];
                  if (rule instanceof CSSGroupingRule && rule.cssRules.length) {
                    removeOklabRules(rule.cssRules, rule);
                  }
                  if (rule.cssText?.includes("color-mix(in oklab")) {
                    parent.deleteRule(i);
                  }
                }
              };
              removeOklabRules(sheet.cssRules, sheet);
            } catch {
              /* cross-origin sheet */
            }
          }
        },
      });
      const _imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const _imgWidth = pageWidth;
      const _imgHeight = (canvas.height * _imgWidth) / canvas.width;

      const pxPerMm = canvas.width / pageWidth;
      const pageCanvasPx = Math.floor(pageHeight * pxPerMm);

      let srcY = 0;
      let pageNum = 0;
      while (srcY < canvas.height) {
        const sliceH = Math.min(pageCanvasPx, canvas.height - srcY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceH;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (pageNum > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, _imgWidth, (sliceH * _imgWidth) / canvas.width);
        srcY += sliceH;
        pageNum++;
      }
      pdf.save(`sales-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF failed", err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Sales" />
        <Link href="/sales/new">
          <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
            Record Sale
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 md:gap-6 mb-6">
        <Link href="/sales" className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Income</p>
          <AutoAmount value={`₦${(paymentStats?.grandTotal ?? totalRevenue).toLocaleString()}`} className="text-gray-800 dark:text-white/90" />
          <p className="text-xs text-gray-400 mt-0.5">{pagination.total} sales</p>
        </Link>
        <Link href="/sales" className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <DollarLineIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cash</p>
          <AutoAmount value={`₦${(paymentStats?.byMethod?.cash?.totalAmount ?? 0).toLocaleString()}`} className="text-gray-800 dark:text-white/90" />
          <p className="text-xs text-gray-400 mt-0.5">{paymentStats?.byMethod?.cash?.count ?? 0} transactions</p>
        </Link>
        <Link href="/pos-devices" className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <BoxIconLine className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">POS</p>
          <AutoAmount value={`₦${(paymentStats?.byMethod?.pos?.totalAmount ?? 0).toLocaleString()}`} className="text-gray-800 dark:text-white/90" />
          <p className="text-xs text-gray-400 mt-0.5">{paymentStats?.byMethod?.pos?.count ?? 0} transactions</p>
        </Link>
        <Link href="/sales" className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <BoxIconLine className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Transfer</p>
          <AutoAmount value={`₦${(paymentStats?.byMethod?.transfer?.totalAmount ?? 0).toLocaleString()}`} className="text-gray-800 dark:text-white/90" />
          <p className="text-xs text-gray-400 mt-0.5">{paymentStats?.byMethod?.transfer?.count ?? 0} transactions</p>
        </Link>
        <Link href="/sales" className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-3">
            <ListIcon className="text-orange-600 size-5 dark:text-orange-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Credit Sales</p>
          <AutoAmount value={`₦${(paymentStats?.byMethod?.credit?.totalAmount ?? 0).toLocaleString()}`} className="text-gray-800 dark:text-white/90" />
          <p className="text-xs text-gray-400 mt-0.5">{paymentStats?.byMethod?.credit?.count ?? 0} transactions</p>
        </Link>
        <Link href="/customers" className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-5 hover:shadow-theme-md transition-shadow border-l-4 border-warning-500">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <ListIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Credit Outstanding</p>
          <AutoAmount value={`₦${(paymentStats?.creditOutstanding ?? 0).toLocaleString()}`} className="text-red-600 dark:text-red-400" />
          <p className="text-xs text-red-400 mt-0.5">Unpaid deficit</p>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Select
            options={products}
            placeholder="All Products"
            value={filterProduct}
            onChange={setFilterProduct}
          />
          <Input
            type="text"
            placeholder="Customer name..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />
          <DatePicker
            key={`start-${dateKey}`}
            id="sales-start-date"
            placeholder="Start Date"
            defaultDate={startDate || undefined}
            onChange={(_dates, dateStr) => setStartDate(dateStr)}
          />
          <DatePicker
            key={`end-${dateKey}`}
            id="sales-end-date"
            placeholder="End Date"
            defaultDate={endDate || undefined}
            onChange={(_dates, dateStr) => setEndDate(dateStr)}
          />
          <Select options={PAYMENT_METHODS} placeholder="All Methods" value={paymentMethod} onChange={setPaymentMethod} />
          <Select options={CREDIT_STATUSES} placeholder="Credit Status" value={creditStatus} onChange={setCreditStatus} />
        </div>
        <div className="flex gap-3">
          <Button variant="primary" size="sm" onClick={handleFilter}>Apply Filters</Button>
          <Button variant="outline" size="sm" onClick={resetFilters}>Reset</Button>
          {sales.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadPDF} disabled={pdfLoading}>
              {pdfLoading ? "Generating PDF..." : "Download PDF"}
            </Button>
          )}
        </div>
      </div>

      <div ref={reportRef} className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Sales Report</h3>
          <p className="text-xs text-gray-400 mt-1">
            {pagination.total} records | ₦{totalRevenue.toLocaleString()} total revenue
            {filterProduct && ` | Product filtered`}
            {customerSearch && ` | Customer: ${customerSearch}`}
            {startDate && ` | From: ${startDate}`}
            {endDate && ` | To: ${endDate}`}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Payment</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Product</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Qty</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Customer</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>No sales records match your filters. Click &quot;Record Sale&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const badge = PAYMENT_BADGES[sale.paymentMethod] ?? PAYMENT_BADGES.cash;
                return (
                <TableRow key={sale._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      {sale.paymentMethod === "credit" && !sale.isPaid && (
                        <span className="text-xs text-red-500 font-medium">Unpaid</span>
                      )}
                      {sale.paymentMethod === "credit" && sale.isPaid && (
                        <span className="text-xs text-green-500 font-medium">Paid</span>
                      )}
                      {sale.paymentMethod === "pos" && sale.posDeviceId && (
                        <span className="text-xs text-gray-400 truncate max-w-[100px]">{sale.posDeviceId.name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">
                    <Link href={`/${sale.locationType === "factory" ? "factories" : sale.locationType === "depot" ? "depots" : "trucks"}/${sale.locationId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{sale.location?.name ?? `${sale.locationType} (${sale.locationId?.slice(-6) ?? "N/A"})`}</Link>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{sale.productId?._id ? <Link href={`/products/${sale.productId._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{sale.productId.name}</Link> : "N/A"}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(sale.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{sale.totalAmount?.toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{sale.customerName}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(sale.date)}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-1.5 items-center">
                      {sale.paymentMethod === "credit" && !sale.isPaid && (
                        <button
                          onClick={() => setConfirmSettleId(sale._id)}
                          disabled={settling === sale._id}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-500/10 dark:text-success-400 dark:hover:bg-success-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {settling === sale._id ? "Settling..." : "Settle"}
                        </button>
                      )}
                      <AdminEditButton
                        entity="Sale"
                        entityId={sale._id}
                        entityLabel={`${sale.productId?.name ?? "Sale"} — ₦${sale.totalAmount?.toLocaleString()}`}
                        apiPath={`/api/sales/${sale._id}`}
                        onSaved={() => fetchSales()}
                        fields={[
                          { key: "productId", label: "Product", type: "select", options: products.filter(p => p.value) },
                          { key: "quantity", label: "Quantity", type: "number" },
                          { key: "totalAmount", label: "Amount (₦)", type: "number" },
                          { key: "unitPrice", label: "Unit Price (₦)", type: "number" },
                          { key: "customerName", label: "Customer", type: "text" },
                          { key: "date", label: "Date", type: "date" },
                          { key: "paymentMethod", label: "Payment", type: "select", options: [
                            { value: "cash", label: "Cash" },
                            { value: "pos", label: "POS" },
                            { value: "transfer", label: "Transfer" },
                            { value: "credit", label: "Credit" },
                          ]},
                        ]}
                        initialValues={{
                          productId: sale.productId?._id ?? "",
                          quantity: sale.quantity,
                          totalAmount: sale.totalAmount,
                          unitPrice: sale.unitPrice,
                          customerName: sale.customerName,
                          date: sale.date?.split("T")[0] ?? "",
                          paymentMethod: sale.paymentMethod,
                        }}
                      />
                      <DisputeButton entity="sale" entityId={sale._id} entityLabel={`${sale.productId?.name ?? "sale"} — ₦${sale.totalAmount?.toLocaleString()}`} />
                    </div>
                  </TableCell>
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1}&ndash;{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => { setPage(p); fetchSales({ page: p }); }}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmSettleId !== null}
        onClose={() => setConfirmSettleId(null)}
        onConfirm={doSettle}
        title="Settle Credit Sale"
        message={
          <>
            <p>You are about to mark an unpaid credit sale as <strong>paid</strong>:</p>
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Customer:</strong> {confirmSettleSale?.customerName || "unknown"}</li>
              <li><strong>Amount:</strong> ₦{confirmSettleSale?.totalAmount?.toLocaleString() ?? "0"}</li>
              <li><strong>Date:</strong> {confirmSettleSale ? formatDate(confirmSettleSale.date) : "—"}</li>
            </ul>
            <p className="mt-2 text-orange-600 dark:text-orange-400 font-medium">⚠ This will mark the debt as fully paid.</p>
          </>
        }
        confirmLabel="Confirm Settlement"
        variant="password"
        loading={settling !== null}
        successMessage="Credit sale settled successfully!"
      />
    </div>
  );
}
