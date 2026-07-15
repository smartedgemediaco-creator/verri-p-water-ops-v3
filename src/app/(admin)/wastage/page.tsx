"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import Badge from "@/components/ui/badge/Badge";
import { formatDate } from "@/lib/dateFormat";
import { TrashBinIcon, BoxIconLine, PlusIcon } from "@/icons";
import DisputeButton from "@/components/disputes/DisputeButton";
import AdminEditButton from "@/components/disputes/AdminEditButton";
import InputField from "@/components/form/input/InputField";
import { showSuccess, showError } from "@/lib/toast";

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

  // record spoilage modal
  const [showSpoilageForm, setShowSpoilageForm] = useState(false);
  const [spoilageProduct, setSpoilageProduct] = useState("");
  const [spoilageQty, setSpoilageQty] = useState("");
  const [spoilageLocType, setSpoilageLocType] = useState("");
  const [spoilageLocId, setSpoilageLocId] = useState("");
  const [spoilageSource, setSpoilageSource] = useState("");
  const [spoilageDesc, setSpoilageDesc] = useState("");
  const [spoilageDate, setSpoilageDate] = useState("");
  const [spoilageDeductStock, setSpoilageDeductStock] = useState(false);
  const [spoilageRecordAsSale, setSpoilageRecordAsSale] = useState(false);
  const [spoilageSalePriceMode, setSpoilageSalePriceMode] = useState<"unit" | "bulk">("unit");
  const [spoilageSalePrice, setSpoilageSalePrice] = useState("");
  const [spoilageCustomerName, setSpoilageCustomerName] = useState("");
  const [spoilageLocations, setSpoilageLocations] = useState<LocationOption[]>([]);
  const [spoilageSubmitting, setSpoilageSubmitting] = useState(false);

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

  useEffect(() => {
    if (!spoilageLocType) { setSpoilageLocations([]); return; }
    fetch(spoilageLocType === "factory" ? "/api/factories" : `/api/${spoilageLocType}s`)
      .then((r) => r.json())
      .then((data: LocationOption[]) => setSpoilageLocations(data))
      .catch(() => setSpoilageLocations([]));
  }, [spoilageLocType]);

  const handleRecordSpoilage = async () => {
    if (!spoilageProduct || !spoilageQty || !spoilageLocType || !spoilageLocId || !spoilageSource) {
      showError("Fill in all required fields"); return;
    }
    setSpoilageSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        productId: spoilageProduct,
        quantity: Number(spoilageQty),
        locationType: spoilageLocType,
        locationId: spoilageLocId,
        source: spoilageSource,
        description: spoilageDesc || "",
      };
      if (spoilageDate) body.date = spoilageDate;
      body.deductFromStock = spoilageDeductStock;
      body.recordAsSale = spoilageRecordAsSale;
      if (spoilageRecordAsSale) {
        const price = Number(spoilageSalePrice) || 0;
        const qty = Number(spoilageQty) || 0;
        body.saleUnitPrice = spoilageSalePriceMode === "bulk" ? (qty > 0 ? price / qty : 0) : price;
        body.saleBulkPrice = spoilageSalePriceMode === "bulk" ? price : 0;
        body.salePriceMode = spoilageSalePriceMode;
        body.customerName = spoilageCustomerName || "";
      }
      const res = await fetch("/api/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      showSuccess("Leakage recorded");
      setShowSpoilageForm(false);
      setSpoilageProduct(""); setSpoilageQty(""); setSpoilageLocType(""); setSpoilageLocId(""); setSpoilageSource(""); setSpoilageDesc(""); setSpoilageDate(""); setSpoilageDeductStock(false); setSpoilageRecordAsSale(false); setSpoilageSalePriceMode("unit"); setSpoilageSalePrice(""); setSpoilageCustomerName("");
      fetchRecords();
    } catch (e: unknown) { showError(e instanceof Error ? e.message : "Network error"); }
    finally { setSpoilageSubmitting(false); }
  };

  const spoilageLocationOpts = spoilageLocations.map((l) => ({ value: l._id, label: l.name ?? l.plateNumber ?? "Unknown" }));

  const hasFilters = filterLocType !== "all" || filterLocId || filterProduct || filterSource !== "all" || startDate || endDate;
  const totalQty = records.reduce((s, r) => s + (r.quantity ?? 0), 0);

  const bySource = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + r.quantity;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Leakages" />
        <Button size="sm" startIcon={<PlusIcon />} onClick={() => setShowSpoilageForm(true)}>
          Record Leakage
        </Button>
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
                  ...locations.map((l) => ({ value: l._id, label: l.name ?? l.plateNumber ?? "Unknown" })),
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
        <Link href="/wastage" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <TrashBinIcon className="text-red-600 size-4 dark:text-red-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Records</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white/90">{records.length}</p>
        </Link>
        <Link href="/wastage" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <BoxIconLine className="text-red-600 size-4 dark:text-red-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Units Lost</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white/90">{totalQty.toLocaleString()}</p>
        </Link>
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
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{r.productId?._id ? <Link href={`/products/${r.productId._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{r.productId.name}</Link> : "N/A"}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{r.locationId ? <Link href={`/${r.locationType === "factory" ? "factories" : r.locationType === "depot" ? "depots" : "trucks"}/${r.locationId}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{r.locationName ?? r.locationType}</Link> : "N/A"}</TableCell>
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

      {/* Record Leakage Modal */}
      {showSpoilageForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowSpoilageForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Record Leakage</h3>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <Select
                  options={products.filter(p => p.value)}
                  placeholder="Select product"
                  value={spoilageProduct}
                  onChange={setSpoilageProduct}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <InputField type="number" placeholder="Units lost" value={spoilageQty} onChange={(e) => setSpoilageQty(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
                  <Select
                    options={[{ value: "factory", label: "Factory" }, { value: "depot", label: "Depot" }, { value: "truck", label: "Truck" }]}
                    placeholder="Select"
                    value={spoilageLocType}
                    onChange={(v) => { setSpoilageLocType(v); setSpoilageLocId(""); }}
                  />
                </div>
                {spoilageLocType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">{spoilageLocType}</label>
                    <Select options={spoilageLocationOpts} placeholder={`Select ${spoilageLocType}`} value={spoilageLocId} onChange={setSpoilageLocId} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
                <Select
                  options={[
                    { value: "production", label: "Production" },
                    { value: "transfer", label: "Transfer" },
                    { value: "sale", label: "Sale" },
                    { value: "storage", label: "Storage" },
                    { value: "other", label: "Other" },
                  ]}
                  placeholder="Select source"
                  value={spoilageSource}
                  onChange={setSpoilageSource}
                />
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <span className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={spoilageDeductStock}
                      onChange={(e) => setSpoilageDeductStock(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500"></div>
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Deduct from stock?</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-12">Turn ON to reduce stock at this location. OFF = record only.</p>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <span className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={spoilageRecordAsSale}
                      onChange={(e) => setSpoilageRecordAsSale(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Record as sale?</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-12">Also create a sale entry for this leakage. Revenue will be tracked.</p>
              </div>

              {spoilageRecordAsSale && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3 space-y-3 border border-emerald-100 dark:border-emerald-500/20">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Sale Details</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price Type</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setSpoilageSalePriceMode("unit"); setSpoilageSalePrice(""); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${spoilageSalePriceMode === "unit" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-emerald-300"}`}
                      >
                        Unit Price
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSpoilageSalePriceMode("bulk"); setSpoilageSalePrice(""); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${spoilageSalePriceMode === "bulk" ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-emerald-300"}`}
                      >
                        Bulk Price
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {spoilageSalePriceMode === "unit" ? "Unit Price (₦)" : "Bulk Price (₦)"}
                    </label>
                    <InputField
                      type="number"
                      placeholder={spoilageSalePriceMode === "unit" ? "Price per unit" : "Total price for all units"}
                      value={spoilageSalePrice}
                      onChange={(e) => setSpoilageSalePrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                    <InputField placeholder="Who bought it (optional)" value={spoilageCustomerName} onChange={(e) => setSpoilageCustomerName(e.target.value)} />
                  </div>
                  {spoilageSalePrice && spoilageQty && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total sale:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        ₦{spoilageSalePriceMode === "bulk"
                          ? Number(spoilageSalePrice).toLocaleString()
                          : (Number(spoilageSalePrice) * Number(spoilageQty)).toLocaleString()
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <InputField placeholder="Optional description" value={spoilageDesc} onChange={(e) => setSpoilageDesc(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <InputField type="date" value={spoilageDate} onChange={(e) => setSpoilageDate(e.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowSpoilageForm(false)}>Cancel</Button>
              <Button size="sm" disabled={spoilageSubmitting} onClick={handleRecordSpoilage}>
                {spoilageSubmitting ? "Saving..." : spoilageRecordAsSale ? "Record Leakage & Sale" : "Record Leakage"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
