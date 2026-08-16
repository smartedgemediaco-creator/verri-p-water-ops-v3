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
import { formatDateTime } from "@/lib/dateFormat";
import { downloadTablePdf } from "@/lib/pdf";
import Pagination from "@/components/tables/Pagination";
import DatePicker from "@/components/form/date-picker";
import { WaterDropIcon } from "@/components/icons/EntityIcons";
import SummaryCards from "@/components/ui/SummaryCards";

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
  entityName?: string | null;
  description: string;
  user: ActivityUser | null;
  userId?: string;
  productId?: string;
  productName?: string | null;
  domainType?: string;
  domainId?: string;
  locationName?: string | null;
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
  { value: "stock", label: "Stock" },
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
    stock: "📋",
    user: "👤",
    import: "📥",
  };
  return map[entity] ?? "📌";
};

const actionIcon = (action: string) => {
  const map: Record<string, string> = {
    created: "➕",
    updated: "✏️",
    deleted: "🗑️",
  };
  return map[action] ?? "📌";
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
  const pdfRef = useRef<HTMLDivElement>(null);

  const actionColors: Record<string, { bg: string; color: string }> = {
    created: { bg: "#ecfdf5", color: "#059669" },
    deleted: { bg: "#fef2f2", color: "#dc2626" },
    updated: { bg: "#fffbeb", color: "#d97706" },
  };
  const entityLabel: Record<string, string> = {
    factory: "🏭", depot: "🏬", truck: "🚚", product: "📦",
    production: "⚙️", sale: "💰", cost: "📉", transfer: "🔄",
    stock: "📋", user: "👤", import: "📥",
  };
  const fmtDate = (dateStr: string) => formatDateTime(dateStr);

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

  useEffect(() => { if (page > 1) fetchLogs(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [page]);

  const handleFilter = () => {
    setPage(1);
    fetchLogs();
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
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    const target = pdfRef.current ?? reportRef.current;
    await downloadTablePdf(
      { current: target } as React.RefObject<HTMLElement | null>,
      `activity-log-${new Date().toISOString().slice(0, 10)}`,
      setPdfLoading,
      { title: "Activity Log Report", skipHeaderFooter: true }
    );
  };

  return (
    <div>
      <div className="mb-6">
        <PageBreadcrumb pageTitle="Activity Log" />
      </div>

      <SummaryCards
        cards={[
          { label: "Total Records", value: pagination.total },
          { label: "On This Page", value: logs.length },
          { label: "Entity Filters", value: ENTITIES.filter((e) => e.value).length },
        ]}
      />

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

      <div ref={reportRef} className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
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
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-16">Type</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Action</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Entity</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">User</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                    <TableCell className="py-3 text-lg">{actionIcon(log.action)}</TableCell>
                    <TableCell className="py-3">{actionBadge(log.action)}</TableCell>
                    <TableCell className="py-3">
                      <span className="capitalize text-theme-sm font-medium text-gray-800 dark:text-white/90">{log.entity}</span>
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
                      {fmtDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                  {expanded === log._id && (
                    <TableRow key={`${log._id}-detail`}>
                      <TableCell colSpan={6} className="bg-gray-50 dark:bg-gray-800/50 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {log.entityName && (
                            <div>
                              <span className="text-xs text-gray-400 block">Name</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{log.entityName}</span>
                            </div>
                          )}
                          {log.productName && (
                            <div>
                              <span className="text-xs text-gray-400 block">Product</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{log.productName}</span>
                            </div>
                          )}
                          {log.domainType && (
                            <div>
                              <span className="text-xs text-gray-400 block">Location</span>
                              <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{log.locationName ?? log.domainType}</span>
                            </div>
                          )}
                          {log.userId && (
                            <div>
                              <span className="text-xs text-gray-400 block">Performed by</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{log.user?.name ?? "Unknown User"}</span>
                            </div>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="col-span-2">
                              <span className="text-xs text-gray-400 block">Details</span>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                                {Object.entries(log.metadata).map(([key, val]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="capitalize font-medium">{key.replace(/([A-Z])/g, " $1")}:</span>
                                    <span>{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                                  </div>
                                ))}
                              </div>
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

      <div ref={pdfRef} style={{
        position: "absolute", left: "-9999px", top: 0, width: "1200px",
        fontFamily: "Outfit, sans-serif", backgroundColor: "#ffffff",
      }}>
        <div style={{ height: "6px", background: "linear-gradient(90deg, #465fff 0%, #3641f5 100%)" }} />

        <div style={{ padding: "32px 32px 24px", borderBottom: "1px solid #e4e7ec" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <WaterDropIcon className="w-9 h-9 [&>path]:fill-[#465fff]" />
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#101828", letterSpacing: "-0.02em", margin: 0 }}>Verri P Water Inc</h1>
              <p style={{ fontSize: "14px", margin: "2px 0 0", color: "#667085", textTransform: "uppercase", letterSpacing: "0.02em", fontWeight: 500 }}>Activity Log Report</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 32px", fontSize: "12px", color: "#98a2b3" }}>
            <span><span style={{ color: "#667085", fontWeight: 600 }}>Records:</span> {pagination.total}</span>
            {filterEntity && <span><span style={{ color: "#667085", fontWeight: 600 }}>Entity:</span> {filterEntity}</span>}
            {filterAction && <span><span style={{ color: "#667085", fontWeight: 600 }}>Action:</span> {filterAction}</span>}
            {startDate && <span><span style={{ color: "#667085", fontWeight: 600 }}>From:</span> {startDate}</span>}
            {endDate && <span><span style={{ color: "#667085", fontWeight: 600 }}>To:</span> {endDate}</span>}
          </div>
        </div>

        <div style={{ padding: "24px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <div style={{ width: "4px", height: "20px", backgroundColor: "#465fff", borderRadius: "2px" }} />
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#101828", margin: 0 }}>Activity Entries</h2>
            <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{logs.length} entries</span>
          </div>

          <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1px solid #e4e7ec" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085", width: "48px" }}>Type</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Action</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Entity</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Description</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>User</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Date</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: "#ffffff" }}>
              {logs.map((log) => {
                const ac = actionColors[log.action] ?? { bg: "#f2f4f7", color: "#667085" };
                return (
                  <tr key={log._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                    <td style={{ padding: "12px 16px", fontSize: "18px", textAlign: "center" }}>{actionIcon(log.action)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 500, backgroundColor: ac.bg, color: ac.color }}>{log.action}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500, color: "#344054", fontSize: "13px", textTransform: "capitalize" }}>{log.entity}</div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#667085", fontSize: "13px", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.description}</td>
                    <td style={{ padding: "12px 16px", color: "#667085", fontSize: "13px" }}>
                      {log.user ? (
                        <div>
                          <div style={{ color: "#344054", fontWeight: 500 }}>{log.user.name}</div>
                          <div style={{ fontSize: "11px", color: "#98a2b3", textTransform: "capitalize" }}>{log.user.role}</div>
                        </div>
                      ) : (
                        <span style={{ color: "#98a2b3" }}>System</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#667085", fontSize: "13px", whiteSpace: "nowrap" }}>{fmtDate(log.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ borderTop: "1px solid #e4e7ec", padding: "16px 32px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: "#98a2b3", margin: 0 }}>
            <span style={{ fontWeight: 600, color: "#667085" }}>Verri P Water Inc</span> — Operations Management System
            <br />
            Generated {new Date().toLocaleString("en-NG")}
          </p>
          <div style={{ marginTop: "8px", height: "3px", background: "linear-gradient(90deg, #465fff 0%, #3641f5 100%)", borderRadius: "2px", maxWidth: "240px", marginLeft: "auto", marginRight: "auto" }} />
        </div>
      </div>
    </div>
  );
}
