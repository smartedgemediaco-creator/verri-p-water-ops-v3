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
import AdminEditButton from "@/components/disputes/AdminEditButton";
import { formatDate } from "@/lib/dateFormat";
import { useAuth } from "@/context/AuthContext";

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
  condition?: "ordinary" | "chilled";
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
  const { user } = useAuth();
  const isAdminUser = user?.role === "admin";
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
  const [shareSaleId, setShareSaleId] = useState<string | null>(null);
  const shareSale = sales.find((s) => s._id === shareSaleId) ?? null;
  const [receiptPdfLoading, setReceiptPdfLoading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const confirmCancelSale = sales.find((s) => s._id === confirmCancelId) ?? null;
  const [cancelReason, setCancelReason] = useState("");

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

  const doCancelSale = async () => {
    const id = confirmCancelId;
    if (!id || cancellingId) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showError(err.error || "Failed to cancel sale");
        return;
      }
      showSuccess("Sale cancelled and stock restored");
      setConfirmCancelId(null);
      setCancelReason("");
      fetchSales();
    } catch {
      showError("Network error");
    } finally {
      setCancellingId(null);
    }
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current || !shareSale) return;
    setReceiptPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 0,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, "JPEG", 10, 10, imgW, imgH);
      pdf.save(`receipt-${shareSale.productId?.name ?? "sale"}-${formatDate(shareSale.date).replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error("Receipt PDF failed", err);
      showError("Failed to generate PDF");
    } finally {
      setReceiptPdfLoading(false);
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
                    <Link href={`/${sale.locationType === "factory" ? "factories" : sale.locationType === "depot" ? "depots" : "trucks"}/${sale.locationId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{sale.location?.name ?? sale.locationType}</Link>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                    <div className="flex items-center gap-1.5">
                      {sale.productId?._id ? <Link href={`/products/${sale.productId._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{sale.productId.name}</Link> : "N/A"}
                      {sale.condition === "chilled" && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
                          Chilled
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(sale.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{sale.totalAmount?.toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{sale.customerName}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(sale.date)}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-1.5 items-center">
                      {isAdminUser && (
                        <button
                          onClick={() => { setConfirmCancelId(sale._id); setCancelReason(""); }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                          title="Cancel Sale"
                        >
                          Cancel
                        </button>
                      )}
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
                      <button
                        onClick={() => setShareSaleId(sale._id)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors"
                        title="Share Receipt"
                      >
                        Share Receipt
                      </button>
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

      <ConfirmDialog
        isOpen={confirmCancelId !== null}
        onClose={() => { setConfirmCancelId(null); setCancelReason(""); }}
        onConfirm={doCancelSale}
        title="Cancel Sale"
        message={
          <>
            <p>You are about to <strong>cancel</strong> this sale and restore the stock:</p>
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Product:</strong> {confirmCancelSale?.productId?.name ?? "N/A"}</li>
              <li><strong>Quantity:</strong> {(confirmCancelSale?.quantity ?? 0).toLocaleString()} units</li>
              <li><strong>Amount:</strong> ₦{confirmCancelSale?.totalAmount?.toLocaleString() ?? "0"}</li>
              <li><strong>Customer:</strong> {confirmCancelSale?.customerName || "Walk-in"}</li>
              <li><strong>Date:</strong> {confirmCancelSale ? formatDate(confirmCancelSale.date) : "—"}</li>
            </ul>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Mistaken entry, duplicate record..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <p className="mt-2 text-red-600 dark:text-red-400 font-medium">⚠ This will restore the stock at {confirmCancelSale?.locationType} and cannot be undone.</p>
          </>
        }
        confirmLabel="Cancel Sale"
        variant="danger"
        loading={cancellingId !== null}
        successMessage="Sale cancelled and stock restored!"
      />

      {shareSale && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShareSaleId(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-center shrink-0">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white">Share Receipt</h3>
              <p className="text-sm text-white/70 mt-0.5">Send to your customer</p>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
              <div ref={receiptRef} className="bg-white rounded-xl p-5 mb-5 border border-gray-200 shadow-sm" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                <div className="text-center mb-4 pb-3" style={{ borderBottom: "2px solid #465FFF" }}>
                  <div className="text-lg font-extrabold tracking-tight" style={{ color: "#465FFF" }}>VERRI P WATER INC</div>
                  <div className="text-xs mt-0.5" style={{ color: "#6b7280" }}>100% Pure & Safe Drinking Water</div>
                  <div className="text-xs" style={{ color: "#6b7280" }}>Nigeria</div>
                </div>
                <div className="text-center mb-3">
                  <span className="text-xs font-bold px-3 py-1 rounded" style={{ color: "#374151", background: "#f3f4f6" }}>SALES RECEIPT</span>
                </div>
                <div className="text-center text-xs mb-3" style={{ color: "#6b7280" }}>{formatDate(shareSale.date, "long")}</div>
                <div className="border-t border-dashed my-2" style={{ borderColor: "#e5e7eb" }} />
                <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td className="py-1" style={{ color: "#6b7280" }}>Product</td><td className="py-1 text-right font-semibold">{shareSale.productId?.name ?? "N/A"}</td></tr>
                    <tr><td className="py-1" style={{ color: "#6b7280" }}>Quantity</td><td className="py-1 text-right font-semibold">{(shareSale.quantity ?? 0).toLocaleString()}</td></tr>
                    <tr><td className="py-1" style={{ color: "#6b7280" }}>Unit Price</td><td className="py-1 text-right font-semibold">₦{(shareSale.unitPrice ?? 0).toLocaleString()}</td></tr>
                  </tbody>
                </table>
                <div className="my-2" style={{ borderTop: "2px solid #465FFF" }} />
                <div className="flex justify-between text-sm font-extrabold" style={{ color: "#465FFF" }}>
                  <span>TOTAL</span>
                  <span>₦{(shareSale.totalAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-dashed my-2" style={{ borderColor: "#e5e7eb" }} />
                <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td className="py-0.5" style={{ color: "#6b7280" }}>Payment</td><td className="py-0.5 text-right font-semibold capitalize">{shareSale.paymentMethod}</td></tr>
                    <tr><td className="py-0.5" style={{ color: "#6b7280" }}>Customer</td><td className="py-0.5 text-right font-semibold">{shareSale.customerName || "Walk-in"}</td></tr>
                    <tr><td className="py-0.5" style={{ color: "#6b7280" }}>Location</td><td className="py-0.5 text-right font-semibold">{shareSale.location?.name ?? shareSale.locationType}</td></tr>
                  </tbody>
                </table>
                <div className="border-t border-dashed mt-3 pt-2 text-center text-xs" style={{ borderColor: "#e5e7eb", color: "#9ca3af" }}>
                  Thank you for your purchase!<br/>Verri P Water Inc &mdash; Nigeria
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={downloadReceipt}
                  disabled={receiptPdfLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  {receiptPdfLoading ? "Generating PDF..." : "Download PDF Receipt"}
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `*Verri P Water Inc - Sales Receipt*\n\n` +
                      `Date: ${formatDate(shareSale.date)}\n` +
                      `Product: ${shareSale.productId?.name ?? "N/A"}\n` +
                      `Quantity: ${(shareSale.quantity ?? 0).toLocaleString()}\n` +
                      `Unit Price: ₦${(shareSale.unitPrice ?? 0).toLocaleString()}\n` +
                      `Total: ₦${(shareSale.totalAmount ?? 0).toLocaleString()}\n` +
                      `Payment: ${shareSale.paymentMethod}\n` +
                      `Customer: ${shareSale.customerName || "Walk-in"}\n` +
                      `Location: ${shareSale.location?.name ?? shareSale.locationType}\n\n` +
                      `Thank you for your purchase!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold text-sm transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      `Sales Receipt - Verri P Water Inc (${formatDate(shareSale.date)})`
                    )}&body=${encodeURIComponent(
                      `Verri P Water Inc - Sales Receipt\n` +
                      `================================\n\n` +
                      `Date: ${formatDate(shareSale.date)}\n` +
                      `Product: ${shareSale.productId?.name ?? "N/A"}\n` +
                      `Quantity: ${(shareSale.quantity ?? 0).toLocaleString()}\n` +
                      `Unit Price: ₦${(shareSale.unitPrice ?? 0).toLocaleString()}\n` +
                      `Total: ₦${(shareSale.totalAmount ?? 0).toLocaleString()}\n` +
                      `Payment: ${shareSale.paymentMethod}\n` +
                      `Customer: ${shareSale.customerName || "Walk-in"}\n` +
                      `Location: ${shareSale.location?.name ?? shareSale.locationType}\n\n` +
                      `Thank you for your purchase!`
                    )}`}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Email
                  </a>
                </div>
              </div>

              <button
                onClick={() => setShareSaleId(null)}
                className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
