"use client";

import { useEffect, useState, useRef, Fragment } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/tables/Pagination";
import DatePicker from "@/components/form/date-picker";

interface ActivityUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ActivityLog {
  _id: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  user: ActivityUser | null;
  userId?: string;
  productId?: string;
  domainType?: string;
  domainId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ENTITIES = [
  { value: "", label: "All Entities" },
  { value: "factory", label: "Factory" },
  { value: "depot", label: "Depot" },
  { value: "truck", label: "Truck" },
  { value: "product", label: "Product" },
  { value: "production", label: "Production" },
  { value: "sale", label: "Sale" },
  { value: "cost", label: "Cost" },
  { value: "transfer", label: "Transfer" },
  { value: "inventory", label: "Inventory" },
  { value: "user", label: "User" },
  { value: "import", label: "Import" },
];

const ACTIONS = [
  { value: "", label: "All Actions" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
];

const actionBadge = (action: string) => {
  const map: Record<string, "success" | "error" | "warning" | "info"> = {
    created: "success",
    deleted: "error",
    updated: "warning",
  };
  return <Badge variant="light" color={map[action] ?? "info"}>{action}</Badge>;
};

const entityIcon = (entity: string) => {
  const map: Record<string, string> = {
    factory: "🏭",
    depot: "🏬",
    truck: "🚚",
    product: "📦",
    production: "⚙️",
    sale: "💰",
    cost: "📉",
    transfer: "🔄",
    inventory: "📋",
    user: "👤",
    import: "📥",
  };
  return map[entity] ?? "📌";
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
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

  const fetchLogs = (overrides?: { page?: number }) => {
    setLoading(true);
    const params = new URLSearchParams();
    const p = overrides?.page ?? page;
    if (filterEntity) params.set("entity", filterEntity);
    if (filterAction) params.set("action", filterAction);
    if (filterProduct) params.set("productId", filterProduct);
    if (searchText) params.set("search", searchText);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    params.set("page", p.toString());
    params.set("limit", "30");

    fetch(`/api/activity?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs ?? []);
        setPagination(data.pagination ?? { page: 1, limit: 30, total: 0, totalPages: 0 });
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); /* eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */ }, []);

  const handleFilter = () => {
    setPage(1);
    fetchLogs({ page: 1 });
  };

  const resetFilters = () => {
    setFilterEntity("");
    setFilterAction("");
    setFilterProduct("");
    setSearchText("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setDateKey((k) => k + 1);
    fetchLogs({ page: 1 });
  };

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
      const filename = `activity-log-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("PDF failed", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="mb-6">
        <PageBreadcrumb pageTitle="Activity Log" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Select
            options={ENTITIES}
            placeholder="All Entities"
            value={filterEntity}
            onChange={setFilterEntity}
          />
          <Select
            options={ACTIONS}
            placeholder="All Actions"
            value={filterAction}
            onChange={setFilterAction}
          />
          <Select
            options={products}
            placeholder="All Products"
            value={filterProduct}
            onChange={setFilterProduct}
          />
          <div className="relative">
            <Input
              type="text"
              placeholder="Search descriptions..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <DatePicker
            key={`start-${dateKey}`}
            id="activity-start-date"
            placeholder="Start Date"
            defaultDate={startDate || undefined}
            onChange={(_dates, dateStr) => setStartDate(dateStr)}
          />
          <DatePicker
            key={`end-${dateKey}`}
            id="activity-end-date"
            placeholder="End Date"
            defaultDate={endDate || undefined}
            onChange={(_dates, dateStr) => setEndDate(dateStr)}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="primary" size="sm" onClick={handleFilter}>
            Apply Filters
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset
          </Button>
          {logs.length > 0 && (
            <Button variant="outline" size="sm" onClick={downloadPDF} disabled={pdfLoading}>
              {pdfLoading ? "Generating PDF..." : "Download PDF"}
            </Button>
          )}
        </div>
      </div>

      <div ref={reportRef} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Activity Log</h3>
          <p className="text-xs text-gray-400 mt-1">
            {pagination.total} records
            {filterEntity && ` | Entity: ${filterEntity}`}
            {filterAction && ` | Action: ${filterAction}`}
            {startDate && ` | From: ${startDate}`}
            {endDate && ` | To: ${endDate}`}
          </p>
        </div>
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-16">Type</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Action</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Entity</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">User</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>
                  No activity logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <Fragment key={log._id}>
                  <TableRow
                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === log._id ? null : log._id)}
                  >
                    <TableCell className="py-3 text-lg">{entityIcon(log.entity)}</TableCell>
                    <TableCell className="py-3">{actionBadge(log.action)}</TableCell>
                    <TableCell className="py-3">
                      <span className="capitalize text-theme-sm font-medium text-gray-800 dark:text-white/90">{log.entity}</span>
                      <br />
                      <span className="text-xs text-gray-400 font-mono">{log.entityId.slice(-8)}</span>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {log.description}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {log.user ? (
                        <div>
                          <span className="text-gray-800 dark:text-white/90">{log.user.name}</span>
                          <br />
                          <span className="text-xs text-gray-400 capitalize">{log.user.role}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                  {expanded === log._id && (
                    <TableRow key={`${log._id}-detail`}>
                      <TableCell colSpan={6} className="bg-gray-50 dark:bg-gray-800/50 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {log.productId && (
                            <div>
                              <span className="text-xs text-gray-400 block">Product ID</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">{log.productId}</span>
                            </div>
                          )}
                          {log.domainType && (
                            <div>
                              <span className="text-xs text-gray-400 block">Domain</span>
                              <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{log.domainType} ({log.domainId?.slice(-8)})</span>
                            </div>
                          )}
                          {log.userId && (
                            <div>
                              <span className="text-xs text-gray-400 block">User ID</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">{log.userId}</span>
                            </div>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="col-span-2">
                              <span className="text-xs text-gray-400 block">Metadata</span>
                              <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 overflow-auto max-h-24">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
