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
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PlusIcon, CloseIcon, ArrowDownIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { showSuccess, showError, showNote } from "@/lib/toast";
import { formatDate } from "@/lib/dateFormat";
import { evaluateFormula, isValidFormula, BATCH_FORMULA_TOKENS } from "@/lib/formula";

interface RawMaterial {
  _id: string;
  name: string;
  unit: string;
  secondaryUnit?: string;
  units?: string[];
  category: string;
  currentStock: number;
  minimumStock: number;
  unitCost: number;
  supplierId: { _id: string; name: string } | null;
  notes: string;
  customFields?: CustomField[];
}

interface CustomField {
  key: string;
  label: string;
  formula: string;
  format: "number" | "currency" | "percentage" | "text";
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
  itemConsumed: number;
  conversion?: { primaryQty: number; primaryUnit: string; secondaryQty: number; secondaryUnit: string } | null;
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
    itemUnit: string;
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
  itemQuantity: number;
  itemUnit: string;
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

const BATCH_STEPS = [
  { label: "Material" },
  { label: "Supplier" },
  { label: "Batch & Qty" },
  { label: "Conversion" },
  { label: "Cost" },
  { label: "Payment" },
  { label: "Delivery" },
  { label: "Review" },
];

const fmtNum = (v: number | null | undefined, digits = 2): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
};

const formatFieldValue = (v: number | null, format: string): string => {
  if (v === null) return "—";
  switch (format) {
    case "currency":
      return `₦${fmtNum(v)}`;
    case "percentage":
      return `${fmtNum(v)}%`;
    case "number":
      return fmtNum(v);
    default:
      return String(v);
  }
};

const itemAvailable = (b: { itemCount?: number; itemConsumed?: number }): number =>
  (b.itemCount || 0) - (b.itemConsumed || 0);

const batchCtx = (b: Batch): Record<string, number> => ({
  receivedQuantity: b.receivedQuantity || 0,
  availableQuantity: b.availableQuantity || 0,
  consumedQuantity: b.consumedQuantity || 0,
  itemCount: b.itemCount || 0,
  itemConsumed: b.itemConsumed || 0,
  itemAvailable: itemAvailable(b),
  unitPrice: b.unitPrice || 0,
  totalCost: b.totalCost || 0,
  paidAmount: b.paidAmount || 0,
  amountOwed: b.amountOwed || 0,
});

const customFieldValue = (b: Batch, cf: CustomField): string => {
  if (cf.format === "text") return cf.formula || "—";
  return formatFieldValue(evaluateFormula(cf.formula, batchCtx(b)), cf.format);
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

  // Edit / delete targets
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "material" | "batch"; id: string; label: string } | null>(null);
  const [usageDeleteTarget, setUsageDeleteTarget] = useState<UsageRecord | null>(null);
  const [usageDeleteStep, setUsageDeleteStep] = useState(0);
  const [editingUsage, setEditingUsage] = useState<UsageRecord | null>(null);

  // Add material form
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [secondaryUnit, setSecondaryUnit] = useState("");
  const [units, setUnits] = useState<string[]>([]);
  const [draftUnit, setDraftUnit] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [cfDraft, setCfDraft] = useState<CustomField>({ key: "", label: "", formula: "", format: "number" });
  const [cfEditing, setCfEditing] = useState(-1);
  const [cfError, setCfError] = useState("");
  const [category, setCategory] = useState("chemical");
  const [minimumStock, setMinimumStock] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [notes, setNotes] = useState("");

  // New batch form
  const [batchStep, setBatchStep] = useState(0);
  const [batchMaterialMode, setBatchMaterialMode] = useState<"existing" | "new">("existing");
  const [batchMaterialId, setBatchMaterialId] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newSecondaryUnit, setNewSecondaryUnit] = useState("");
  const [newUnits, setNewUnits] = useState("");
  const [newCategory, setNewCategory] = useState("chemical");
  const [batchSupplierMode, setBatchSupplierMode] = useState<"existing" | "other">("existing");
  const [batchSupplierId, setBatchSupplierId] = useState("");
  const [batchSupplierName, setBatchSupplierName] = useState("");
  const [recOrderedQty, setRecOrderedQty] = useState(0);
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
  const [useMode, setUseMode] = useState<"primary" | "secondary">("primary");
  const [useQty, setUseQty] = useState(0);
  const [useReason, setUseReason] = useState("consumption");
  const [useNotes, setUseNotes] = useState("");
  const [useDate, setUseDate] = useState(() => new Date().toISOString().split("T")[0]);

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

  // Explainable UI — any control with a data-note attribute shows a friendly
  // "How to do this" toast when focused or clicked (like leaving notes for a helper).
  useEffect(() => {
    const lastShown = new Map<string, number>();
    const noteFor = (el: EventTarget | null): string | null => {
      if (!(el instanceof Element)) return null;
      const node = el.closest<HTMLElement>("[data-note]");
      return node?.dataset.note ?? null;
    };
    const maybeShow = (el: EventTarget | null) => {
      const note = noteFor(el);
      if (!note) return;
      const now = Date.now();
      const last = lastShown.get(note) ?? 0;
      if (now - last < 1500) return;
      lastShown.set(note, now);
      showNote(note);
    };
    const onFocusIn = (e: FocusEvent) => maybeShow(e.target);
    const onClick = (e: MouseEvent) => maybeShow(e.target);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const resetAddForm = () => {
    setName(""); setUnit(""); setCategory("chemical");
    setMinimumStock(0); setUnitCost(0); setNotes("");
    setSecondaryUnit(""); setUnits([]); setDraftUnit("");
    setCustomFields([]); setCfDraft({ key: "", label: "", formula: "", format: "number" });
    setCfEditing(-1); setCfError("");
    setEditingMaterial(null);
  };

  const openEditMaterial = (m: RawMaterial) => {
    setEditingMaterial(m);
    setName(m.name); setUnit(m.unit || ""); setCategory(m.category || "other");
    setMinimumStock(m.minimumStock || 0); setUnitCost(m.unitCost || 0); setNotes(m.notes || "");
    setSecondaryUnit(m.secondaryUnit || ""); setUnits(m.units && m.units.length ? m.units : []);
    setCustomFields(Array.isArray(m.customFields) ? m.customFields : []);
    setCfDraft({ key: "", label: "", formula: "", format: "number" });
    setCfEditing(-1); setCfError("");
    setShowAddModal(true);
  };

  const addUnit = () => {
    const u = draftUnit.trim();
    if (!u) return;
    setUnits((prev) => (prev.includes(u) ? prev : [...prev, u]));
    setDraftUnit("");
  };

  const saveCustomField = () => {
    if (!cfDraft.label.trim()) { setCfError("Label is required"); return; }
    if (!cfDraft.formula.trim()) { setCfError("Formula is required"); return; }
    if (!isValidFormula(cfDraft.formula)) { setCfError("Formula is invalid — check operators, parentheses and field names"); return; }
    const key = cfDraft.key || cfDraft.label.trim().replace(/\s+/g, "_");
    if (cfEditing >= 0) {
      setCustomFields((prev) => prev.map((f, i) => (i === cfEditing ? { ...f, ...cfDraft, key } : f)));
    } else {
      setCustomFields((prev) => [...prev, { ...cfDraft, key }]);
    }
    setCfDraft({ key: "", label: "", formula: "", format: "number" });
    setCfEditing(-1); setCfError("");
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showError("Name is required"); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        unit,
        secondaryUnit,
        units: units.filter(Boolean),
        category,
        minimumStock,
        unitCost,
        notes,
        customFields,
      };
      const url = editingMaterial ? `/api/raw-materials/${editingMaterial._id}` : "/api/raw-materials";
      const res = await fetch(url, {
        method: editingMaterial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Operation failed"); return; }
      showSuccess(editingMaterial ? "Material updated" : "Material added");
      setShowAddModal(false); resetAddForm();
      fetchMaterials(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const resetBatchForm = () => {
    setBatchStep(0);
    setBatchMaterialMode("existing"); setBatchMaterialId("");
    setNewName(""); setNewUnit(""); setNewSecondaryUnit(""); setNewUnits("");
    setNewCategory("chemical");
    setBatchSupplierMode("existing"); setBatchSupplierId(""); setBatchSupplierName("");
    setRecOrderedQty(0); setRecQty(0); setRecUnit(""); setRecItemCount(0); setRecItemUnit("");
    setRecUnitPrice(0); setRecPaid(0); setRecOwed(0);
    setRecLocationType("factory"); setRecLocationId("");
    setRecDate(new Date().toISOString().split("T")[0]);
    setRecOrderNotes(""); setRecQualityNotes("");
    setEditingBatch(null);
  };

  const openEditBatch = (b: Batch) => {
    resetBatchForm();
    setEditingBatch(b);
    setBatchMaterialId(b.rawMaterialId._id);
    setBatchSupplierMode(b.supplierId ? "existing" : "other");
    setBatchSupplierId(b.supplierId?._id ?? "");
    setBatchSupplierName(b.supplierName || "");
    setRecOrderedQty(b.orderedQuantity || 0);
    setRecQty(b.receivedQuantity ?? 0);
    setRecUnit(b.unit || "");
    setRecItemCount(b.itemCount || 0);
    setRecItemUnit(b.itemUnit || "");
    setRecUnitPrice(b.unitPrice || 0);
    setRecPaid(b.paidAmount || 0);
    setRecOwed(b.amountOwed || 0);
    setRecLocationType(b.locationType || "factory");
    setRecLocationId(typeof b.locationId === "object" ? b.locationId._id : b.locationId);
    setRecDate(b.receivedDate ? b.receivedDate.slice(0, 10) : new Date().toISOString().split("T")[0]);
    setRecOrderNotes(b.orderNotes || "");
    setRecQualityNotes(b.qualityNotes || "");
    setShowBatchModal(true);
  };

  const openBatchModal = (preselect?: RawMaterial) => {
    resetBatchForm();
    if (materials.length === 0) setBatchMaterialMode("new");
    if (preselect) {
      setBatchMaterialId(preselect._id);
      setRecUnit(preselect.unit || "");
      setRecUnitPrice(preselect.unitCost || 0);
      setRecItemUnit(preselect.secondaryUnit || "");
    }
    const firstFactory = factories[0];
    if (firstFactory) { setRecLocationType("factory"); setRecLocationId(firstFactory._id); }
    else if (depots[0]) { setRecLocationType("depot"); setRecLocationId(depots[0]._id); }
    setShowBatchModal(true);
  };

  const validateBatchStep = (step: number): string => {
    switch (step) {
      case 0:
        if (batchMaterialMode === "new") {
          if (!newName.trim()) return "Enter the new material name";
          if (!newUnit.trim()) return "Enter the new material unit";
        } else if (!batchMaterialId) {
          return "Select the material (or choose New Material)";
        }
        return "";
      case 1:
        if (batchSupplierMode === "other" && !batchSupplierName.trim()) return "Enter the supplier name";
        return "";
      case 2:
        if (recQty <= 0) return "Enter the quantity received";
        if (!recUnit.trim()) return "Enter the unit (e.g. kg, litres, rolls)";
        return "";
      case 3:
        if (recItemCount > 0 && !recItemUnit.trim()) return "Enter the item unit (e.g. rolls, pieces)";
        if (recItemUnit.trim() && recItemCount <= 0) return "Enter the item count";
        return "";
      case 4:
        if (recUnitPrice < 0) return "Unit price cannot be negative";
        return "";
      case 5:
        if (recPaid < 0 || recOwed < 0) return "Payment amounts cannot be negative";
        return "";
      case 6:
        if (!recLocationId) return "Select the delivery location";
        return "";
      default:
        return "";
    }
  };

  const goBatchNext = () => {
    const err = validateBatchStep(batchStep);
    if (err) { showError(err); return; }
    setBatchStep((s) => Math.min(s + 1, BATCH_STEPS.length - 1));
  };

  const goBatchBack = () => setBatchStep((s) => Math.max(s - 1, 0));

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
        const unitList = [newUnit, newSecondaryUnit, ...newUnits.split(",").map((u) => u.trim())]
          .filter((u) => u && u !== newUnit && u !== newSecondaryUnit);
        const res = await fetch("/api/raw-materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName.trim(),
            unit: newUnit,
            secondaryUnit: newSecondaryUnit,
            units: [...new Set([newUnit, ...unitList])].filter(Boolean),
            category: newCategory,
          }),
        });
        if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to create material"); return; }
        const created = await res.json();
        materialId = created._id;
      }
      const conversionNote = recItemCount > 0 && recItemUnit
        ? `${recQty} ${recUnit} ≈ ${recItemCount} ${recItemUnit}`
        : "";
      const conversion = recItemCount > 0 && recItemUnit
        ? { primaryQty: recQty, primaryUnit: recUnit, secondaryQty: recItemCount, secondaryUnit: recItemUnit }
        : null;
      const payload: Record<string, unknown> = {
        locationType: recLocationType,
        locationId: recLocationId,
        orderedQuantity: recOrderedQty || recQty,
        receivedQuantity: recQty,
        unit: recUnit,
        itemCount: recItemCount,
        itemUnit: recItemUnit,
        conversion,
        conversionNote,
        unitPrice: recUnitPrice || undefined,
        paidAmount: recPaid || undefined,
        amountOwed: recOwed || undefined,
        supplierId: batchSupplierMode === "existing" ? batchSupplierId || undefined : undefined,
        supplierName: batchSupplierMode === "other" ? batchSupplierName.trim() : "",
        receivedDate: recDate,
        orderNotes: recOrderNotes,
        qualityNotes: recQualityNotes,
      };
      const url = editingBatch ? `/api/raw-materials/batches/${editingBatch._id}` : "/api/raw-materials/batches";
      const res = await fetch(url, {
        method: editingBatch ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBatch ? payload : { ...payload, rawMaterialId: materialId }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to record stock"); return; }
      showSuccess(editingBatch
        ? `Batch ${editingBatch.batchNumber} updated`
        : `Stock added — ${recQty} ${recUnit}${conversionNote ? ` (${conversionNote})` : ""}`);
      setShowBatchModal(false);
      refreshAll();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const openUseModal = (m?: RawMaterial, batch?: Batch) => {
    setEditingUsage(null);
    setUseReason("consumption"); setUseNotes(""); setUseQty(0); setUseMode("primary");
    setUseDate(new Date().toISOString().split("T")[0]);
    if (batch) {
      setUseMaterialId(batch.rawMaterialId._id);
      setUseBatchId(batch._id);
    } else {
      setUseMaterialId(m?._id ?? (materials.find((x) => x.currentStock > 0)?._id ?? ""));
      setUseBatchId("");
    }
    setShowUseModal(true);
  };

  const openEditUsage = (u: UsageRecord) => {
    setEditingUsage(u);
    const firstAlloc = u.allocations?.[0];
    const matId = u.rawMaterialId?._id ?? "";
    const batchId = firstAlloc
      ? (typeof firstAlloc.batchId === "object" ? firstAlloc.batchId._id : firstAlloc.batchId)
      : "";
    const useSecondary = !!firstAlloc && (firstAlloc.itemCount ?? 0) > 0;
    setUseMaterialId(matId);
    setUseBatchId(batchId);
    setUseMode(useSecondary ? "secondary" : "primary");
    setUseQty(useSecondary ? (firstAlloc?.itemCount ?? 0) : (u.totalQuantity ?? 0));
    setUseReason(u.purpose === "production" ? "consumption" : u.purpose === "transfer" ? "other" : u.purpose);
    setUseNotes(u.notes || "");
    setUseDate(u.date ? String(u.date).slice(0, 10) : new Date().toISOString().split("T")[0]);
    setShowUseModal(true);
  };

  const editingUsageBatchId = editingUsage?.allocations?.[0]
    ? (typeof editingUsage.allocations[0].batchId === "object"
        ? editingUsage.allocations[0].batchId._id
        : editingUsage.allocations[0].batchId)
    : "";

  const availableBatches = useMemo(() => {
    if (!useMaterialId) return [];
    return batches
      .filter((b) => b.rawMaterialId._id === useMaterialId && (b.availableQuantity > 0 || (editingUsage && editingUsageBatchId === b._id)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [batches, useMaterialId, editingUsage, editingUsageBatchId]);

  const selectedBatch = availableBatches.find((b) => b._id === useBatchId);

  const useRemainingKg = selectedBatch?.availableQuantity ?? 0;
  const useRemainingItems = selectedBatch ? itemAvailable(selectedBatch) : 0;
  const useConvertedQty = selectedBatch
    ? (() => {
        const received = selectedBatch.receivedQuantity || 0;
        const count = selectedBatch.itemCount || 0;
        if (!received || !count) return 0;
        return useMode === "secondary"
          ? (useQty * received) / count
          : (useQty * count) / received;
      })()
    : 0;

  const handleUseStock = async () => {
    if (!useMaterialId) { showError("Select a material"); return; }
    if (!useBatchId) { showError("Select which batch to take from"); return; }
    if (useQty <= 0) { showError("Enter a valid quantity"); return; }
    const batch = selectedBatch;
    if (!batch) { showError("Batch not found"); return; }
    const editOriginalPrimary = editingUsage?.totalQuantity ?? 0;
    const editOriginalItems = editingUsage?.allocations?.[0]?.itemCount ?? 0;
    if (useMode === "secondary") {
      if (useQty > useRemainingItems + editOriginalItems) {
        showError(`Insufficient ${batch.itemUnit || "items"} in batch ${batch.batchNumber}. Available: ${useRemainingItems + editOriginalItems} ${batch.itemUnit || "items"}`);
        return;
      }
      if (useConvertedQty > batch.availableQuantity + editOriginalPrimary) {
        showError(`Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQuantity + editOriginalPrimary} ${batch.unit}`);
        return;
      }
    } else if (useQty > batch.availableQuantity + editOriginalPrimary) {
      showError(`Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQuantity + editOriginalPrimary} ${batch.unit}`);
      return;
    }
    setSubmitting(true);
    try {
      const locId = typeof batch.locationId === "object" ? batch.locationId._id : batch.locationId;
      const purpose = useReason === "consumption" ? "production" : useReason;
      if (editingUsage) {
        const body: Record<string, unknown> = {
          batchId: useBatchId,
          purpose,
          notes: useNotes,
          date: useDate,
          locationType: batch.locationType,
          locationId: locId,
        };
        if (useMode === "secondary") {
          body.itemQuantity = useQty;
        } else {
          body.quantity = useQty;
        }
        const res = await fetch(`/api/raw-materials/usage/${editingUsage._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to update"); return; }
        showSuccess(useMode === "secondary"
          ? `Updated: ${useQty} ${batch.itemUnit} (${useConvertedQty.toLocaleString()} ${batch.unit}) from ${batch.batchNumber}`
          : `Updated: ${useQty} ${batch.unit} from ${batch.batchNumber}`);
        setShowUseModal(false); setEditingUsage(null); setUseMaterialId(""); setUseBatchId(""); setUseQty(0); setUseMode("primary");
        refreshAll();
        return;
      }
      const body: Record<string, unknown> = {
        batchId: useBatchId,
        type: useReason,
        purpose,
        notes: useNotes,
        date: useDate,
        locationType: batch.locationType,
        locationId: locId,
      };
      if (useMode === "secondary") {
        body.itemQuantity = useQty;
        body.itemUnit = batch.itemUnit;
      } else {
        body.quantity = useQty;
      }
      const res = await fetch(`/api/raw-materials/${useMaterialId}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess(useMode === "secondary"
        ? `Used ${useQty} ${batch.itemUnit} (${useConvertedQty.toLocaleString()} ${batch.unit}) from ${batch.batchNumber}`
        : `Used ${useQty} ${batch.unit} from ${batch.batchNumber}`);
      setShowUseModal(false); setUseMaterialId(""); setUseBatchId(""); setUseQty(0); setUseMode("primary");
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

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(
      deleteTarget.kind === "batch"
        ? `/api/raw-materials/batches/${deleteTarget.id}`
        : `/api/raw-materials/${deleteTarget.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed to delete" })); showError(err.error || "Failed to delete"); return; }
    showSuccess("Deleted");
    setDeleteTarget(null);
    refreshAll();
  };

  const doDeleteUsage = async () => {
    if (!usageDeleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/usage/${usageDeleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed to delete" })); showError(err.error || "Failed to delete"); return; }
      showSuccess("Usage record deleted");
      setUsageDeleteTarget(null); setUsageDeleteStep(0);
      fetchUsage(); fetchStats();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
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

  const batchCustomColumns = useMemo(() => {
    const m = materials.find((x) => x._id === batchMaterialFilter);
    return m?.customFields && m.customFields.length > 0 ? m.customFields : [];
  }, [materials, batchMaterialFilter]);

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
          <Button variant="outline" size="sm" onClick={refreshAll}
            data-note="This button reloads everything on the page (the list of materials, batches, usage records and the numbers on top) so you always see the freshest data. Click it after someone else makes a change, or if something looks wrong.">
            Refresh
          </Button>
          {tab === "batches" ? (
            <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => openBatchModal()}
              data-note="This opens the 'Add Stock / New Batch' form. Use it when a new delivery of material arrives at your factory or depot. You will pick the material, the supplier, how much came in, what it cost, and where it was delivered — step by step. This is how new stock gets into the system.">
              New Batch
            </Button>
          ) : tab === "usage" ? null : (
            <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => openBatchModal()}
              data-note="This opens the 'Add Stock' form. Use it when you receive a delivery of material. It takes you through every step: which material, which supplier, how much arrived, the cost, and where it was delivered. This is how you add new stock.">
              Add Stock
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-note={t.id === "materials"
              ? "The Materials tab is the main list. It shows every material you own, how much stock is left, the minimum you should keep, its category, and who supplies it. You can also receive stock, use stock, edit or delete from here."
              : t.id === "batches"
                ? "The Batches tab shows every single delivery you have ever received, one row per delivery (a 'batch'). You can see how much arrived, how much is still left, what you paid, and what you still owe. Use the History button on a batch to see its full timeline."
                : "The Usage tab shows every time material was used up (consumed) — for production, wastage, adjustments or other reasons. Each row is one usage event. You can edit or delete a usage row here, and the stock is automatically given back when you delete it."}
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
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{stats?.totalMaterials ?? materials.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{stats?.lowStockCount ?? lowStockItems.length}</h4>
          {lowStockItems.length > 0 && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">{lowStockItems.map((m) => m.name).join(", ")}</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{stats?.outOfStockCount ?? outOfStockItems.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock Value</p>
          <AutoAmount value={`₦${(stats?.totalStockValue ?? 0).toLocaleString()}`} className="text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {loading && tab === "materials" ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-10 text-center text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
      ) : tab === "materials" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="w-56">
              <Input placeholder="Search by name or supplier..." value={search} onChange={(e) => setSearch(e.target.value)}
                data-note="Type here to find a material fast — it searches by the material's name or its supplier's name. For example type 'film' or 'zaria' and the list shrinks to just the matching rows. Clear it to see everything again." />
            </div>
            <div className="w-44">
              <Select options={[{ value: "", label: "All Categories" }, ...CATEGORIES]} value={categoryFilter} onChange={setCategoryFilter}
                data-note="This drops the list down to only one category, like Chemical or Packaging. Pick 'All Categories' when you want to see every material again. It only filters what you see — nothing is deleted." />
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
                data-note="This filters materials by their stock health. 'Low Stock' shows only the materials that are running out (below the minimum you set). 'Out of Stock' shows the ones that are completely finished. Very handy when you need to re-order quickly." />
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
                    {materials.length === 0 ? 'No raw materials found. Click "Add Stock" and choose "New Material" to create one.' : "No materials match your search."}
                  </TableCell></TableRow>
                ) : (
                  filteredMaterials.map((m) => {
                    const isLow = m.minimumStock > 0 && m.currentStock < m.minimumStock;
                    const isOut = m.currentStock <= 0;
                    return (
                      <TableRow key={m._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <TableCell className="py-3 text-theme-sm font-medium">
                          <Link href={`/raw-materials/${m._id}`} className="text-blue-600 dark:text-blue-400 hover:underline"
                            data-note="Click the material's name to open its own page. There you'll find more detail about this one material — all of its batches, its full stock history, and the ability to use or add stock to just this material.">{m.name}</Link>
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
                            <Link href={`/suppliers/${m.supplierId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline"
                              data-note="This is the company that supplies this material. Click it to go to the supplier's page and see everything you buy from them, their contact details and their payment terms.">{m.supplierId.name}</Link>
                          ) : <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => openBatchModal(m)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors"
                              data-note="This opens the Add Stock form with this material already picked. Use it when a new delivery of THIS material arrives. It records the delivery as a new batch and adds its quantity to your stock.">
                              <PlusIcon className="w-3.5 h-3.5 mr-1" /> Receive Stock
                            </button>
                            <button onClick={() => openUseModal(m)} disabled={m.currentStock <= 0} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-colors"
                              data-note="This opens the 'Use Stock' form with this material already picked. Use it when you take material out — for example for production or if something got spoiled. It takes the amount out of a specific batch and records why. If this button is greyed out, the material has no stock left.">
                              <ArrowDownIcon className="w-3.5 h-3.5 mr-1" /> Use Stock
                            </button>
                            <button onClick={() => openEditMaterial(m)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors"
                              data-note="This opens the Edit Material form for this material. You can change its name, category, units, cost, minimum stock, notes, and the custom columns. Changes only apply to this material — its batches are not touched.">
                              <PencilIcon className="w-3.5 h-3.5 mr-1" /> Edit
                            </button>
                            <button onClick={() => setDeleteTarget({ kind: "material", id: m._id, label: m.name })} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                              data-note="This deletes the material. A box will ask you to confirm first. IMPORTANT: a material that already has batches cannot be deleted — you would have to delete all of its batches first. Deleting removes it permanently, so only use this for materials you no longer want.">
                              <TrashBinIcon className="w-3.5 h-3.5 mr-1" /> Delete
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
              <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{batchTotals.available.toLocaleString()}</h4>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Received (filtered)</p>
              <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{batchTotals.received.toLocaleString()}</h4>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Consumed (filtered)</p>
              <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{batchTotals.consumed.toLocaleString()}</h4>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding Debt (filtered)</p>
              <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">₦{batchTotals.owed.toLocaleString()}</h4>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="w-full lg:w-56">
              <Input placeholder="Search batch / material / supplier..." value={batchSearch} onChange={(e) => setBatchSearch(e.target.value)}
                data-note="Type here to find one delivery quickly. It searches the batch number, the material name and the supplier name. For example type 'B-100' or 'film' and only the matching deliveries stay in the list." />
            </div>
            <div className="w-full lg:w-44">
              <Select options={batchMaterialFilterOptions} value={batchMaterialFilter} onChange={setBatchMaterialFilter}
                data-note="This shows deliveries for only ONE material. Pick the material you care about and the table will only show deliveries of that material. Choose 'All Materials' to see every delivery again." />
            </div>
            <div className="w-full lg:w-44">
              <Select options={batchSupplierFilterOptions} value={batchSupplierFilter} onChange={setBatchSupplierFilter}
                data-note="This shows deliveries from only ONE supplier. Pick a supplier to see every delivery they have brought you. Choose 'All Suppliers' to see everyone again." />
            </div>
            <div className="w-full lg:w-40">
              <Select options={[{ value: "", label: "All Statuses" }, ...BATCH_STATUSES]} value={batchStatusFilter} onChange={setBatchStatusFilter}
                data-note="This filters deliveries by their state: Received (all here), Consumed (all used up), Partially Received, Expired or Pending. For example pick 'Consumed' to see which deliveries have been completely used." />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
              data-note="Tick this box to hide every delivery that has no stock left, so you only see batches that still have material available. Untick it to see all deliveries again.">
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
                  {batchCustomColumns.map((cf) => (
                    <TableCell isHeader key={cf.key} className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{cf.label}</TableCell>
                  ))}
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
                          <Link href={`/raw-materials/${b.rawMaterialId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline"
                            data-note="Click the material name to jump to that material's page, where you can see all of its batches and its full history.">{b.rawMaterialId.name}</Link>
                          {b.conversionNote && <p className="text-[10px] text-gray-400">{b.conversionNote}</p>}
                        </TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                          {b.supplierId ? (
                            <Link href={`/suppliers/${b.supplierId._id}`} className="text-blue-600 dark:text-blue-400 hover:underline"
                              data-note="Click the supplier name to go to that supplier's page and see everything else you buy from them.">{b.supplierId.name}</Link>
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
                          {b.itemUnit && itemAvailable(b) > 0 && <span className="text-[10px] text-success-600/70 dark:text-success-400/70 block">{itemAvailable(b).toLocaleString()} {b.itemUnit} left</span>}
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
                        {batchCustomColumns.map((cf) => (
                          <TableCell key={cf.key} className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{customFieldValue(b, cf)}</TableCell>
                        ))}
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{b.receivedDate ? formatDate(b.receivedDate) : formatDate(b.createdAt)}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => openUseModal(undefined, b)} disabled={b.availableQuantity <= 0}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 transition-colors"
                              data-note="This lets you use material from THIS specific delivery (batch). The Use Stock form opens with this batch already chosen, so whatever you take comes out of this delivery first. Greyed out when this batch is fully used up.">
                              Use
                            </button>
                            <button onClick={() => openBatchHistory(b)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors"
                              data-note="This opens the full history of this one delivery — every time stock was added to it or taken from it, with dates and quantities. Great for checking where stock went.">
                              History
                            </button>
                            <button onClick={() => openEditBatch(b)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors"
                              data-note="This lets you change the details of this delivery — quantities, unit price, what was paid, the supplier, the location, or the dates. The material itself cannot be changed once a delivery is saved.">
                              <PencilIcon className="w-3.5 h-3.5 mr-1" /> Edit
                            </button>
                            <button onClick={() => setDeleteTarget({ kind: "batch", id: b._id, label: b.batchNumber })} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                              data-note="This deletes this delivery (batch) permanently. A box will ask you to confirm first. A batch that has already been used (consumed) cannot be deleted. Deleting a batch also removes its remaining stock, so be sure before you do it.">
                              <TrashBinIcon className="w-3.5 h-3.5 mr-1" /> Delete
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
              <Select options={usageMaterialOptions} value={usageMaterialFilter} onChange={setUsageMaterialFilter}
                data-note="This shows usage records for only ONE material. Pick a material to see every time it was used. Choose 'All Materials' to see usage for everything at once." />
            </div>
            <div className="w-full lg:w-40">
              <Select options={[{ value: "", label: "All Purposes" }, ...USAGE_PURPOSES]} value={usagePurposeFilter} onChange={setUsagePurposeFilter}
                data-note="This filters usage by the reason it happened: Production, Wastage, Adjustment, Transfer or Other. For example pick 'Wastage' to see everything that was wasted." />
            </div>
            <div className="w-full lg:w-44">
              <Input type="date" value={usageFrom} onChange={(e) => setUsageFrom(e.target.value)}
                data-note="This is the start date for the usage list. Pick a date and only usage from that day onwards will be shown. Leave it empty to go all the way back to the beginning." />
            </div>
            <div className="w-full lg:w-44">
              <Input type="date" value={usageTo} onChange={(e) => setUsageTo(e.target.value)}
                data-note="This is the end date for the usage list. Pick a date and only usage up to that day will be shown. Use it together with the start date to look at usage in a specific period, like last week or last month." />
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
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.length === 0 ? (
                  <TableRow><TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>
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
                                  {a.itemCount > 0 && a.itemUnit ? <span className="text-gray-400"> · {a.itemCount.toLocaleString()} {a.itemUnit}</span> : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{(u.totalQuantity ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">₦{(u.totalCost ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{u.notes || "—"}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditUsage(u)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors"
                            data-note="This lets you fix this usage record. You can change the quantity, the batch it was taken from, the reason, the date, or add a note. When you save, the system first puts the old amount back into stock and then takes out the new amount, so your stock always stays correct.">
                            <PencilIcon className="w-3.5 h-3.5 mr-1" /> Edit
                          </button>
                          <button onClick={() => { setUsageDeleteTarget(u); setUsageDeleteStep(1); }} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors"
                            data-note="This deletes this usage record. It asks twice to make sure you really want to. When you confirm, the amount that was used is given BACK to the batch and material, so your stock is restored automatically. Use it when a usage was recorded by mistake.">
                            <TrashBinIcon className="w-3.5 h-3.5 mr-1" /> Delete
                          </button>
                        </div>
                      </TableCell>
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
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{editingMaterial ? "Edit Material" : "Add Material"}</h3>
              <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-note="This closes the form WITHOUT saving anything. Whatever you typed in here will be thrown away, so only click it if you want to stop and start over."><CloseIcon className="size-5" /></button>
            </div>
            <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <Input placeholder="e.g. Film rolls, Chlorine, Nylon bags..." value={name} onChange={(e) => setName(e.target.value)} required
                    data-note="This is the name of the material, like 'Film roll' or 'Chlorine'. Make it clear so anyone can find it later. This box is required — the material cannot be saved without a name." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <Input list="category-options" placeholder="e.g. chemical, nylon..." value={category} onChange={(e) => setCategory(e.target.value)}
                    data-note="This groups your material into a category so you can filter later, for example 'Chemical', 'Packaging' or 'Filter'. You can type any category you like, or pick one from the suggestions." />
                  <datalist id="category-options">
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Unit *</label>
                  <Input placeholder="e.g. kg" value={unit} onChange={(e) => setUnit(e.target.value)} required
                    data-note="This is the main unit you measure this material in, like 'kg' for kilograms or 'litres'. Everything in stock is counted in this unit. This box is required." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary Unit</label>
                  <Input placeholder="e.g. rolls, pieces" value={secondaryUnit} onChange={(e) => setSecondaryUnit(e.target.value)}
                    data-note="This is an optional extra unit, like 'rolls' or 'pieces'. It is useful when a delivery comes in one unit (kg) but you use it in another (rolls). You can also set up the exact conversion later on each delivery." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Units (configurable list)</label>
                <div className="flex gap-2">
                  <form onSubmit={(e) => { e.preventDefault(); addUnit(); }} className="flex gap-2 flex-1"
                    data-note="This is a list of ALL the units this material can be measured in (like kg, bags, cartons). Type a unit into the box and press the Add button or the Enter key to add it. You can remove a unit later by clicking the little x on it.">
                    <Input placeholder="Add a unit and press enter..." value={draftUnit}
                      onChange={(e) => setDraftUnit(e.target.value)} />
                    <Button type="submit" variant="outline" size="sm">Add</Button>
                  </form>
                </div>
                {units.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {units.map((u) => (
                      <span key={u} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                        {u}
                        <button type="button" onClick={() => setUnits((prev) => prev.filter((x) => x !== u))} className="text-gray-400 hover:text-red-500" data-note="Click the little x to remove this unit from the list. It only removes it from this material's list of units — it does not delete any stock."><CloseIcon className="size-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost (₦)</label>
                  <Input type="number" placeholder="0" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))}
                    data-note="This is what one unit of this material roughly costs you in naira. It is used as a default price when a new delivery arrives. You can still type a different price on each delivery." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock</label>
                  <Input type="number" placeholder="0" value={minimumStock} onChange={(e) => setMinimumStock(Number(e.target.value))}
                    data-note="This is the smallest amount you want to keep before you re-order. When stock drops below this number, the material shows as 'Low Stock' on the list and in the notifications. Put 0 if you don't want any warning." />
                </div>
              </div>

              {/* Custom columns */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-800 dark:text-white/90">Custom Columns (computed from batches)</label>
                  <span className="text-xs text-gray-400">Add / edit / delete formulas</span>
                </div>
                {customFields.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {customFields.map((cf, i) => (
                      <div key={cf.key} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{cf.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{cf.formula}</p>
                        </div>
                        <span className="text-[10px] uppercase text-gray-400">{cf.format}</span>
                        <button type="button" onClick={() => { setCfEditing(i); setCfDraft(cf); }} className="text-blue-500 hover:text-blue-700 dark:text-blue-400"
                          data-note="Click the pencil to change this custom column — you can rename it, edit its formula, or change how the number is shown."><PencilIcon className="size-4" /></button>
                        <button type="button" onClick={() => setCustomFields((prev) => prev.filter((_, x) => x !== i))} className="text-red-500 hover:text-red-700"
                          data-note="Click the bin to remove this custom column. It only removes the column — none of your stock is changed."><TrashBinIcon className="size-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {cfEditing === -1 && (
                  <Button type="button" variant="outline" size="sm" startIcon={<PlusIcon />} onClick={() => { setCfEditing(-2); setCfDraft({ key: "", label: "", formula: "", format: "number" }); setCfError(""); }}
                    data-note="This adds a custom column that is calculated automatically from each batch — for example 'cost per roll'. You give it a name, pick how the number is shown, and write a small formula using the buttons below.">
                    Add custom column
                  </Button>
                )}
                {(cfEditing === -2 || cfEditing >= 0) && (
                  <div className="space-y-3 mt-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Label *</label>
                        <Input placeholder="e.g. Cost per roll" value={cfDraft.label} onChange={(e) => setCfDraft({ ...cfDraft, label: e.target.value })} data-note="The name of the custom column, exactly as it should appear at the top of the table, like 'Cost per roll'." />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Format</label>
                        <Select
                          options={[
                            { value: "number", label: "Number" },
                            { value: "currency", label: "Currency (₦)" },
                            { value: "percentage", label: "Percentage (%)" },
                            { value: "text", label: "Text (raw formula)" },
                          ]}
                          value={cfDraft.format}
                          onChange={(v) => setCfDraft({ ...cfDraft, format: v as CustomField["format"] })}
                          data-note="This decides how the column's number is shown — as a plain number, as naira currency, as a percentage, or as plain text." />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Formula *</label>
                      <Input placeholder="e.g. unitPrice * itemCount / receivedQuantity" value={cfDraft.formula}
                        onChange={(e) => setCfDraft({ ...cfDraft, formula: e.target.value })}
                        data-note="This is the calculation the column does, using batch numbers like unitPrice, itemCount and receivedQuantity. Click the little grey buttons under it to build the formula without typing. A preview shows below whether it is valid." />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {BATCH_FORMULA_TOKENS.map((t) => (
                          <button key={t.token} type="button" title={t.label}
                            onClick={() => setCfDraft((d) => ({ ...d, formula: `${d.formula}${d.formula ? " " : ""}${t.token}` }))}
                            className="px-2 py-0.5 text-[10px] font-mono rounded bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-brand-500/10"
                            data-note={`Adds the batch value '${t.token}' (${t.label}) into the formula.`}>
                            {t.token}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {["+", "-", "*", "/", "%", "(", ")"].map((op) => (
                          <button key={op} type="button"
                            onClick={() => setCfDraft((d) => ({ ...d, formula: `${d.formula} ${op}` }))}
                            className="px-2 py-0.5 text-[10px] font-mono rounded bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-gray-800 dark:text-gray-300"
                            data-note={`Adds the math sign '${op}' to the formula. + adds, - subtracts, * multiplies, / divides, % shows a percentage, and ( ) group parts together.`}>
                            {op}
                          </button>
                        ))}
                        <span className="text-[10px] text-gray-400 self-center">Percentages: e.g. <span className="font-mono">paidAmount / totalCost * 100</span></span>
                      </div>
                    </div>
                    {(() => {
                      const sample = editingMaterial
                        ? batches.find((b) => b.rawMaterialId._id === editingMaterial._id)
                        : undefined;
                      const val = isValidFormula(cfDraft.formula) && sample
                        ? formatFieldValue(evaluateFormula(cfDraft.formula, batchCtx(sample)), cfDraft.format)
                        : cfDraft.format === "text"
                          ? cfDraft.formula || "—"
                          : isValidFormula(cfDraft.formula)
                            ? "no batch to preview"
                            : "invalid formula";
                      return (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Preview: <span className="font-medium text-gray-800 dark:text-white/90">{val}</span>
                        </p>
                      );
                    })()}
                    {cfError && <p className="text-xs text-red-500">{cfError}</p>}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="primary" onClick={saveCustomField}
                        data-note="This saves the custom column (or keeps your changes if you were editing one). The column will then appear in the Batches table, calculated for every batch.">
                        {cfEditing >= 0 ? "Update Column" : "Save Column"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => { setCfEditing(-1); setCfDraft({ key: "", label: "", formula: "", format: "number" }); setCfError(""); }}
                        data-note="This stops editing the custom column and hides the form without saving it.">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={notes} onChange={setNotes} rows={2}
                  data-note="A place to write anything extra about this material, like where you buy it from or how it is packed. Not required — leave it empty if there is nothing to say." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowAddModal(false); resetAddForm(); }} disabled={submitting}
                  data-note="Closes the form without saving anything you typed. Only use this if you want to start over.">Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}
                  data-note="This saves the material. After saving, it appears in the Materials list and you can start receiving stock for it. The form closes when it is done.">{submitting ? "Saving..." : editingMaterial ? "Save Changes" : "Add Material"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Batch / Add Stock Modal — stepper */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowBatchModal(false); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-3xl mx-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{editingBatch ? `Edit Batch — ${editingBatch.batchNumber}` : "Add Stock / New Batch"}</h3>
              <button onClick={() => { if (!submitting) setShowBatchModal(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-note="This closes the form WITHOUT saving. Everything you typed in this delivery is thrown away. Use it to stop and start over."><CloseIcon className="size-5" /></button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-1 px-6 pt-4 pb-2 overflow-x-auto"
              data-note="This is the progress line — each step is one part of recording a delivery. You can click any green (already done) step to jump back and change it. You must finish every step to add the stock.">
              {BATCH_STEPS.map((s, i) => (
                <button key={s.label} type="button" onClick={() => { if (i < batchStep) setBatchStep(i); }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    i === batchStep
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : i < batchStep
                        ? "text-success-600 dark:text-success-400 hover:bg-gray-50 dark:hover:bg-white/5"
                        : "text-gray-400"
                  }`}>
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                    i === batchStep
                      ? "bg-brand-500 text-white"
                      : i < batchStep
                        ? "bg-success-500 text-white"
                        : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}>{i + 1}</span>
                  {s.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleNewBatch} className="p-6 pt-2 space-y-5">
              {/* Step 0 — Material */}
              {batchStep === 0 && (
                <div>
                  {editingBatch ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material (fixed — cannot change on edit)</label>
                      <Input value={editingBatch.rawMaterialId.name} disabled />
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mb-3">
                        <button type="button" onClick={() => setBatchMaterialMode("existing")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${batchMaterialMode === "existing" ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}
                          data-note="Choose this if the material is already in your list. You'll then pick it from a dropdown below. This is the normal choice for repeat deliveries.">
                          Existing Material
                        </button>
                        <button type="button" onClick={() => setBatchMaterialMode("new")}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${batchMaterialMode === "new" ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}
                          data-note="Choose this if you are receiving a material you've never had before. A few boxes appear where you type its name, category and units. It creates the material AND records this delivery in one go.">
                          New Material
                        </button>
                      </div>
                      {batchMaterialMode === "existing" ? (
                        <Select options={materialOptions} placeholder="Select material..." value={batchMaterialId} onChange={setBatchMaterialId}
                          data-note="Pick which material this delivery is for. Only materials you have already created appear here." />
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material Name *</label>
                            <Input placeholder="e.g. film roll" value={newName} onChange={(e) => setNewName(e.target.value)} data-note="The name of the new material you are receiving, like 'film roll' or 'chlorine'." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <Input list="category-options-new" placeholder="e.g. packaging" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} data-note="What group this new material belongs to, like Packaging or Chemical. Used for filtering later." />
                            <datalist id="category-options-new">
                              {CATEGORIES.map((c) => <option key={c.value} value={c.value} />)}
                            </datalist>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Unit *</label>
                            <Input placeholder="e.g. kg" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} data-note="The main unit for this new material, like 'kg'. This is how its stock will be counted." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary Unit</label>
                            <Input placeholder="e.g. rolls" value={newSecondaryUnit} onChange={(e) => setNewSecondaryUnit(e.target.value)} data-note="An optional second unit, like 'rolls' or 'pieces', useful when you consume by items." />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Units <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                            <Input placeholder="e.g. bag, carton" value={newUnits} onChange={(e) => setNewUnits(e.target.value)} data-note="Any extra units separated by commas, like 'bag, carton'. Optional." />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 1 — Supplier */}
              {batchStep === 1 && (
                <div>
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => setBatchSupplierMode("existing")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${batchSupplierMode === "existing" ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}
                      data-note="Choose this if you already have the supplier in your list — you'll pick them from a dropdown. Use this for suppliers you buy from regularly.">
                      Regular Supplier
                    </button>
                    <button type="button" onClick={() => setBatchSupplierMode("other")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${batchSupplierMode === "other" ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}
                      data-note="Choose this for a one-time seller you don't buy from regularly. You just type their name — they won't be added to your supplier list.">
                      One-off / Other
                    </button>
                  </div>
                  {batchSupplierMode === "existing" ? (
                    <Select options={[{ value: "", label: "Select supplier..." }, ...supplierOptions]} value={batchSupplierId} onChange={setBatchSupplierId}
                      data-note="Pick who you bought this delivery from." />
                  ) : (
                    <Input placeholder="Supplier name (won't be added to supplier list)" value={batchSupplierName} onChange={(e) => setBatchSupplierName(e.target.value)}
                      data-note="Type the name of the one-time seller here, exactly how you want it to appear on the delivery." />
                  )}
                </div>
              )}

              {/* Step 2 — Batch & Quantity */}
              {batchStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordered Quantity (optional)</label>
                      <Input type="number" placeholder="0" value={recOrderedQty} onChange={(e) => setRecOrderedQty(Number(e.target.value))}
                        data-note="How much you ordered from the supplier. This is optional — if you didn't order a set amount, just leave it at 0." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Received *</label>
                      <Input type="number" placeholder="0" value={recQty} onChange={(e) => setRecQty(Number(e.target.value))}
                        data-note="How much actually arrived at your place. This is the important number — THIS is how much stock gets added. Required." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
                    <Input list="rec-unit-options" placeholder="kg, litres, rolls..." value={recUnit} onChange={(e) => setRecUnit(e.target.value)}
                      data-note="Which unit the received quantity is in — kg, litres, rolls, etc. Pick the material's base unit so the stock counts correctly." />
                    {(() => {
                      const m = materials.find((x) => x._id === batchMaterialId);
                      const opts = [...new Set([m?.unit, m?.secondaryUnit, ...(m?.units || [])].filter(Boolean))] as string[];
                      return opts.length > 0 ? (
                        <datalist id="rec-unit-options">{opts.map((u) => <option key={u} value={u} />)}</datalist>
                      ) : null;
                    })()}
                    <p className="text-xs text-gray-400 mt-1">Each purchase creates a unique batch — the received quantity is this batch&apos;s stock.</p>
                  </div>
                </div>
              )}

              {/* Step 3 — Conversion */}
              {batchStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Count (optional)</label>
                      <Input type="number" placeholder="e.g. 50" value={recItemCount} onChange={(e) => setRecItemCount(Number(e.target.value))}
                        data-note="If this delivery comes in small items (like 50 rolls in one big roll of film), type how many items are inside. Leave 0 if there are no items." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Unit (optional)</label>
                      <Input list="rec-item-unit-options" placeholder="e.g. rolls" value={recItemUnit} onChange={(e) => setRecItemUnit(e.target.value)}
                        data-note="The name of the small item, like 'rolls' or 'pieces'. Only fill this if you typed an item count." />
                      {(() => {
                        const m = materials.find((x) => x._id === batchMaterialId);
                        const opts = [...new Set([m?.secondaryUnit, ...(m?.units || [])].filter(Boolean))] as string[];
                        return opts.length > 0 ? (
                          <datalist id="rec-item-unit-options">{opts.map((u) => <option key={u} value={u} />)}</datalist>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  {recQty > 0 && recItemCount > 0 && recItemUnit ? (
                    <div className="bg-brand-50 dark:bg-brand-500/10 rounded-lg px-3 py-2 text-xs text-brand-700 dark:text-brand-400">
                      Conversion rate (this batch only): {recQty} {recUnit || "unit"} ≈ {recItemCount} {recItemUnit}
                      <span className="block text-[11px] opacity-80 mt-0.5">
                        {(recQty / recItemCount).toLocaleString(undefined, { maximumFractionDigits: 4 })} {recUnit}/{recItemUnit} · {(recItemCount / recQty).toLocaleString(undefined, { maximumFractionDigits: 2 })} {recItemUnit}/{recUnit}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Optional — set when this batch can be consumed by items (e.g. 10.5 kg ≈ 50 rolls). Conversion rates are per-batch and can differ between purchases.</p>
                  )}
                </div>
              )}

              {/* Step 4 — Cost */}
              {batchStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦ per {recUnit || "unit"})</label>
                    <Input type="number" placeholder="0" value={recUnitPrice} onChange={(e) => setRecUnitPrice(Number(e.target.value))}
                      data-note="How much you paid for ONE unit (per kg, per litre, per roll...). The total is worked out for you below. This number is used to value your stock." />
                  </div>
                  {suggestedTotal > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Suggested total</span>
                      <span className="font-semibold text-gray-800 dark:text-white/90">
                        ₦{suggestedTotal.toLocaleString()} <span className="text-xs font-normal text-gray-400">({recQty} × ₦{recUnitPrice.toLocaleString()})</span>
                      </span>
                    </div>
                  )}
                  {recItemCount > 0 && recUnitPrice > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ≈ ₦{(recUnitPrice * recQty / recItemCount).toLocaleString(undefined, { maximumFractionDigits: 2 })} per {recItemUnit}
                    </p>
                  )}
                </div>
              )}

              {/* Step 5 — Payment */}
              {batchStep === 5 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Paid (₦)</label>
                      <Input type="number" placeholder="0" value={recPaid} onChange={(e) => setRecPaid(Number(e.target.value))}
                        data-note="How much of the money you have ALREADY paid the supplier for this delivery. If you paid nothing yet, leave it at 0." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Left / Owed (₦)</label>
                      <Input type="number" placeholder="0" value={recOwed} onChange={(e) => setRecOwed(Number(e.target.value))}
                        data-note="How much you STILL owe the supplier for this delivery. The suggested amount appears in the text below — copy that number in so your debts are tracked correctly." />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {suggestedOwed > 0
                      ? <>Suggested amount left: <strong className="text-red-600">₦{suggestedOwed.toLocaleString()}</strong> — enter the actual figure you still owe.</>
                      : suggestedTotal > 0 ? "Suggested amount left is ₦0 (fully covered by amount paid)." : "Enter payment amounts to set the payment status."}
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    Payment status: <strong>{recOwed <= 0 && (recPaid > 0 || suggestedTotal > 0) ? "Paid" : recPaid > 0 ? "Partial" : "Unpaid"}</strong>
                  </div>
                </div>
              )}

              {/* Step 6 — Delivery */}
              {batchStep === 6 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
                      <Select options={[{ value: "factory", label: "Factory" }, { value: "depot", label: "Depot" }]} value={recLocationType} onChange={setRecLocationType}
                        data-note="Where did the delivery go — a Factory or a Depot? Choose the kind of place first, then pick the exact one in the next box." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivered To *</label>
                      <Select options={locationOptions} placeholder="Select location" value={recLocationId} onChange={handleLocationChange}
                        data-note="Pick the exact factory or depot the delivery was brought to. The stock is added to THIS location. Required." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Received Date</label>
                    <Input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)}
                      data-note="The day the delivery arrived. This is the date shown on the batch. If you're recording an old delivery, set its real date here." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order / Supplier Notes</label>
                      <TextArea placeholder="Order details, deals, follow-ups..." value={recOrderNotes} onChange={setRecOrderNotes} rows={2}
                        data-note="Anything worth remembering about this order — deals, follow-ups, who to contact. Optional." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quality Notes</label>
                      <TextArea placeholder="Condition, expiry, specs..." value={recQualityNotes} onChange={setRecQualityNotes} rows={2}
                        data-note="Notes about the quality of what arrived — condition, expiry dates, any problems. Optional but useful later." />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7 — Review */}
              {batchStep === 7 && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <p className="text-gray-500 dark:text-gray-400">Material</p>
                    <p className="font-medium text-gray-800 dark:text-white/90 text-right">
                      {editingBatch ? editingBatch.rawMaterialId.name : batchMaterialMode === "new" ? newName : materials.find((m) => m._id === batchMaterialId)?.name || "—"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">Supplier</p>
                    <p className="font-medium text-gray-800 dark:text-white/90 text-right">
                      {batchSupplierMode === "existing"
                        ? suppliers.find((s) => s.value === batchSupplierId)?.label || "—"
                        : batchSupplierName || "—"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">Batch quantity</p>
                    <p className="font-medium text-gray-800 dark:text-white/90 text-right">
                      {(recOrderedQty || recQty).toLocaleString()} ordered · <strong>{recQty.toLocaleString()} {recUnit}</strong> received
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">Conversion</p>
                    <p className="font-medium text-gray-800 dark:text-white/90 text-right">
                      {recItemCount > 0 && recItemUnit ? `${recQty} ${recUnit} ≈ ${recItemCount} ${recItemUnit}` : "—"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">Unit price / total</p>
                    <p className="font-medium text-gray-800 dark:text-white/90 text-right">₦{recUnitPrice.toLocaleString()} · ₦{suggestedTotal.toLocaleString()}</p>
                    <p className="text-gray-500 dark:text-gray-400">Payment</p>
                    <p className="font-medium text-gray-800 dark:text-white/90 text-right">
                      ₦{recPaid.toLocaleString()} paid · <span className="text-red-600">₦{recOwed.toLocaleString()} owed</span>
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">Delivered to</p>
                    <p className="font-medium text-gray-800 dark:text-white/90 text-right">{locationOptions.find((l) => l.value === recLocationId)?.label || "—"} · {formatDate(recDate)}</p>
                  </div>
                  <p className="text-xs text-gray-400">On save, a unique batch number is generated and stock is added to the selected location. Stock shown in the Materials list is recomputed from all batches.</p>
                </div>
              )}

              <div className="flex justify-between items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowBatchModal(false)} disabled={submitting}
                    data-note="Closes the form without saving. Everything typed for this delivery is discarded.">Cancel</Button>
                  {batchStep > 0 && (
                    <Button variant="outline" size="sm" onClick={goBatchBack} disabled={submitting}
                      data-note="Goes back one step so you can change what you entered before. Nothing is lost by going back.">Back</Button>
                  )}
                </div>
                {batchStep < BATCH_STEPS.length - 1 ? (
                  <Button variant="primary" size="sm" onClick={goBatchNext} disabled={submitting}
                    data-note="Moves to the next step. If you missed something important, it will tell you what to fix before moving on.">Next</Button>
                ) : (
                  <Button type="submit" variant="primary" size="sm" disabled={submitting}
                    data-note="This is the FINAL button — it saves the delivery. A unique batch number is created and the quantity is added to the stock of the location you picked. Double-check the review details above before you click it.">
                    {submitting ? "Saving..." : editingBatch ? "Save Changes" : "Add to Stock"}
                  </Button>
                )}
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
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{editingUsage ? "Edit Usage" : "Use Stock"}</h3>
              <button onClick={() => { if (!submitting) setShowUseModal(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-note="Closes this form without using any stock. Nothing is taken out."><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
                <Select
                  options={[{ value: "", label: "Select material with stock..." }, ...useMaterialOptions]}
                  value={useMaterialId}
                  onChange={(v) => { setUseMaterialId(v); setUseBatchId(""); }}
                  data-note="Pick which material you are taking out. Only materials that still have stock can be chosen. After picking, choose the exact batch below."
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
                        label: `${b.batchNumber} — ${(b.availableQuantity ?? 0).toLocaleString()} ${b.unit || ""} left${b.itemUnit && (b.itemCount ?? 0) > 0 ? ` · ${Math.max(0, (b.itemCount ?? 0) - (b.itemConsumed ?? 0)).toLocaleString()} ${b.itemUnit} left` : ""} · ₦${(b.unitPrice ?? 0).toLocaleString()}/${b.unit || ""} · ${b.supplierId ? b.supplierId.name : b.supplierName || "supplier"}`,
                      })),
                    ]}
                    value={useBatchId}
                    onChange={setUseBatchId}
                    data-note="Choose WHICH delivery (batch) the material comes out of. Each delivery is tracked separately, so you decide which one to reduce. The label shows how much is left in each batch."
                  />
                </div>
              )}
              {selectedBatch && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-gray-800 dark:text-white/90">{selectedBatch.batchNumber} — {selectedBatch.rawMaterialId.name}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    Available: <strong>{(selectedBatch.availableQuantity ?? 0).toLocaleString()}</strong> {selectedBatch.unit || ""}
                    {selectedBatch.itemUnit && itemAvailable(selectedBatch) > 0 && (
                      <> · <strong>{itemAvailable(selectedBatch).toLocaleString()}</strong> {selectedBatch.itemUnit} left</>
                    )}
                  </p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity to Use *</label>
                  {selectedBatch && selectedBatch.itemUnit && (selectedBatch.itemCount ?? 0) > 0 && (
                    <div className="flex gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs"
                      data-note="These two little buttons choose HOW you count the amount — in the big unit (like kg) or in the small items (like rolls). The system converts between them automatically.">
                      <button type="button" onClick={() => setUseMode("primary")}
                        className={`px-2 py-1 rounded-md font-medium transition-colors ${useMode === "primary" ? "bg-white dark:bg-gray-700 text-brand-700 dark:text-brand-300 shadow-sm" : "text-gray-500"}`}>
                        {selectedBatch.unit}
                      </button>
                      <button type="button" onClick={() => setUseMode("secondary")}
                        className={`px-2 py-1 rounded-md font-medium transition-colors ${useMode === "secondary" ? "bg-white dark:bg-gray-700 text-brand-700 dark:text-brand-300 shadow-sm" : "text-gray-500"}`}>
                        {selectedBatch.itemUnit}
                      </button>
                    </div>
                  )}
                </div>
                <Input type="number" placeholder="0" value={useQty} onChange={(e) => setUseQty(Number(e.target.value))}
                  data-note="How much of this material you are taking out — in the unit you chose above. The little box under it shows what will be used and how much will remain, so you can check before saving. Required." />
                {useMode === "secondary" && selectedBatch && !selectedBatch.itemUnit && (
                  <p className="text-xs text-amber-600 mt-1">This batch has no item conversion — only {selectedBatch.unit || "the base unit"} is available.</p>
                )}
                {selectedBatch && useQty > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 mt-2 text-xs text-gray-600 dark:text-gray-300">
                    {useMode === "secondary"
                      ? <>Uses <strong>{useQty.toLocaleString()} {selectedBatch.itemUnit}</strong> = <strong>{useConvertedQty.toLocaleString()} {selectedBatch.unit}</strong> · Remaining: {Math.max(0, useRemainingKg - useConvertedQty).toLocaleString()} {selectedBatch.unit} / {Math.max(0, useRemainingItems - useQty).toLocaleString()} {selectedBatch.itemUnit}</>
                      : <>
                          {useQty > selectedBatch.availableQuantity
                            ? <span className="text-red-500">Exceeds batch available ({selectedBatch.availableQuantity.toLocaleString()} {selectedBatch.unit || ""})!</span>
                            : <>Will use <strong>{useQty.toLocaleString()} {selectedBatch.unit}</strong> · Remaining after: {(selectedBatch.availableQuantity - useQty).toLocaleString()} {selectedBatch.unit}{selectedBatch.itemUnit && itemAvailable(selectedBatch) > 0 ? ` / ${itemAvailable(selectedBatch).toLocaleString()} ${selectedBatch.itemUnit}` : ""}</>}
                        </>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <Select options={CONSUMPTION_TYPES} value={useReason} onChange={setUseReason}
                  data-note="Why are you taking this material out? Production (used to make water), Wastage (spoiled or damaged), Adjustment (fixing stock) or Other. This reason is recorded on the usage row so you can filter by it later." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <Input type="date" value={useDate} onChange={(e) => setUseDate(e.target.value)}
                  data-note="The day the material was actually used. If you are recording something from an earlier day, set its real date here so your history is accurate." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <TextArea placeholder="Reason or reference..." value={useNotes} onChange={setUseNotes} rows={2}
                  data-note="A short note about this usage, like which order or machine it went to. Optional — but helpful when you look back at the usage list later." />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => setShowUseModal(false)} disabled={submitting}
                  data-note="Closes the form without using any stock.">Cancel</Button>
                <Button variant="primary" onClick={handleUseStock} disabled={submitting || useQty <= 0 || !useBatchId}
                  data-note={editingUsage
                    ? "This saves your changes. The system puts the old amount back into the batch, takes out the new amount, and updates the usage record — so your stock stays correct."
                    : "This takes the material out of the batch and records the usage. The stock on the material and batch goes down by exactly this amount. This is how you record material being used up."}>
                  {submitting ? "Saving..." : editingUsage ? "Save Changes" : "Use Material"}
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
              <button onClick={() => { setShowMovementModal(false); setMovementTarget(null); setMovements([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-note="Closes this history window. You can always reopen it with the History button on any batch."><CloseIcon className="size-5" /></button>
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
                          {mv.itemUnit && mv.itemQuantity ? <span className="block text-[10px] text-gray-400">{mv.itemQuantity > 0 ? "+" : ""}{mv.itemQuantity.toLocaleString()} {mv.itemUnit}</span> : null}
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

      {/* Delete Material / Batch */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title={deleteTarget?.kind === "batch" ? "Delete Batch" : "Delete Material"}
        message={deleteTarget
          ? deleteTarget.kind === "batch"
            ? `This will permanently delete batch ${deleteTarget.label} and remove its remaining stock. Batches that have been consumed cannot be deleted. This cannot be undone.`
            : `This will permanently delete material "${deleteTarget.label}". Materials that have batches cannot be deleted. This cannot be undone.`
          : ""}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Usage delete — first warning */}
      <ConfirmDialog
        isOpen={usageDeleteStep === 1 && usageDeleteTarget !== null}
        onClose={() => { setUsageDeleteTarget(null); setUsageDeleteStep(0); }}
        onConfirm={() => setUsageDeleteStep(2)}
        title="Delete usage record?"
        message={`This permanently removes the usage row for ${usageDeleteTarget?.rawMaterialId?.name ?? "this material"} (${(usageDeleteTarget?.totalQuantity ?? 0).toLocaleString()} used) and restores the stock back to the batch. A daily backup is emailed for safety.`}
        confirmLabel="Continue"
        variant="danger"
      />

      {/* Usage delete — final confirmation */}
      <ConfirmDialog
        isOpen={usageDeleteStep === 2 && usageDeleteTarget !== null}
        onClose={() => { setUsageDeleteTarget(null); setUsageDeleteStep(0); }}
        onConfirm={doDeleteUsage}
        title="Are you absolutely sure?"
        message={`Deleting this usage record (${usageDeleteTarget?.purpose ?? "consumption"} on ${usageDeleteTarget?.date ? formatDate(usageDeleteTarget.date) : ""}) cannot be undone. The used stock will be restored to the batch and material.`}
        confirmLabel="Yes, delete permanently"
        variant="danger"
      />
    </div>
  );
}
