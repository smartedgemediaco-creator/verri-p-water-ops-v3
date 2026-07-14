"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import AutoAmount from "@/components/ui/AutoAmount";
import DatePicker from "@/components/form/date-picker";
import { showSuccess, showError } from "@/lib/toast";
import { formatDate } from "@/lib/dateFormat";
import { BoxIconLine, ListIcon, AlertIcon, TrashBinIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon } from "@/icons";
import { WaterDropIcon, TruckIcon, FactoryIcon } from "@/components/icons/EntityIcons";

interface StockItem {
  _id: string;
  productId: { _id: string; name: string } | null;
  locationType: string;
  locationId: string;
  locationName: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

interface ActivityData {
  productions: { _id: string; quantity: number; date: string }[];
  sales: { _id: string; quantity: number; totalAmount: number; customerName: string; date: string; paymentMethod: string }[];
  transfers: { _id: string; quantity: number; date: string; status: string; fromType: string; toType: string; fromId: string; toId: string; fromName?: string | null; toName?: string | null; truckId?: { plateNumber: string } }[];
  wastages: { _id: string; quantity: number; date: string; source: string; description: string }[];
}

interface InvStats {
  totalProduced: number;
  totalSold: number;
  totalAvailable: number;
  factoryStock: number;
  depotStock: number;
  truckStock: number;
  locationCount: number;
  pendingTransferQty: number;
  pendingTransferCount: number;
  inTransitQty: number;
  inTransitCount: number;
  totalWastage: number;
  productionLoss: number;
  transferLoss: number;
  saleLoss: number;
  storageLoss: number;
  otherLoss: number;
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

const SPOILAGE_SOURCES = [
  { value: "production", label: "Production" },
  { value: "transfer", label: "Transfer" },
  { value: "sale", label: "Sale" },
  { value: "storage", label: "Storage" },
  { value: "other", label: "Other" },
];

const LOCATION_ICONS: Record<string, React.ReactNode> = {
  factory: <FactoryIcon className="w-5 h-5 text-emerald-600" />,
  depot: <WaterDropIcon className="w-5 h-5 text-blue-600" />,
  truck: <TruckIcon className="w-5 h-5 text-orange-600" />,
};

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<InvStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterLocationId, setFilterLocationId] = useState("");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [filterProduct, setFilterProduct] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLocName, setSelectedLocName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activity, setActivity] = useState<Record<string, ActivityData>>({});
  const [activityLoading, setActivityLoading] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  // add stock modal state
  const [showAddStock, setShowAddStock] = useState(false);
  const [addStockSubmitting, setAddStockSubmitting] = useState(false);
  const [addStockForm, setAddStockForm] = useState({
    locationType: "",
    locationId: "",
    productId: "",
    quantity: "",
  });
  const [addStockLocationOptions, setAddStockLocationOptions] = useState<{ value: string; label: string }[]>([]);

  // spoilage modal state
  const [showSpoilage, setShowSpoilage] = useState(false);
  const [spoilSubmitting, setSpoilSubmitting] = useState(false);
  const [spoilForm, setSpoilForm] = useState({
    productId: "",
    quantity: "",
    source: "storage",
    description: "",
    locationType: "",
    locationId: "",
  });
  const [spoilLocationOptions, setSpoilLocationOptions] = useState<{ value: string; label: string }[]>([]);

  // load truck modal state
  const [showLoadTruck, setShowLoadTruck] = useState(false);
  const [loadTruckSubmitting, setLoadTruckSubmitting] = useState(false);
  const [loadTruckForm, setLoadTruckForm] = useState({
    productId: "",
    productName: "",
    quantity: "",
    maxQuantity: 0,
    truckId: "",
    fromType: "factory",
    fromId: "",
    toType: "depot",
    toId: "",
  });
  const [loadTruckTrucks, setLoadTruckTrucks] = useState<{ value: string; label: string }[]>([]);
  const [loadTruckDests, setLoadTruckDests] = useState<{ value: string; label: string }[]>([]);
  const [loadTruckCustomers, setLoadTruckCustomers] = useState<{ value: string; label: string }[]>([]);
  const [loadTruckFromLocs, setLoadTruckFromLocs] = useState<{ value: string; label: string }[]>([]);

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

  // fetch specific locations when location type changes
  useEffect(() => {
    if (filterLocation === "all") return;
    const endpoint = filterLocation === "factory" ? "/api/factories" : `/api/${filterLocation}s`;
    let cancelled = false;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: LocationOption[]) => {
        if (!cancelled) {
          setLocations(data);
          setFilterLocationId("");
          setSelectedLocName("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocations([]);
          setFilterLocationId("");
          setSelectedLocName("");
        }
      });
    return () => { cancelled = true; };
  }, [filterLocation]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) return;

    let cancelled = false;
    const params = new URLSearchParams();
    if (filterLocation && filterLocation !== "all") params.set("locationType", filterLocation);
    if (filterLocationId) params.set("locationId", filterLocationId);
    if (filterProduct) params.set("productId", filterProduct);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const fetchAll = () => {
      setLoading(true);
      Promise.all([
        fetch(`/api/stock?${params}`).then(r => { if (!r.ok) throw new Error(`stock ${r.status}`); return r.json(); }),
        fetch(`/api/stock/stats?${params}`).then(r => { if (!r.ok) throw new Error(`stats ${r.status}`); return r.json(); }),
      ])
        .then(([invData, statsData]) => {
          if (!cancelled) {
            if (Array.isArray(invData)) setItems(invData);
            if (statsData && typeof statsData === "object") setStats(statsData);
          }
        })
        .catch((e) => console.error("Failed to load stock data:", e))
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    fetchAll();
    const id = setInterval(fetchAll, 120_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [filterLocation, filterLocationId, filterProduct, startDate, endDate]);

  const toggleExpand = async (itemId: string) => {
    if (expandedId === itemId) { setExpandedId(null); setActivityError(null); return; }
    setExpandedId(itemId);
    setActivityError(null);
    if (activity[itemId]) return;
    setActivityLoading(itemId);
    try {
      const res = await fetch(`/api/stock/${itemId}/activity`);
      if (!res.ok) { setActivityError("Failed to load activity"); return; }
      const data = await res.json();
      setActivity((prev) => ({ ...prev, [itemId]: data }));
    } catch {
      setActivityError("Network error loading activity");
    }
    finally { setActivityLoading(null); }
  };

  // load location options for add stock form when type changes
  useEffect(() => {
    if (!addStockForm.locationType) return;
    const endpoint = addStockForm.locationType === "factory" ? "/api/factories" : `/api/${addStockForm.locationType}s`;
    let cancelled = false;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: { _id: string; name?: string; plateNumber?: string }[]) => {
        if (!cancelled) setAddStockLocationOptions(
          data.map((d) => ({ value: d._id, label: d.name ?? `Truck: ${d.plateNumber ?? ""}` }))
        );
      })
      .catch(() => { if (!cancelled) setAddStockLocationOptions([]); });
    return () => { cancelled = true; };
  }, [addStockForm.locationType]);

  // load location options for spoilage form when type changes
  useEffect(() => {
    if (!spoilForm.locationType) return;
    const endpoint = spoilForm.locationType === "factory" ? "/api/factories" : `/api/${spoilForm.locationType}s`;
    let cancelled = false;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: { _id: string; name?: string; plateNumber?: string }[]) => {
        if (!cancelled) setSpoilLocationOptions(
          data.map((d) => ({ value: d._id, label: d.name ?? `Truck: ${d.plateNumber ?? ""}` }))
        );
      })
      .catch(() => { if (!cancelled) setSpoilLocationOptions([]); });
    return () => { cancelled = true; };
  }, [spoilForm.locationType]);

  // load truck: fetch trucks, customers, and destinations when modal opens
  useEffect(() => {
    if (!showLoadTruck) return;
    fetch("/api/trucks")
      .then(r => r.json())
      .then((data: { _id: string; plateNumber: string; capacity: number }[]) => setLoadTruckTrucks(
        data.map(t => ({ value: t._id, label: `${t.plateNumber} (cap: ${(t.capacity ?? 0).toLocaleString()})` }))
      ))
      .catch(() => setLoadTruckTrucks([]));
    fetch("/api/customers")
      .then(r => r.json())
      .then((data: { _id: string; name: string }[]) => setLoadTruckCustomers(
        data.map(c => ({ value: c._id, label: c.name }))
      ))
      .catch(() => setLoadTruckCustomers([]));
  }, [showLoadTruck]);

  useEffect(() => {
    if (!loadTruckForm.toType || !showLoadTruck) return;
    if (loadTruckForm.toType === "customer") return;
    let cancelled = false;
    const endpoint = loadTruckForm.toType === "factory" ? "/api/factories" : "/api/depots";
    fetch(endpoint)
      .then(r => r.json())
      .then((data: { _id: string; name: string }[]) => {
        if (!cancelled) setLoadTruckDests(data.map(d => ({ value: d._id, label: d.name })));
      })
      .catch(() => { if (!cancelled) setLoadTruckDests([]); });
    return () => { cancelled = true; };
  }, [loadTruckForm.toType, showLoadTruck]);

  // fetch source locations when no filter active
  useEffect(() => {
    if (!showLoadTruck || filterLocationId || filterLocation !== "all") return;
    let cancelled = false;
    const endpoint = loadTruckForm.fromType === "factory" ? "/api/factories" : loadTruckForm.fromType === "depot" ? "/api/depots" : "/api/trucks";
    fetch(endpoint)
      .then(r => r.json())
      .then((data: { _id: string; name?: string; plateNumber?: string }[]) => {
        if (!cancelled) setLoadTruckFromLocs(
          data.map(d => ({ value: d._id, label: "name" in d ? (d.name ?? "") : `Truck: ${d.plateNumber ?? ""}` }))
        );
      })
      .catch(() => { if (!cancelled) setLoadTruckFromLocs([]); });
    return () => { cancelled = true; };
  }, [loadTruckForm.fromType, showLoadTruck, filterLocation, filterLocationId]);

  const openLoadTruck = (productId?: string, productName?: string, maxQty?: number) => {
    setLoadTruckForm({
      productId: productId ?? "",
      productName: productName ?? "",
      quantity: "",
      maxQuantity: maxQty ?? 0,
      truckId: "",
      fromType: filterLocation !== "all" ? filterLocation : "factory",
      fromId: filterLocationId || "",
      toType: "depot",
      toId: "",
    });
    setShowLoadTruck(true);
  };

  const handleLoadTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadTruckSubmitting(true);
    try {
      const fromLocId = loadTruckForm.fromId || filterLocationId || "";
      const fromType = loadTruckForm.fromType || filterLocation || "factory";
      const qty = Number(loadTruckForm.quantity);
      if (qty > loadTruckForm.maxQuantity) { showError("Quantity exceeds available stock"); setLoadTruckSubmitting(false); return; }
      const truck = loadTruckTrucks.find(t => t.value === loadTruckForm.truckId);
      let capacity = 1;
      if (truck) {
        const capMatch = truck.label.match(/cap:\s*([\d,]+)/);
        if (capMatch) capacity = Number(capMatch[1].replace(/,/g, "")) || 1;
      }
      const capacityUsed = Math.round((qty / capacity) * 100);
      const body: Record<string, unknown> = {
        fromType,
        fromId: fromLocId,
        toType: loadTruckForm.toType,
        toId: loadTruckForm.toId,
        productId: loadTruckForm.productId,
        quantity: qty,
        truckId: loadTruckForm.truckId,
        capacityUsed,
        loadedBy: "Stock dispatch",
      };
      const res = await fetch("/api/truck-loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed to load truck" })); showError(err.error); return; }
      showSuccess("Truck loaded successfully");
      setShowLoadTruck(false);
      setLoadTruckForm({ productId: "", productName: "", quantity: "", maxQuantity: 0, truckId: "", fromType: "factory", fromId: "", toType: "depot", toId: "" });
    } catch { showError("Network error"); }
    finally { setLoadTruckSubmitting(false); }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStockSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        locationType: addStockForm.locationType,
        locationId: addStockForm.locationId,
        productId: addStockForm.productId,
        quantity: Number(addStockForm.quantity),
      };
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showError("Failed to add stock"); setAddStockSubmitting(false); return; }
      showSuccess("Stock added");
      setShowAddStock(false);
      setAddStockForm({ locationType: "", locationId: "", productId: "", quantity: "" });
    } catch { showError("Network error"); }
    finally { setAddStockSubmitting(false); }
  };

  const handleRecordSpoilage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpoilSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        productId: spoilForm.productId,
        quantity: Number(spoilForm.quantity),
        source: spoilForm.source,
        description: spoilForm.description,
        locationType: spoilForm.locationType,
        locationId: spoilForm.locationId,
      };
      const res = await fetch("/api/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showError("Failed to record spoilage"); setSpoilSubmitting(false); return; }
      showSuccess("Spoilage recorded");
      setShowSpoilage(false);
      setSpoilForm({ productId: "", quantity: "", source: "storage", description: "", locationType: "", locationId: "" });
    } catch { showError("Network error"); }
    finally { setSpoilSubmitting(false); }
  };

  // wastage sub-breakdown
  const wastageSources = stats ? [
    { label: "Production", value: stats.productionLoss, icon: <BoxIconLine className="w-3 h-3" />, color: "text-red-600" },
    { label: "Transfer", value: stats.transferLoss, icon: <TruckIcon className="w-3 h-3" />, color: "text-orange-600" },
    { label: "Sale", value: stats.saleLoss, icon: <ListIcon className="w-3 h-3" />, color: "text-amber-600" },
    { label: "Storage", value: stats.storageLoss, icon: <WaterDropIcon className="w-3 h-3" />, color: "text-cyan-600" },
    { label: "Other", value: stats.otherLoss, icon: <AlertIcon className="w-3 h-3" />, color: "text-gray-600" },
  ] : [];

  const dateError = startDate && endDate && startDate > endDate ? "Start date cannot be later than end date" : "";
  const hasActiveFilters = filterLocation !== "all" || filterLocationId || filterProduct || startDate || endDate;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Stock" />
        <div className="flex gap-2">
          <Link href="/production/new">
            <Button size="sm">
              <PlusIcon className="size-4" />
              New Production
            </Button>
          </Link>
          <Button variant="outline" size="sm" startIcon={<PlusIcon className="size-4" />} onClick={() => setShowAddStock(true)}>
            Add Stock
          </Button>
          <Button variant="outline" size="sm" startIcon={<TruckIcon className="w-4 h-4" />} onClick={() => openLoadTruck()}>
            Load Truck/Tricycle
          </Button>
          <Button variant="outline" size="sm" startIcon={<TrashBinIcon />} onClick={() => setShowSpoilage(true)}>
            Record Spoilage
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Location Type</label>
            <Select options={LOCATION_TYPES} value={filterLocation} onChange={(v) => { setFilterLocation(v); setFilterLocationId(""); }} />
          </div>
          {filterLocation !== "all" && (
            <div className="w-56">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {filterLocation === "factory" ? "Factory" : filterLocation === "depot" ? "Depot" : "Truck"}
              </label>
              <Select
                options={[
                  { value: "", label: `All ${filterLocation}s` },
                  ...locations.map((l) => ({
                    value: l._id,
                    label: l.name ?? l.plateNumber ?? "Unknown",
                  })),
                ]}
                value={filterLocationId}
                onChange={(v) => {
                  setFilterLocationId(v);
                  const loc = locations.find((l) => l._id === v);
                  setSelectedLocName(loc ? (loc.name ?? loc.plateNumber ?? "") : "");
                }}
              />
            </div>
          )}
          <div className="w-56">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
            <Select options={products} value={filterProduct} onChange={setFilterProduct} />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
            <DatePicker
              id="inv-start-date"
              placeholder="From"
              onChange={(selectedDates) => {
                if (selectedDates[0]) setStartDate(selectedDates[0].toISOString().slice(0, 10));
              }}
            />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
            <DatePicker
              id="inv-end-date"
              placeholder="To"
              onChange={(selectedDates) => {
                if (selectedDates[0]) setEndDate(selectedDates[0].toISOString().slice(0, 10));
              }}
            />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={() => {
              setFilterLocation("all");
              setFilterLocationId("");
              setSelectedLocName("");
              setFilterProduct("");
              setStartDate("");
              setEndDate("");
            }}>
              Clear Filters
            </Button>
          )}
        </div>
        {dateError && (
          <p className="text-sm text-red-500 mt-3">{dateError}</p>
        )}
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:gap-6 mb-4">
        <Link href="/stock" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-2">
            <BoxIconLine className="text-emerald-600 size-4 dark:text-emerald-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Produced</p>
          <AutoAmount value={(stats?.totalProduced ?? 0).toLocaleString()} className="text-emerald-700 dark:text-emerald-300 !text-sm" />
        </Link>
        <Link href="/sales" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-2">
            <ListIcon className="text-blue-600 size-4 dark:text-blue-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sold</p>
          <AutoAmount value={(stats?.totalSold ?? 0).toLocaleString()} className="text-blue-700 dark:text-blue-300 !text-sm" />
        </Link>
        <Link href="/stock" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-9 h-9 bg-cyan-100 rounded-lg dark:bg-cyan-500/10 mb-2">
            <WaterDropIcon className="text-cyan-600 size-4 dark:text-cyan-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
          <AutoAmount value={(stats?.totalAvailable ?? 0).toLocaleString()} className="text-cyan-700 dark:text-cyan-300 !text-sm" />
        </Link>
        <Link href="/wastage" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <TrashBinIcon className="text-red-600 size-4 dark:text-red-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Wastage</p>
          <AutoAmount value={(stats?.totalWastage ?? 0).toLocaleString()} className="text-red-700 dark:text-red-300 !text-sm" />
        </Link>
        <Link href="/transfers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-9 h-9 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-2">
            <AlertIcon className="text-amber-600 size-4 dark:text-amber-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending Transfer</p>
          <AutoAmount value={(stats?.pendingTransferQty ?? 0).toLocaleString()} className="text-amber-700 dark:text-amber-300 !text-sm" />
        </Link>
        <Link href="/transfers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-9 h-9 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-2">
            <TruckIcon className="text-purple-600 size-4 dark:text-purple-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">In Transit</p>
          <AutoAmount value={(stats?.inTransitQty ?? 0).toLocaleString()} className="text-purple-700 dark:text-purple-300 !text-sm" />
        </Link>
      </div>

      {/* Location breakdown */}
      {stats && filterLocation === "all" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Link href="/factories" className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Factory</p>
            <AutoAmount value={stats.factoryStock.toLocaleString()} className="text-gray-800 dark:text-white/90 !text-sm" />
          </Link>
          <Link href="/depots" className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Depot</p>
            <AutoAmount value={stats.depotStock.toLocaleString()} className="text-gray-800 dark:text-white/90 !text-sm" />
          </Link>
          <Link href="/trucks" className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Truck</p>
            <AutoAmount value={stats.truckStock.toLocaleString()} className="text-gray-800 dark:text-white/90 !text-sm" />
          </Link>
          <Link href="/stock" className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-theme-sm min-w-0 hover:shadow-theme-md transition-shadow">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Locations</p>
            <AutoAmount value={String(stats.locationCount)} className="text-gray-800 dark:text-white/90 !text-sm" />
          </Link>
        </div>
      )}

      {/* Selected location info */}
      {stats && filterLocation !== "all" && filterLocationId && selectedLocName && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-theme-sm mb-6 flex items-center gap-3">
          {LOCATION_ICONS[filterLocation]}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400">Selected Location</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90 capitalize">{selectedLocName}</p>
          </div>
        </div>
      )}

      {/* Wastage breakdown */}
      {stats && stats.totalWastage > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm mb-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Wastage Breakdown</p>
          <div className="flex flex-wrap gap-4">
            {wastageSources.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-sm">
                <span className={s.color}>{s.icon}</span>
                <span className="text-gray-500 dark:text-gray-400">{s.label}:</span>
                <span className={`font-semibold ${s.color}`}>{s.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {filterLocationId && selectedLocName
              ? `Stock at ${selectedLocName}`
              : filterLocation !== "all"
              ? `All ${filterLocation} Stock Records`
              : "All Stock Records"}
          </h3>
          <span className="text-xs text-gray-400">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-6"><span /></TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Product</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Last Updated</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>No stock records match your filters.</TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const act = activity[item._id];
                const isOpen = expandedId === item._id;
                return (
                  <Fragment key={item._id}>
                    <TableRow
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(item._id)}
                    >
                      <TableCell className="py-3 text-theme-sm text-gray-400">
                        {activityLoading === item._id ? (
                          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          isOpen ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{item.productId?._id ? <Link href={`/products/${item.productId._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{item.productId.name}</Link> : "N/A"}</TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{item.locationId ? <Link href={`/${item.locationType === "factory" ? "factories" : item.locationType === "depot" ? "depots" : "trucks"}/${item.locationId}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{item.locationName ?? item.locationType}</Link> : "N/A"}</TableCell>
                      <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                          item.locationType === "factory" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                          item.locationType === "depot" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                          "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                        }`}>{item.locationType}</span>
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{(item.quantity ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(item.updatedAt)}</TableCell>
                      <TableCell className="py-3">
                        <Button size="sm" variant="outline" onClick={() => openLoadTruck(item.productId?._id, item.productId?.name, item.quantity)}>
                          <TruckIcon className="w-3.5 h-3.5 mr-1" /> Load
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0 bg-gray-50 dark:bg-white/[0.02]">
                          {activityError ? (
                            <div className="px-6 py-4 text-sm text-red-500">{activityError}</div>
                          ) : !act ? (
                            <div className="px-6 py-4 text-sm text-gray-400">Loading activity...</div>
                          ) : (
                            <div className="px-6 py-4 space-y-4">
                              {act.productions.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Production</p>
                                  <div className="space-y-1">
                                    {act.productions.map((p) => (
                                      <div key={p._id} className="text-sm flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="font-medium">{p.quantity.toLocaleString()} units</span>
                                        <span className="text-gray-400">on {formatDate(p.date)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {act.sales.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Sales</p>
                                  <div className="space-y-1">
                                    {act.sales.map((s) => (
                                      <div key={s._id} className="text-sm flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                                        <span className="font-medium">{s.quantity.toLocaleString()} units</span>
                                        <span className="text-gray-400">to {s.customerName || "unknown"} on {formatDate(s.date)}</span>
                                        <span className="text-xs capitalize px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700">{s.paymentMethod}</span>
                                        {s.totalAmount && <span className="text-gray-400">₦{s.totalAmount.toLocaleString()}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {act.transfers.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Transfers</p>
                                  <div className="space-y-1">
                                    {act.transfers.map((t) => (
                                      <div key={t._id} className="text-sm flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                        <span className="font-medium">{t.quantity.toLocaleString()} units</span>
                                        <span className="text-gray-400">{t.fromName ?? t.fromType} → {t.toName ?? t.toType}</span>
                                        <span className="text-gray-400">on {formatDate(t.date)}</span>
                                        <span className={`text-xs capitalize px-1.5 py-0.5 rounded-full ${
                                          t.status === "delivered" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                          t.status === "in-transit" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                                          t.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" :
                                          "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400"
                                        }`}>{t.status}</span>
                                        {t.truckId?.plateNumber && <span className="text-gray-400">Truck: {t.truckId.plateNumber}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {act.wastages.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Wastage / Spoilage</p>
                                  <div className="space-y-1">
                                    {act.wastages.map((w) => (
                                      <div key={w._id} className="text-sm flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                        <span className="w-2 h-2 rounded-full bg-red-400" />
                                        <span className="font-medium">{w.quantity.toLocaleString()} units</span>
                                        <span className="text-gray-400">({w.source}) on {formatDate(w.date)}</span>
                                        {w.description && <span className="text-gray-400 italic">— {w.description}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!act.productions.length && !act.sales.length && !act.transfers.length && !act.wastages.length && (
                                <p className="text-sm text-gray-400">No recorded activity for this stock item.</p>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Stock modal */}
      {showAddStock && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowAddStock(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 shadow-theme-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Add Stock Manually</h3>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
                <Select
                  options={[
                    { value: "factory", label: "Factory" },
                    { value: "depot", label: "Depot" },
                    { value: "truck", label: "Truck" },
                  ]}
                  placeholder="Select type"
                  value={addStockForm.locationType}
                  onChange={(v) => setAddStockForm({ ...addStockForm, locationType: v, locationId: "" })}
                />
              </div>
              {addStockForm.locationType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <Select
                    options={addStockLocationOptions}
                    placeholder="Select location"
                    value={addStockForm.locationId}
                    onChange={(v) => setAddStockForm({ ...addStockForm, locationId: v })}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <Select options={products.filter((p) => p.value)} placeholder="Select product" value={addStockForm.productId} onChange={(v) => setAddStockForm({ ...addStockForm, productId: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <InputField type="number" id="add-stock-qty" placeholder="Units to add" value={addStockForm.quantity} onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={addStockSubmitting || !addStockForm.locationType || !addStockForm.locationId || !addStockForm.productId || !addStockForm.quantity}>
                  {addStockSubmitting ? "Adding..." : "Add Stock"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddStock(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Load Truck/Tricycle modal */}
      {showLoadTruck && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowLoadTruck(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 shadow-theme-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
              {loadTruckForm.productName ? `Load "${loadTruckForm.productName}" to Vehicle` : "Load Truck/Tricycle"}
            </h3>
            <form onSubmit={handleLoadTruck} className="space-y-4">
              {!loadTruckForm.productId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                  <Select options={products.filter(p => p.value)} placeholder="Select product" onChange={(v) => {
                    const p = products.find(p2 => p2.value === v);
                    setLoadTruckForm({ ...loadTruckForm, productId: v, productName: p?.label ?? "", maxQuantity: 999999 });
                  }} />
                </div>
              )}
              {loadTruckForm.productId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                    <p className="text-sm text-gray-800 dark:text-white/90 font-medium">{loadTruckForm.productName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity (max: {loadTruckForm.maxQuantity.toLocaleString()})
                    </label>
                    <InputField type="number" min="1" max={String(loadTruckForm.maxQuantity)} placeholder="Units to load" value={loadTruckForm.quantity} onChange={(e) => setLoadTruckForm({ ...loadTruckForm, quantity: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Truck</label>
                    <Select options={loadTruckTrucks} placeholder="Select truck" value={loadTruckForm.truckId} onChange={(v) => setLoadTruckForm({ ...loadTruckForm, truckId: v })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source Location</label>
                    <div className="flex gap-2">
                      <div className="w-1/3">
                        <Select options={[{ value: "factory", label: "Factory" }, { value: "depot", label: "Depot" }, { value: "truck", label: "Truck" }]} value={loadTruckForm.fromType} onChange={(v) => setLoadTruckForm({ ...loadTruckForm, fromType: v, fromId: "" })} />
                      </div>
                      <div className="flex-1">
                        {filterLocationId ? (
                          <p className="text-sm text-gray-800 dark:text-white/90 font-medium pt-2">{selectedLocName || "Loading..."}</p>
                        ) : (
                          <Select options={loadTruckFromLocs} placeholder="Select source" value={loadTruckForm.fromId} onChange={(v) => setLoadTruckForm({ ...loadTruckForm, fromId: v })} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination Type</label>
                    <Select options={[{ value: "depot", label: "Depot" }, { value: "factory", label: "Factory" }, { value: "customer", label: "Customer (Direct Sale)" }]} value={loadTruckForm.toType} onChange={(v) => setLoadTruckForm({ ...loadTruckForm, toType: v, toId: "" })} />
                  </div>
                  {loadTruckForm.toType === "customer" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer (optional)</label>
                      <Select options={[{ value: "", label: "Outside Sale / Walk-in" }, ...loadTruckCustomers]} placeholder="Select customer" value={loadTruckForm.toId} onChange={(v) => setLoadTruckForm({ ...loadTruckForm, toId: v })} />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
                      <Select options={loadTruckDests} placeholder="Select destination" value={loadTruckForm.toId} onChange={(v) => setLoadTruckForm({ ...loadTruckForm, toId: v })} />
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={loadTruckSubmitting || !loadTruckForm.quantity || !loadTruckForm.truckId || (loadTruckForm.toType !== "customer" && !loadTruckForm.toId) || (!loadTruckForm.fromId && !filterLocationId)}>
                      {loadTruckSubmitting ? "Loading..." : "Load Truck/Tricycle"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowLoadTruck(false)}>Cancel</Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Spoilage modal */}
      {showSpoilage && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowSpoilage(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 shadow-theme-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Record Spoilage</h3>
            <form onSubmit={handleRecordSpoilage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
                <Select
                  options={[
                    { value: "factory", label: "Factory" },
                    { value: "depot", label: "Depot" },
                    { value: "truck", label: "Truck" },
                  ]}
                  placeholder="Select type"
                  value={spoilForm.locationType}
                  onChange={(v) => setSpoilForm({ ...spoilForm, locationType: v, locationId: "" })}
                />
              </div>
              {spoilForm.locationType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                  <Select
                    options={spoilLocationOptions}
                    placeholder="Select location"
                    value={spoilForm.locationId}
                    onChange={(v) => setSpoilForm({ ...spoilForm, locationId: v })}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <Select options={products.filter((p) => p.value)} placeholder="Select product" onChange={(v) => setSpoilForm({ ...spoilForm, productId: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <InputField type="number" id="spoil-qty" placeholder="Units lost" value={spoilForm.quantity} onChange={(e) => setSpoilForm({ ...spoilForm, quantity: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
                <Select options={SPOILAGE_SOURCES} value={spoilForm.source} onChange={(v) => setSpoilForm({ ...spoilForm, source: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <TextArea placeholder="What happened?" value={spoilForm.description} onChange={(v) => setSpoilForm({ ...spoilForm, description: v })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={spoilSubmitting || !spoilForm.locationType || !spoilForm.locationId || !spoilForm.productId || !spoilForm.quantity}>
                  {spoilSubmitting ? "Saving..." : "Record"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowSpoilage(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
