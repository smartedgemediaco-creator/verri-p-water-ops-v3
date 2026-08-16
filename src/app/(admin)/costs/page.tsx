"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { PlusIcon, ListIcon, DollarLineIcon, ChevronDownIcon, ArrowRightIcon, CloseIcon, TrashBinIcon } from "@/icons";
import { formatDate } from "@/lib/dateFormat";
import AdminEditButton from "@/components/disputes/AdminEditButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { showSuccess, showError } from "@/lib/toast";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface Cost {
  _id: string;
  category: string;
  amount: number;
  description: string;
  locationType: string;
  locationId: string;
  locationName?: string;
  staffId?: string;
  staffName?: string;
  date: string;
}

interface Option {
  value: string;
  label: string;
}

const CATEGORIES = [
  { value: "production", label: "Production" },
  { value: "transport", label: "Transport" },
  { value: "maintenance", label: "Maintenance" },
  { value: "salary", label: "Salary" },
  { value: "utility", label: "Utility" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  production: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  transport: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  maintenance: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  salary: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  utility: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

const CATEGORY_BG: Record<string, string> = {
  production: "bg-blue-500",
  transport: "bg-orange-500",
  maintenance: "bg-purple-500",
  salary: "bg-green-500",
  utility: "bg-yellow-500",
  other: "bg-gray-500",
};

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [factories, setFactories] = useState<Option[]>([]);
  const [depots, setDepots] = useState<Option[]>([]);
  const [trucks, setTrucks] = useState<Option[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locTypeFilter, setLocTypeFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [locIdFilter, setLocIdFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const { ref, loading: pdfLoading, download } = usePdfDownload("costs-list", { title: "Costs Report" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (categoryFilter) params.set("category", categoryFilter);
      if (locTypeFilter) params.set("locationType", locTypeFilter);
      if (locIdFilter) params.set("locationId", locIdFilter);
      if (searchText) params.set("search", searchText);
      try {
        const res = await fetch(`/api/costs?${params}`);
        const data = await res.json();
        if (!cancelled) setCosts(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [startDate, endDate, categoryFilter, locTypeFilter, locIdFilter, searchText, refreshKey]);

  useEffect(() => {
    Promise.all([
      fetch("/api/factories").then(r => { if (!r.ok) throw new Error(`factories ${r.status}`); return r.json(); }),
      fetch("/api/depots").then(r => { if (!r.ok) throw new Error(`depots ${r.status}`); return r.json(); }),
      fetch("/api/trucks").then(r => { if (!r.ok) throw new Error(`trucks ${r.status}`); return r.json(); }),
    ]).then(([f, d, t]) => {
      if (Array.isArray(f)) setFactories(f.map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      if (Array.isArray(d)) setDepots(d.map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      if (Array.isArray(t)) setTrucks(t.map((x: { _id: string; plateNumber: string }) => ({ value: x._id, label: x.plateNumber })));
    }).catch((e) => console.error("Failed to load location data:", e));
  }, []);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setCategoryFilter("");
    setLocTypeFilter("");
    setLocIdFilter("");
    setSearchText("");
  };

  const hasFilters = startDate || endDate || categoryFilter || locTypeFilter || locIdFilter || searchText;

  const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
  const categoryTotals = costs.reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + c.amount;
    return acc;
  }, {});
  const categoryList = Object.keys(categoryTotals);
  const maxCategoryTotal = Math.max(...Object.values(categoryTotals), 1);

  const locOptions = locTypeFilter === "factory" ? factories : locTypeFilter === "depot" ? depots : locTypeFilter === "truck" ? trucks : [];

  const toggleRow = (id: string) => setExpanded(expanded === id ? null : id);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/costs/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to delete"); return; }
      showSuccess("Cost deleted"); setDeleteTarget(null); setRefreshKey((k) => k + 1);
    } catch { showError("Network error"); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <PageBreadcrumb pageTitle="Costs" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Link href="/costs/new">
            <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
              Record Cost
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:gap-6 mb-6">
        <Link href="/costs" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <ListIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{costs.length}</h4>
        </Link>
        <Link href="/costs" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-3">
            <DollarLineIcon className="text-orange-600 size-5 dark:text-orange-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenditure</p>
          <AutoAmount value={`₦${totalCost.toLocaleString()}`} className="font-bold text-blue-600 text-title-sm dark:text-blue-400" />
        </Link>
        <Link href="/costs" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <ListIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{categoryList.length}</h4>
        </Link>
        <Link href="/costs" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <DollarLineIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg per Record</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">
            ₦{costs.length ? Math.round(totalCost / costs.length).toLocaleString() : "0"}
          </h4>
        </Link>
      </div>

      {/* Category Breakdown */}
      {categoryList.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Category Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.filter((c) => categoryTotals[c.value]).map((cat) => {
              const pct = Math.round((categoryTotals[cat.value] / totalCost) * 100);
              return (
                <div key={cat.value} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{cat.label}</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-white/90">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${CATEGORY_BG[cat.value] ?? "bg-gray-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-gray-800 dark:text-white/90">₦{categoryTotals[cat.value].toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
            <InputField type="date" id="filter-start" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
            <InputField type="date" id="filter-end" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <Select
              options={[{ value: "", label: "All" }, ...CATEGORIES]}
              placeholder="All"
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location Type</label>
            <Select
              options={[
                { value: "", label: "All" },
                { value: "factory", label: "Factory" },
                { value: "depot", label: "Depot" },
                { value: "truck", label: "Truck" },
              ]}
              placeholder="All"
              value={locTypeFilter}
              onChange={(val) => { setLocTypeFilter(val); setLocIdFilter(""); }}
            />
          </div>
          {locTypeFilter && (
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location</label>
              <Select options={locOptions} placeholder={`Select ${locTypeFilter}`} value={locIdFilter} onChange={setLocIdFilter} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <InputField
              type="text"
              id="filter-search"
              placeholder="Search description..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-44"
            />
          </div>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} startIcon={<CloseIcon />}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-8"><span /></TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Amount</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Staff</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : costs.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>
                  {hasFilters ? "No cost records match your filters." : 'No cost records found. Click "Record Cost" to create one.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {costs.map((cost) => {
                  const isExpanded = expanded === cost._id;
                  const badge = CATEGORY_COLORS[cost.category] ?? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400";
                  return (
                    <Fragment key={cost._id}>
                      <TableRow className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggleRow(cost._id)}>
                        <TableCell className="py-3 text-gray-400">
                          {isExpanded ? <ChevronDownIcon className="size-4" /> : <ArrowRightIcon className="size-4" />}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${badge}`}>
                            {cost.category}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">₦{cost.amount?.toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{cost.description}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          <Link href={`/${cost.locationType === "factory" ? "factories" : cost.locationType === "depot" ? "depots" : "trucks"}/${cost.locationId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">
                            {cost.locationName ?? cost.locationType}
                          </Link>
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          {cost.category === "salary" ? (cost.staffName ?? "—") : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(cost.date)}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1.5 items-center" onClick={(e) => e.stopPropagation()}>
                            <AdminEditButton
                              entity="Cost"
                              entityId={cost._id}
                              entityLabel={`${cost.category} — ₦${cost.amount?.toLocaleString()}`}
                              apiPath={`/api/costs/${cost._id}`}
                              onSaved={() => setRefreshKey((k) => k + 1)}
                              fields={[
                                { key: "category", label: "Category", type: "select", options: CATEGORIES },
                                { key: "amount", label: "Amount (₦)", type: "number" },
                                { key: "description", label: "Description", type: "textarea" },
                                { key: "date", label: "Date", type: "date" },
                              ]}
                              initialValues={{
                                category: cost.category,
                                amount: cost.amount,
                                description: cost.description ?? "",
                                date: cost.date?.split("T")[0] ?? "",
                              }}
                            />
                            <button onClick={() => setDeleteTarget(cost._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                              <TrashBinIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${cost._id}-detail`}>
                          <TableCell colSpan={8} className="p-0 border-0">
                            <div className="px-6 py-5 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Transaction Details</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-400 text-xs uppercase tracking-wide">Reference</p>
                                  <p className="text-gray-800 dark:text-white/90 font-mono text-xs mt-0.5">{cost._id}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs uppercase tracking-wide">Category</p>
                                  <p className="text-gray-800 dark:text-white/90 capitalize mt-0.5">{cost.category}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs uppercase tracking-wide">Amount</p>
                                  <p className="text-gray-800 dark:text-white/90 font-semibold mt-0.5">₦{cost.amount?.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs uppercase tracking-wide">Location</p>
                                  <p className="text-gray-800 dark:text-white/90 capitalize mt-0.5">{cost.locationName ?? cost.locationType} ({cost.locationType})</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs uppercase tracking-wide">Date</p>
                                  <p className="text-gray-800 dark:text-white/90 mt-0.5">{cost.date ? new Date(cost.date).toLocaleString() : "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs uppercase tracking-wide">Description</p>
                                  <p className="text-gray-800 dark:text-white/90 mt-0.5">{cost.description || "—"}</p>
                                </div>
                                {cost.category === "salary" && (
                                  <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wide">Staff</p>
                                    <p className="text-gray-800 dark:text-white/90 mt-0.5">{cost.staffName ?? "—"}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Cost"
        message="Are you sure you want to delete this cost record? This action cannot be undone."
      />
    </div>
  );
}