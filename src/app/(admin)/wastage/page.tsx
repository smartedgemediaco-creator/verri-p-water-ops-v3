"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import Badge from "@/components/ui/badge/Badge";
import { formatDate } from "@/lib/dateFormat";
import { TrashBinIcon, BoxIconLine } from "@/icons";
import DisputeButton from "@/components/disputes/DisputeButton";
import AdminEditButton from "@/components/disputes/AdminEditButton";

interface WastageRecord {
  _id: string;
  productId: { _id: string; name: string } | null;
  locationType: string;
  locationId: string;
  locationName: string | null;
  quantity: number;
  source: string;
  description: string;
  date: string;
}

interface LocationOption {
  _id: string;
  name?: string;
  plateNumber?: string;
}

const LOCATION_TYPES = [
  { value: "all", label: "All Locations" },
  { value: "factory", label: "Factory" },
  { value: "depot", label: "Depot" },
  { value: "truck", label: "Truck" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "production", label: "Production" },
  { value: "transfer", label: "Transfer" },
  { value: "sale", label: "Sale" },
  { value: "storage", label: "Storage" },
  { value: "other", label: "Other" },
];

export default function WastagePage() {
  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

  const [filterLocType, setFilterLocType] = useState("all");
  const [filterLocId, setFilterLocId] = useState("");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setProducts([
          { value: "", label: "All Products" },
          ...data.map((p) => ({ value: p._id, label: p.name })),
        ])
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filterLocType === "all") { setLocations([]); return; }
    const endpoint = filterLocType === "factory" ? "/api/factories" : `/api/${filterLocType}s`;
    let cancelled = false;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: LocationOption[]) => {
        if (!cancelled) { setLocations(data); }
      })
      .catch(() => { if (!cancelled) { setLocations([]); } });
    return () => { cancelled = true; };
  }, [filterLocType]);

  const fetchRecords = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filterLocType !== "all") params.set("locationType", filterLocType);
    if (filterLocId) params.set("locationId", filterLocId);
    if (filterProduct) params.set("productId", filterProduct);
    if (filterSource !== "all") params.set("source", filterSource);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    try {
      const res = await fetch(`/api/wastage?${params}`);
      const data = await res.json();
      setRecords(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterLocType, filterLocId, filterProduct, filterSource, startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const hasFilters = filterLocType !== "all" || filterLocId || filterProduct || filterSource !== "all" || startDate || endDate;
  const totalQty = records.reduce((s, r) => s + (r.quantity ?? 0), 0);

  const bySource = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + r.quantity;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Wastage / Spoilage" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location Type</label>
            <Select options={LOCATION_TYPES} value={filterLocType} onChange={(v) => { setFilterLocType(v); setFilterLocId(""); }} />
          </div>
          {filterLocType !== "all" && (
            <div className="w-56">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location</label>
              <Select
                options={[
                  { value: "", label: `All ${filterLocType}s` },
                  ...locations.map((l) => ({ value: l._id, label: l.name ?? l.plateNumber ?? l._id.slice(-6) })),
                ]}
                value={filterLocId}
                onChange={setFilterLocId}
              />
            </div>
          )}
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
            <Select options={SOURCE_OPTIONS} value={filterSource} onChange={setFilterSource} />
          </div>
          <div className="w-56">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
            <Select options={products} value={filterProduct} onChange={setFilterProduct} />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
            <DatePicker id="waste-start" placeholder="From" onChange={(d) => { if (d[0]) setStartDate(d[0].toISOString().slice(0, 10)); }} />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
            <DatePicker id="waste-end" placeholder="To" onChange={(d) => { if (d[0]) setEndDate(d[0].toISOString().slice(0, 10)); }} />
          </div>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={() => { setFilterLocType("all"); setFilterLocId(""); setFilterProduct(""); setFilterSource("all"); setStartDate(""); setEndDate(""); }}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <TrashBinIcon className="text-red-600 size-4 dark:text-red-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Records</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white/90">{records.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <BoxIconLine className="text-red-600 size-4 dark:text-red-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Units Lost</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white/90">{totalQty.toLocaleString()}</p>
        </div>
      </div>

      {/* Source breakdown */}
      {Object.keys(bySource).length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm mb-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Breakdown by Source</p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(bySource).map(([src, qty]) => (
              <div key={src} className="flex items-center gap-1.5 text-sm">
                <span className={`w-2 h-2 rounded-full ${src === "production" ? "bg-red-400" : src === "transfer" ? "bg-orange-400" : src === "sale" ? "bg-amber-400" : src === "storage" ? "bg-cyan-400" : "bg-gray-400"}`} />
                <span className="text-gray-500 dark:text-gray-400 capitalize">{src}:</span>
                <span className="font-semibold text-gray-800 dark:text-white/90">{qty.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wastage table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Wastage Records</h3>
          <span className="text-xs text-gray-400">{records.length} record{records.length !== 1 ? "s" : ""}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Product</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Qty Lost</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Source</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>No wastage records match your filters.</TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{r.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{r.locationName ?? r.locationId?.slice(-6) ?? "N/A"}</TableCell>
                  <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                      r.locationType === "factory" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                      r.locationType === "depot" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                      "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                    }`}>{r.locationType}</span>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm font-semibold text-red-600 dark:text-red-400">{(r.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="py-3">
                    <Badge variant="light" color={
                      r.source === "production" ? "error" :
                      r.source === "transfer" ? "warning" :
                      r.source === "sale" ? "warning" :
                      r.source === "storage" ? "info" : "dark"
                    }>{r.source}</Badge>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 whitespace-normal break-words max-w-[280px]">{r.description || "—"}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(r.date)}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-1.5 items-center">
                      <AdminEditButton
                        entity="Wastage"
                        entityId={r._id}
                        entityLabel={`${r.productId?.name ?? "wastage"} x${(r.quantity ?? 0).toLocaleString()}`}
                        apiPath={`/api/wastage/${r._id}`}
                        onSaved={fetchRecords}
                        fields={[
                          { key: "productId", label: "Product", type: "select", options: products.filter(p => p.value) },
                          { key: "quantity", label: "Quantity", type: "number" },
                          { key: "source", label: "Source", type: "select", options: [
                            { value: "production", label: "Production" },
                            { value: "transfer", label: "Transfer" },
                            { value: "sale", label: "Sale" },
                            { value: "storage", label: "Storage" },
                            { value: "other", label: "Other" },
                          ]},
                          { key: "description", label: "Description", type: "textarea" },
                          { key: "date", label: "Date", type: "date" },
                        ]}
                        initialValues={{
                          productId: r.productId?._id ?? "",
                          quantity: r.quantity,
                          source: r.source,
                          description: r.description ?? "",
                          date: r.date?.split("T")[0] ?? "",
                        }}
                      />
                      <DisputeButton entity="wastage" entityId={r._id} entityLabel={`${r.productId?.name ?? "wastage"} x${(r.quantity ?? 0).toLocaleString()}`} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
