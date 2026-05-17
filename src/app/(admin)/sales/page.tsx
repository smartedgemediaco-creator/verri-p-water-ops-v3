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
import { PlusIcon, DollarLineIcon, BoxIconLine } from "@/icons";

interface Sale {
  _id: string;
  depotId: { _id: string; name: string } | null;
  productId: { _id: string; name: string } | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName: string;
  date: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

  const [filterProduct, setFilterProduct] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [dateKey, setDateKey] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
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

  const fetchSales = (overrides?: { page?: number }) => {
    setLoading(true);
    const params = new URLSearchParams();
    const p = overrides?.page ?? page;
    if (filterProduct) params.set("productId", filterProduct);
    if (customerSearch) params.set("customerName", customerSearch);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
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
    setPage(1);
    setDateKey((k) => k + 1);
    fetchSales({ page: 1 });
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.height - 20;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.height - 20;
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Filtered Sales</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{pagination.total}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <DollarLineIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Filtered Revenue</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">₦{totalRevenue.toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <BoxIconLine className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Filtered Units Sold</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalQuantity.toLocaleString()}</h4>
        </div>
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

      <div ref={reportRef} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
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
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Depot</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Product</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit Price</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Customer</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>No sales records match your filters. Click &quot;Record Sale&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{sale.depotId?.name ?? "N/A"}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{sale.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{sale.quantity.toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">₦{sale.unitPrice?.toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{sale.totalAmount?.toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{sale.customerName}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{sale.date ? new Date(sale.date).toLocaleDateString() : "N/A"}</TableCell>
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
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => { setPage(p); fetchSales({ page: p }); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
