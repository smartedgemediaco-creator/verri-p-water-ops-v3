"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import AutoAmount from "@/components/ui/AutoAmount";
import { PlusIcon, CloseIcon, ArrowDownIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import { formatDate } from "@/lib/dateFormat";

interface RawMaterial {
  _id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  supplierId: { _id: string; name: string } | null;
  notes: string;
}

interface Batch {
  _id: string;
  rawMaterialId: { _id: string; name: string; unit: string; category: string };
  supplierId: { _id: string; name: string } | null;
  supplierName?: string;
  batchNumber: string;
  locationType: string;
  locationId: { _id: string; name?: string } | string;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
  itemCount: number;
  itemUnit: string;
  conversionNote?: string;
  unitPrice: number;
  totalCost: number;
  paidAmount: number;
  amountOwed: number;
  paymentStatus: string;
  status: string;
  receivedDate?: string;
  expiryDate?: string;
  availableQuantity: number;
  consumedQuantity: number;
  qualityNotes?: string;
  orderNotes?: string;
  createdAt: string;
}

interface UsageRecord {
  _id: string;
  rawMaterialId: { _id: string; name: string; unit: string; category: string };
  locationType: string;
  date: string;
  purpose: string;
  allocations: {
    batchId: { _id: string; batchNumber: string; unit: string; unitPrice: number } | string;
    quantity: number;
    unitCost: number;
    itemCount: number;
  }[];
  totalQuantity: number;
  totalCost: number;
  notes: string;
  createdAt: string;
}

interface StockMovement {
  _id: string;
  type: string;
  quantity: number;
  unit: string;
  reference: string;
  notes: string;
  performedBy: string;
  createdAt: string;
}

interface Stats {
  totalMaterials: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  totalReceived: number;
  totalConsumed: number;
}

const CATEGORIES = [
  { value: "chemical", label: "Chemical" },
  { value: "packaging", label: "Packaging" },
  { value: "filter", label: "Filter" },
  { value: "label", label: "Label" },
  { value: "nylon", label: "Nylon" },
  { value: "gas", label: "Gas" },
  { value: "liquid", label: "Liquid" },
  { value: "solid", label: "Solid" },
  { value: "other", label: "Other" },
];

const CONSUMPTION_TYPES = [
  { value: "consumption", label: "Production" },
  { value: "wastage", label: "Wastage" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
];

const USAGE_PURPOSES = [
  { value: "production", label: "Production" },
  { value: "wastage", label: "Wastage" },
  { value: "adjustment", label: "Adjustment" },
  { value: "transfer", label: "Transfer" },
  { value: "other", label: "Other" },
];

const BATCH_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "partially-received", label: "Partially Received" },
  { value: "received", label: "Received" },
  { value: "consumed", label: "Consumed" },
  { value: "expired", label: "Expired" },
];

const PAYMENT_BADGES: Record<string, string> = {
  unpaid: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  partial: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  paid: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
};

const movementTypeColors: Record<string, string> = {
  purchase: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  consumption: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  adjustment: "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  waste: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  return: "bg-theme-pink-50 text-theme-pink-700 dark:bg-theme-pink-500/10 dark:text-theme-pink-400",
  correction: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
  other: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

export default function RawMaterialsPage() {
  const [tab, setTab] = useState<"materials" | "batches" | "usage">("materials");

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([]);
  const [factories, setFactories] = useState<{ _id: string; name: string }[]>([]);
  const [depots, setDepots] = useState<{ _id: string; name: string }[]>([]);

  // Material filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("");

  // Batch filters
  const [batchSearch, setBatchSearch] = useState("");
  const [batchMaterialFilter, setBatchMaterialFilter] = useState("");
  const [batchSupplierFilter, setBatchSupplierFilter] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Usage filters
  const [usageMaterialFilter, setUsageMaterialFilter] = useState("");
  const [usagePurposeFilter, setUsagePurposeFilter] = useState("");
  const [usageFrom, setUsageFrom] = useState("");
  const [usageTo, setUsageTo] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add material form
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("chemical");
  const [minimumStock, setMinimumStock] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [notes, setNotes] = useState("");

  // New batch form
  const [batchMaterialMode, setBatchMaterialMode] = useState<"existing" | "new">("existing");
  const [batchMaterialId, setBatchMaterialId] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCategory, setNewCategory] = useState("chemical");
  const [newMinStock, setNewMinStock] = useState(0);
  const [batchSupplierMode, setBatchSupplierMode] = useState<"existing" | "other">("existing");
  const [batchSupplierId, setBatchSupplierId] = useState("");
  const [batchSupplierName, setBatchSupplierName] = useState("");
  const [recQty, setRecQty] = useState(0);
  const [recUnit, setRecUnit] = useState("");
  const [recItemCount, setRecItemCount] = useState(0);
  const [recItemUnit, setRecItemUnit] = useState("");
  const [recUnitPrice, setRecUnitPrice] = useState(0);
  const [recPaid, setRecPaid] = useState(0);
  const [recOwed, setRecOwed] = useState(0);
  const [recLocationType, setRecLocationType] = useState("factory");
  const [recLocationId, setRecLocationId] = useState("");
  const [recDate, setRecDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [recOrderNotes, setRecOrderNotes] = useState("");
  const [recQualityNotes, setRecQualityNotes] = useState("");

  // Use stock form
  const [useMaterialId, setUseMaterialId] = useState("");
  const [useBatchId, setUseBatchId] = useState("");
  const [useQty, setUseQty] = useState(0);
  const [useReason, setUseReason] = useState("consumption");
  const [useNotes, setUseNotes] = useState("");

  // Movements modal
  const [movementTarget, setMovementTarget] = useState<{ _id: string; batchNumber: string } | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementLoading, setMovementLoading] = useState(false);

  const fetchMaterials = () => {
    fetch("/api/raw-materials")
      .then((r) => r.json())
      .then((data) => setMaterials(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const fetchBatches = () => {
    const params = new URLSearchParams();
    if (batchMaterialFilter) params.set("rawMaterialId", batchMaterialFilter);
    if (batchStatusFilter) params.set("status", batchStatusFilter);
    if (batchSupplierFilter) params.set("supplierId", batchSupplierFilter);
    if (onlyAvailable) params.set("onlyAvailable", "1");
    if (batchSearch) params.set("search", batchSearch);
    fetch(`/api/raw-materials/batches?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setBatches(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const fetchUsage = () => {
    const params = new URLSearchParams();
    if (usageMaterialFilter) params.set("rawMaterialId", usageMaterialFilter);
    if (usagePurposeFilter) params.set("purpose", usagePurposeFilter);
    if (usageFrom) params.set("from", usageFrom);
    if (usageTo) params.set("to", usageTo);
    fetch(`/api/raw-materials/usage?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setUsage(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const fetchStats = () => {
    fetch("/api/raw-materials/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      fetch("/api/raw-materials"),
      fetch("/api/raw-materials/stats"),
      fetch("/api/raw-materials/batches"),
      fetch("/api/raw-materials/usage"),
      fetch("/api/suppliers"),
      fetch("/api/factories"),
      fetch("/api/depots"),
    ]).then(([m, s, b, u, sup, fac, dep]) => {
      if (m.status === "fulfilled") m.value.json().then((data) => setMaterials(Array.isArray(data) ? data : [])).catch(() => {});
      if (s.status === "fulfilled") s.value.json().then((data) => setStats(data)).catch(() => {});
      if (b.status === "fulfilled") b.value.json().then((data) => setBatches(Array.isArray(data) ? data : [])).catch(() => {});
      if (u.status === "fulfilled") u.value.json().then((data) => setUsage(Array.isArray(data) ? data : [])).catch(() => {});
      if (sup.status === "fulfilled") sup.value.json().then((data: { _id: string; name: string }[]) => {
        if (Array.isArray(data)) setSuppliers(data.map((x) => ({ value: x._id, label: x.name })));
      }).catch(() => {});
      if (fac.status === "fulfilled") fac.value.json().then((data: { _id: string; name: string }[]) => {
        if (Array.isArray(data)) setFactories(data.map((f) => ({ _id: f._id, name: f.name })));
      }).catch(() => {});
      if (dep.status === "fulfilled") dep.value.json().then((data: { _id: string; name: string }[]) => {
        if (Array.isArray(data)) setDepots(data.map((d) => ({ _id: d._id, name: d.name })));
      }).catch(() => {});
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (batchMaterialFilter) params.set("rawMaterialId", batchMaterialFilter);
    if (batchStatusFilter) params.set("status", batchStatusFilter);
    if (batchSupplierFilter) params.set("supplierId", batchSupplierFilter);
    if (onlyAvailable) params.set("onlyAvailable", "1");
    if (batchSearch) params.set("search", batchSearch);
    fetch(`/api/raw-materials/batches?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setBatches(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [batchSearch, batchMaterialFilter, batchSupplierFilter, batchStatusFilter, onlyAvailable]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (usageMaterialFilter) params.set("rawMaterialId", usageMaterialFilter);
    if (usagePurposeFilter) params.set("purpose", usagePurposeFilter);
    if (usageFrom) params.set("from", usageFrom);
    if (usageTo) params.set("to", usageTo);
    fetch(`/api/raw-materials/usage?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setUsage(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [usageMaterialFilter, usagePurposeFilter, usageFrom, usageTo]);

  const refreshAll = () => { fetchMaterials(); fetchBatches(); fetchUsage(); fetchStats(); };

  const resetAddForm = () => {
    setName(""); setUnit(""); setCategory("chemical");
    setMinimumStock(0); setUnitCost(0); setNotes("");
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showError("Name is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/raw-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), unit, category, minimumStock, unitCost, notes }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Operation failed"); return; }
      showSuccess("Material added");
      setShowAddModal(false); resetAddForm();
      fetchMaterials(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const resetBatchForm = () => {
    setBatchMaterialMode("existing"); setBatchMaterialId("");
    setNewName(""); setNewUnit(""); setNewCategory("chemical"); setNewMinStock(0);
    setBatchSupplierMode("existing"); setBatchSupplierId(""); setBatchSupplierName("");
    setRecQty(0); setRecUnit(""); setRecItemCount(0); setRecItemUnit("");
    setRecUnitPrice(0); setRecPaid(0); setRecOwed(0);
    setRecLocationType("factory"); setRecLocationId("");
    setRecDate(new Date().toISOString().split("T")[0]);
    setRecOrderNotes(""); setRecQualityNotes("");
  };

  const openBatchModal = (preselect?: RawMaterial) => {
    resetBatchForm();
    if (preselect) {
      setBatchMaterialId(preselect._id);
      setRecUnit(preselect.unit || "");
      setRecUnitPrice(preselect.unitCost || 0);
    }
    const firstFactory = factories[0];
    if (firstFactory) { setRecLocationType("factory"); setRecLocationId(firstFactory._id); }
    else if (depots[0]) { setRecLocationType("depot"); setRecLocationId(depots[0]._id); }
    setShowBatchModal(true);
  };

  const locationOptions = useMemo(() => {
    const opts = [
      ...factories.map((f) => ({ value: f._id, label: `Factory — ${f.name}` })),
      ...depots.map((d) => ({ value: d._id, label: `Depot — ${d.name}` })),
    ];
    return opts.filter((o) => {
      const isFactory = factories.some((f) => f._id === o.value);
      const isDepot = depots.some((d) => d._id === o.value);
      return recLocationType === "factory" ? isFactory : isDepot;
    });
  }, [factories, depots, recLocationType]);

  const handleLocationChange = (id: string) => {
    setRecLocationId(id);
    if (factories.some((f) => f._id === id)) setRecLocationType("factory");
    else if (depots.some((d) => d._id === id)) setRecLocationType("depot");
  };

  const suggestedTotal = (recQty || 0) * (recUnitPrice || 0);
  const suggestedOwed = Math.max(0, suggestedTotal - (recPaid || 0));

  const handleNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recQty <= 0) { showError("Enter the quantity received"); return; }
    if (!recUnit.trim()) { showError("Enter the unit (e.g. kg, litres, pieces)"); return; }
    if (!recLocationId) { showError("Select the delivery location"); return; }
    if (batchSupplierMode === "other" && !batchSupplierName.trim()) {
      showError("Enter the supplier name (or select an existing supplier)"); return;
    }
    setSubmitting(true);
    try {
      let materialId = batchMaterialId;
      if (batchMaterialMode === "new") {
        if (!newName.trim()) { showError("Enter the new material name"); return; }
        const res = await fetch("/api/raw-materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), unit: newUnit, category: newCategory, minimumStock: newMinStock }),
        });
        if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to create material"); return; }
        const created = await res.json();
        materialId = created._id;
      }
      const conversionNote = recItemCount > 0 && recItemUnit
        ? `${recQty} ${recUnit} ≈ ${recItemCount} ${recItemUnit}`
        : "";
      const res = await fetch("/api/raw-materials/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMaterialId: materialId,
          locationType: recLocationType,
          locationId: recLocationId,
          receivedQuantity: recQty,
          unit: recUnit,
          itemCount: recItemCount,
          itemUnit: recItemUnit,
          conversionNote,
          unitPrice: recUnitPrice || undefined,
          paidAmount: recPaid || undefined,
          amountOwed: recOwed || undefined,
          supplierId: batchSupplierMode === "existing" ? batchSupplierId || undefined : undefined,
          supplierName: batchSupplierMode === "other" ? batchSupplierName.trim() : "",
          receivedDate: recDate,
          orderNotes: recOrderNotes,
          qualityNotes: recQualityNotes,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to record stock"); return; }
      showSuccess(`Stock added — ${recQty} ${recUnit}${conversionNote ? ` (${conversionNote})` : ""}`);
      setShowBatchModal(false);
      refreshAll();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const openUseModal = (m?: RawMaterial, batch?: Batch) => {
    setUseReason("consumption"); setUseNotes(""); setUseQty(0);
    if (batch) {
      setUseMaterialId(batch.rawMaterialId._id);
      setUseBatchId(batch._id);
    } else {
      setUseMaterialId(m?._id ?? (materials.find((x) => x.currentStock > 0)?._id ?? ""));
      setUseBatchId("");
    }
    setShowUseModal(true);
  };

  const availableBatches = useMemo(() => {
    if (!useMaterialId) return [];
    return batches
      .filter((b) => b.rawMaterialId._id === useMaterialId && b.availableQuantity > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [batches, useMaterialId]);

  const selectedBatch = availableBatches.find((b) => b._id === useBatchId);

  const handleUseStock = async () => {
    if (!useMaterialId) { showError("Select a material"); return; }
    if (!useBatchId) { showError("Select which batch to take from"); return; }
    if (useQty <= 0) { showError("Enter a valid quantity"); return; }
    const batch = selectedBatch;
    if (!batch) { showError("Batch not found"); return; }
    if (useQty > batch.availableQuantity) {
      showError(`Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQuantity} ${batch.unit}`);
      return;
    }
    setSubmitting(true);
    try {
      const locId = typeof batch.locationId === "object" ? batch.locationId._id : batch.locationId;
      const res = await fetch(`/api/raw-materials/${useMaterialId}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: useQty,
          batchId: useBatchId,
          type: useReason,
          purpose: useReason === "consumption" ? "production" : useReason,
          notes: useNotes,
          locationType: batch.locationType,
          locationId: locId,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess(`Used ${useQty} ${batch.unit} from ${batch.batchNumber}`);
      setShowUseModal(false); setUseMaterialId(""); setUseBatchId(""); setUseQty(0);
      refreshAll();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const openBatchHistory = async (batch: Batch) => {
    setMovementTarget({ _id: batch._id, batchNumber: batch.batchNumber });
    setShowMovementModal(true); setMovementLoading(true); setMovements([]);
    try {
      const res = await fetch(`/api/raw-materials/${batch.rawMaterialId._id}/movements?batchId=${batch._id}&limit=100`);
      const data = await res.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch { setMovements([]); } finally { setMovementLoading(false); }
  };

  // Derived
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.supplierId?.name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || m.category === categoryFilter;
      const isLow = m.minimumStock > 0 && m.currentStock < m.minimumStock;
      const isOut = m.currentStock <= 0;
      const status = isOut ? "out" : isLow ? "low" : "in";
      const matchStatus = !stockStatusFilter || stockStatusFilter === status;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [materials, search, categoryFilter, stockStatusFilter]);

  const lowStockItems = materials.filter((m) => m.currentStock < m.minimumStock && m.minimumStock > 0);
  const outOfStockItems = materials.filter((m) => m.currentStock <= 0);

  const locationName = (b: Batch) => {
    if (typeof b.locationId === "object" && b.locationId?.name) return b.locationId.name;
    const id = typeof b.locationId === "object" ? b.locationId._id : b.locationId;
    const fac = factories.find((f) => f._id === id);
    if (fac) return fac.name;
    const dep = depots.find((d) => d._id === id);
    if (dep) return dep.name;
    return b.locationType === "depot" ? "Depot" : "Factory";
  };

  const batchTotals = useMemo(() => {
    return batches.reduce(
      (acc, b) => ({
        available: acc.available + (b.availableQuantity || 0),
        received: acc.received + (b.receivedQuantity || 0),
        consumed: acc.consumed + (b.consumedQuantity || 0),
        owed: acc.owed + (b.amountOwed || 0),
      }),
      { available: 0, received: 0, consumed: 0, owed: 0 }
    );
  }, [batches]);

  const usageTotals = useMemo(() => {
    return usage.reduce((acc, u) => acc + (u.totalQuantity || 0), 0);
  }, [usage]);

  const materialOptions = materials.map((m) => ({ value: m._id, label: m.name }));
  const supplierOptions = suppliers;
  const batchMaterialFilterOptions = [{ value: "", label: "All Materials" }, ...materialOptions];
  const usageMaterialOptions = [{ value: "", label: "All Materials" }, ...materialOptions];
  const useMaterialOptions = materials.filter((m) => m.currentStock > 0).map((m) => ({ value: m._id, label: `${m.name} (${m.currentStock} ${m.unit})` }));
  const batchSupplierFilterOptions = [{ value: "", label: "All Suppliers" }, ...suppliers];

  const tabs = [
    { id: "materials" as const, label: "Materials" },
    { id: "batches" as const, label: "Batches" },
    { id: "usage" as const, label: "Usage" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Materials" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={refreshAll}>Refresh</Button>
          {tab === "batches" ? (
            <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => openBatchModal()}>
              New Batch
            </Button>
          ) : tab === "usage" ? null : (
            <>
              <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => openBatchModal()}>
                Add Stock
              </Button>
              <Button variant="outline" size="sm" onClick={() => { resetAddForm(); setShowAddModal(true); }}>
                Add Material
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Materials</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.totalMaterials ?? materials.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.lowStockCount ?? lowStockItems.length}</h4>
          {lowStockItems.length > 0 && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">{lowStockItems.map((m) => m.name).join(", ")}</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.outOfStockCount ?? outOfStockItems.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock Value</p>
          <AutoAmount value={`₦${(stats?.totalStockValue ?? 0).toLocaleString()}`} />
        </div>
      </div>

      {loading && tab === "materials" ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-10 text-center text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
      ) : tab === "materials" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="w-56">
              <Input placeholder="Search by name or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-44">
              <Select options={[{ value: "", label: "All Categories" }, ...CATEGORIES]} value={categoryFilter} onChange={setCategoryFilter} />
            </div>
            <div className="w-40">
              <Select
                options={[
                  { value: "", label: "All Stock" },
                  { value: "in", label: "In Stock" },
                  { value: "low", label: "Low Stock" },
                  { value: "out", label: "Out of Stock" },
                ]}
                value={stockStatusFilter}
                onChange={setStockStatusFilter}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Stock</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Min Stock</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>
                    {materials.length === 0 ? 'No raw materials found. Click "Add Material" to create one.' : "No materials match your search."}
                  </TableCell></TableRow>
                ) : (
                  filteredMaterials.map((m) => {
                    const isLow = m.minimumStock > 0 && m.currentStock < m.minimumStock;
                    const isOut = m.currentStock <= 0;
                    return (
                      <TableRow key={m._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <TableCell className="py-3 text-theme-sm font-medium">
                          <Link href={`/raw-materials/${m._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{m.name}</Link>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                            isOut ? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400" :
                            isLow ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" :
                            "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isOut ? "bg-gray-500" : isLow ? "bg-error-500" : "bg-success-500"
                            }`} />
                            {(m.currentStock ?? 0).toLocaleString()} {m.unit || ""}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(m.minimumStock ?? 0).toLocaleString()} {m.unit || ""}</TableCell>
                        <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{m.category}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          {m.supplierId ? (
                            <Link href={`/suppliers/${m.supplierId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{m.supplierId.name}</Link>
                          ) : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => openBatchModal(m)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors">
                              <PlusIcon className="w-3.5 h-3.5 mr-1" /> Receive Stock
                            </button>
                            <button onClick={() => openUseModal(m)} disabled={m.currentStock <= 0} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-colors">
                              <ArrowDownIcon className="w-3.5 h-3.5 mr-1" /> Use Stock
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : tab === "batches" ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Available (filtered)</p>
              <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{batchTotals.available.toLocaleString()}</h4>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Received (filtered)</p>
              <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{batchTotals.received.toLocaleString()}</h4>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Consumed (filtered)</p>
              <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{batchTotals.consumed.toLocaleString()}</h4>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding Debt (filtered)</p>
              <h4 className="mt-1 font-bold text-red-600 dark:text-red-400 text-title-sm">₦{batchTotals.owed.toLocaleString()}</h4>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="w-full lg:w-56">
              <Input placeholder="Search batch / material / supplier..." value={batchSearch} onChange={(e) => setBatchSearch(e.target.value)} />
            </div>
            <div className="w-full lg:w-44">
              <Select options={batchMaterialFilterOptions} value={batchMaterialFilter} onChange={setBatchMaterialFilter} />
            </div>
            <div className="w-full lg:w-44">
              <Select options={batchSupplierFilterOptions} value={batchSupplierFilter} onChange={setBatchSupplierFilter} />
            </div>
            <div className="w-full lg:w-40">
              <Select options={[{ value: "", label: "All Statuses" }, ...BATCH_STATUSES]} value={batchStatusFilter} onChange={setBatchStatusFilter} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="w-4 h-4 accent-brand-500" />
              Only with stock
            </label>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Batch</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Material</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Received</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Available</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit Price</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Paid / Owed</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={11}>
                    No batches found. Click &quot;New Batch&quot; to record your first delivery.
                  </TableCell></TableRow>
                ) : (
                  batches.map((b) => {
                    const paymentBadge = PAYMENT_BADGES[b.paymentStatus] ?? PAYMENT_BADGES.unpaid;
                    return (
                      <TableRow key={b._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{b.batchNumber}</TableCell>
                        <TableCell className="py-3 text-theme-sm">
                          <Link href={`/raw-materials/${b.rawMaterialId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{b.rawMaterialId.name}</Link>
                          {b.conversionNote && <p className="text-[10px] text-gray-400">{b.conversionNote}</p>}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          {b.supplierId ? (
                            <Link href={`/suppliers/${b.supplierId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{b.supplierId.name}</Link>
                          ) : b.supplierName || <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{locationName(b)}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          {(b.receivedQuantity ?? 0).toLocaleString()} {b.unit || ""}
                          {b.itemCount > 0 && <span className="text-[10px] text-gray-400 block">({b.itemCount} {b.itemUnit})</span>}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {(b.availableQuantity ?? 0).toLocaleString()} {b.unit || ""}
                          {b.consumedQuantity > 0 && <span className="text-[10px] text-gray-400 block">{b.consumedQuantity.toLocaleString()} used</span>}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          {b.unitPrice > 0 ? `₦${b.unitPrice.toLocaleString()}/${b.unit || ""}` : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm">
                          <div>
                            <span className="text-success-600 dark:text-success-400">₦{(b.paidAmount ?? 0).toLocaleString()}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-red-600 dark:text-red-400">₦{(b.amountOwed ?? 0).toLocaleString()}</span>
                          </div>
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full mt-1 ${paymentBadge}`}>
                            {b.paymentStatus === "paid" ? "Paid" : b.paymentStatus === "partial" ? "Partial" : "Unpaid"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                            b.status === "received" || b.status === "partially-received" ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" :
                            b.status === "consumed" ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400" :
                            b.status === "expired" ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" :
                            "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400"
                          }`}>
                            {b.status.replace("-", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{b.receivedDate ? formatDate(b.receivedDate) : formatDate(b.createdAt)}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => openUseModal(undefined, b)} disabled={b.availableQuantity <= 0}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-colors">
                              Use
                            </button>
                            <button onClick={() => openBatchHistory(b)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                              History
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="w-full lg:w-44">
              <Select options={usageMaterialOptions} value={usageMaterialFilter} onChange={setUsageMaterialFilter} />
            </div>
            <div className="w-full lg:w-40">
              <Select options={[{ value: "", label: "All Purposes" }, ...USAGE_PURPOSES]} value={usagePurposeFilter} onChange={setUsagePurposeFilter} />
            </div>
            <div className="w-full lg:w-44">
              <Input type="date" value={usageFrom} onChange={(e) => setUsageFrom(e.target.value)} />
            </div>
            <div className="w-full lg:w-44">
              <Input type="date" value={usageTo} onChange={(e) => setUsageTo(e.target.value)} />
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              Total used: <strong className="ml-1">{usageTotals.toLocaleString()}</strong>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Material</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Purpose</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Batch(es)</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Qty</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Cost</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Notes</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.length === 0 ? (
                  <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>
                    No usage records yet. Use stock from a batch to start tracking consumption.
                  </TableCell></TableRow>
                ) : (
                  usage.map((u) => (
                    <TableRow key={u._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(u.date)}</TableCell>
                      <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{u.rawMaterialId?.name ?? "—"}</TableCell>
                      <TableCell className="py-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">{u.purpose}</span>
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                        {u.allocations?.length ? (
                          <div>
                            {u.allocations.map((a, i) => {
                              const batch = typeof a.batchId === "object" ? a.batchId : null;
                              return (
                                <div key={i} className="text-[11px]">
                                  {batch ? batch.batchNumber : "Batch"} · {a.quantity.toLocaleString()} used @ ₦{(a.unitCost ?? 0).toLocaleString()}
                                </div>
                              );
                            })}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{(u.totalQuantity ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">₦{(u.totalCost ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{u.notes || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowAddModal(false); resetAddForm(); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Add Material</h3>
              <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
            </div>
            <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <Input placeholder="e.g. Film rolls, Chlorine, Nylon bags..." value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <Input list="category-options" placeholder="e.g. chemical, nylon..." value={category} onChange={(e) => setCategory(e.target.value)} />
                  <datalist id="category-options">
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <Input placeholder="e.g. kg, litres, rolls, pieces" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <Input type="number" placeholder="0" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock</label>
                <Input type="number" placeholder="0" value={minimumStock} onChange={(e) => setMinimumStock(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={notes} onChange={setNotes} rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowAddModal(false); resetAddForm(); }} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Saving..." : "Add Material"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Batch / Add Stock Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowBatchModal(false); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Add Stock / New Batch</h3>
              <button onClick={() => { if (!submitting) setShowBatchModal(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
            </div>
            <form onSubmit={handleNewBatch} className="p-6 space-y-5">
              {/* Material */}
              <div>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setBatchMaterialMode("existing")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${batchMaterialMode === "existing" ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                    Existing Material
                  </button>
                  <button type="button" onClick={() => setBatchMaterialMode("new")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${batchMaterialMode === "new" ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                    New Material
                  </button>
                </div>
                {batchMaterialMode === "existing" ? (
                  <Select options={materialOptions} placeholder="Select material..." value={batchMaterialId} onChange={setBatchMaterialId} />
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material Name *</label>
                      <Input placeholder="e.g. 50 micron film roll" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                      <Input list="category-options-new" placeholder="e.g. packaging" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                      <datalist id="category-options-new">
                        {CATEGORIES.map((c) => <option key={c.value} value={c.value} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
                      <Input placeholder="e.g. kg, rolls, litres" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock</label>
                      <Input type="number" placeholder="0" value={newMinStock} onChange={(e) => setNewMinStock(Number(e.target.value))} />
                    </div>
                  </div>
                )}
              </div>

              {/* Supplier */}
              <div>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setBatchSupplierMode("existing")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${batchSupplierMode === "existing" ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                    Regular Supplier
                  </button>
                  <button type="button" onClick={() => setBatchSupplierMode("other")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${batchSupplierMode === "other" ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                    One-off / Other
                  </button>
                </div>
                {batchSupplierMode === "existing" ? (
                  <Select options={[{ value: "", label: "Select supplier..." }, ...supplierOptions]} value={batchSupplierId} onChange={setBatchSupplierId} />
                ) : (
                  <Input placeholder="Supplier name (won't be added to supplier list)" value={batchSupplierName} onChange={(e) => setBatchSupplierName(e.target.value)} />
                )}
              </div>

              {/* Qty / unit / conversion */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Received *</label>
                  <Input type="number" placeholder="0" value={recQty} onChange={(e) => setRecQty(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
                  <Input placeholder="kg, litres, rolls..." value={recUnit} onChange={(e) => setRecUnit(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Count (optional)</label>
                  <Input type="number" placeholder="e.g. 20" value={recItemCount} onChange={(e) => setRecItemCount(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Unit (optional)</label>
                  <Input placeholder="e.g. rolls" value={recItemUnit} onChange={(e) => setRecItemUnit(e.target.value)} />
                </div>
              </div>
              {recQty > 0 && recItemCount > 0 && recItemUnit && (
                <div className="bg-brand-50 dark:bg-brand-500/10 rounded-lg px-3 py-2 text-xs text-brand-700 dark:text-brand-400">
                  Conversion: {recQty} {recUnit || "unit"} ≈ {recItemCount} {recItemUnit}
                </div>
              )}

              {/* Price & payment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦)</label>
                  <Input type="number" placeholder="0" value={recUnitPrice} onChange={(e) => setRecUnitPrice(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Paid (₦)</label>
                  <Input type="number" placeholder="0" value={recPaid} onChange={(e) => setRecPaid(Number(e.target.value))} />
                </div>
              </div>
              <div>
                {suggestedTotal > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Suggested total: <strong className="text-gray-800 dark:text-white/90">₦{suggestedTotal.toLocaleString()}</strong> ({recQty} × ₦{recUnitPrice.toLocaleString()})
                    {recPaid > 0 && <> · paid <strong className="text-success-600">₦{recPaid.toLocaleString()}</strong></>}
                    {suggestedOwed > 0 && <> · suggested left <strong className="text-red-600">₦{suggestedOwed.toLocaleString()}</strong></>}
                  </div>
                )}
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Left (₦) <span className="text-gray-400 font-normal">— enter the actual figure you still owe</span>
                </label>
                <Input type="number" placeholder="0" value={recOwed} onChange={(e) => setRecOwed(Number(e.target.value))} />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
                  <Select options={[{ value: "factory", label: "Factory" }, { value: "depot", label: "Depot" }]} value={recLocationType} onChange={setRecLocationType} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivered To *</label>
                  <Select options={locationOptions} placeholder="Select location" value={recLocationId} onChange={handleLocationChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Received Date</label>
                <Input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order / Supplier Notes</label>
                  <TextArea placeholder="Order details, deals, follow-ups..." value={recOrderNotes} onChange={setRecOrderNotes} rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quality Notes</label>
                  <TextArea placeholder="Condition, expiry, specs..." value={recQualityNotes} onChange={setRecQualityNotes} rows={2} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => setShowBatchModal(false)} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Add to Stock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Use Stock Modal */}
      {showUseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowUseModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Use Stock</h3>
              <button onClick={() => { if (!submitting) setShowUseModal(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
                <Select
                  options={[{ value: "", label: "Select material with stock..." }, ...useMaterialOptions]}
                  value={useMaterialId}
                  onChange={(v) => { setUseMaterialId(v); setUseBatchId(""); }}
                />
              </div>
              {useMaterialId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch</label>
                  <Select
                    options={[
                      { value: "", label: "Select batch..." },
                      ...availableBatches.map((b) => ({
                        value: b._id,
                        label: `${b.batchNumber} — ${(b.availableQuantity ?? 0).toLocaleString()} ${b.unit || ""} left · ₦${(b.unitPrice ?? 0).toLocaleString()}/${b.unit || ""} · ${b.supplierId ? b.supplierId.name : b.supplierName || "supplier"}`,
                      })),
                    ]}
                    value={useBatchId}
                    onChange={setUseBatchId}
                  />
                </div>
              )}
              {selectedBatch && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-gray-800 dark:text-white/90">{selectedBatch.batchNumber} — {selectedBatch.rawMaterialId.name}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    Available: <strong>{(selectedBatch.availableQuantity ?? 0).toLocaleString()}</strong> {selectedBatch.unit || ""}
                    {selectedBatch.itemCount > 0 && <> · {selectedBatch.itemCount} {selectedBatch.itemUnit}</>}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Use *</label>
                <Input type="number" placeholder="0" value={useQty} onChange={(e) => setUseQty(Number(e.target.value))} />
                {selectedBatch && useQty > 0 && (
                  <p className={`text-xs mt-1 ${useQty > selectedBatch.availableQuantity ? "text-red-500" : "text-gray-400"}`}>
                    {useQty > selectedBatch.availableQuantity
                      ? `Exceeds batch available (${selectedBatch.availableQuantity.toLocaleString()} ${selectedBatch.unit || ""})!`
                      : `Remaining in batch: ${(selectedBatch.availableQuantity - useQty).toLocaleString()} ${selectedBatch.unit || ""}`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <Select options={CONSUMPTION_TYPES} value={useReason} onChange={setUseReason} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <TextArea placeholder="Reason or reference..." value={useNotes} onChange={setUseNotes} rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => setShowUseModal(false)} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleUseStock} disabled={submitting || useQty <= 0 || !useBatchId}>
                  {submitting ? "Saving..." : "Use Material"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch History Modal */}
      {showMovementModal && movementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowMovementModal(false); setMovementTarget(null); setMovements([]); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Batch History — {movementTarget.batchNumber}</h3>
              <button onClick={() => { setShowMovementModal(false); setMovementTarget(null); setMovements([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6">
              {movementLoading ? (
                <p className="text-center py-8 text-gray-500 text-sm">Loading...</p>
              ) : movements.length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-sm">No movements for this batch yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Qty</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Notes</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((mv) => (
                      <TableRow key={mv._id}>
                        <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(mv.createdAt)}</TableCell>
                        <TableCell className="py-2">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${movementTypeColors[mv.type] || ""}`}>{mv.type}</span>
                        </TableCell>
                        <TableCell className={`py-2 text-theme-sm font-medium ${mv.quantity > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {mv.quantity > 0 ? "+" : ""}{mv.quantity.toLocaleString()} {mv.unit}
                        </TableCell>
                        <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{mv.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
