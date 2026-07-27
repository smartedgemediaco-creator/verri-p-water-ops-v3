"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { CloseIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";

interface Material {
  _id: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface Location {
  _id: string;
  name: string;
}

interface Batch {
  _id: string;
  batchNumber: string;
  receivedQuantity: number;
  availableQuantity: number;
  unit: string;
  unitPrice: number;
  itemCount: number;
  itemUnit: string;
  receivedDate?: string;
  status: string;
  locationType: string;
  locationId: { _id: string; name: string } | string;
}

interface Allocation {
  batchId: string;
  quantity: number;
  itemCount: number;
}

const PURPOSE_OPTIONS = [
  { value: "production", label: "Production Use" },
  { value: "wastage", label: "Wastage / Damaged" },
  { value: "adjustment", label: "Manual Adjustment" },
  { value: "transfer", label: "Transfer to Another Location" },
  { value: "other", label: "Other" },
];

export default function ConsumeRawMaterialPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [factories, setFactories] = useState<Location[]>([]);
  const [depots, setDepots] = useState<Location[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [locationType, setLocationType] = useState("factory");
  const [locationId, setLocationId] = useState("");
  const [purpose, setPurpose] = useState("production");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/raw-materials").then((r) => r.json()),
      fetch("/api/factories").then((r) => r.json()),
      fetch("/api/depots").then((r) => r.json()),
    ]).then(([matData, factData, depData]) => {
      setMaterials(Array.isArray(matData) ? matData : []);
      setFactories(Array.isArray(factData) ? factData : []);
      setDepots(Array.isArray(depData) ? depData : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMaterial || !locationType || !locationId) { setBatches([]); return; }
    fetch(`/api/raw-materials/batches?rawMaterialId=${selectedMaterial}&locationType=${locationType}&locationId=${locationId}&status=received`)
      .then((r) => r.json())
      .then((data) => setBatches(Array.isArray(data) ? data : []))
      .catch(() => setBatches([]));
  }, [selectedMaterial, locationType, locationId]);

  const totalQuantity = useMemo(() => allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0), [allocations]);
  const totalCost = useMemo(() => {
    return allocations.reduce((s, a) => {
      const batch = batches.find((b) => b._id === a.batchId);
      return s + (Number(a.quantity) || 0) * (batch?.unitPrice || 0);
    }, 0);
  }, [allocations, batches]);

  const addAllocation = () => {
    setAllocations([...allocations, { batchId: "", quantity: 0, itemCount: 0 }]);
  };

  const updateAllocation = (index: number, field: keyof Allocation, value: string | number) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const getBatchAvailable = (batchId: string) => batches.find((b) => b._id === batchId)?.availableQuantity ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) { showError("Select a material"); return; }
    if (!locationId) { showError("Select a location"); return; }
    if (allocations.length === 0) { showError("Add at least one batch allocation"); return; }

    const invalid = allocations.find((a) => !a.batchId || a.quantity <= 0);
    if (invalid) { showError("Each allocation must have a batch and quantity > 0"); return; }

    const overAlloc = allocations.find((a) => a.quantity > getBatchAvailable(a.batchId));
    if (overAlloc) { showError(`Quantity exceeds available stock for batch`); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/raw-materials/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMaterialId: selectedMaterial,
          locationType,
          locationId,
          purpose,
          date,
          notes,
          allocations: allocations.map((a) => ({
            batchId: a.batchId,
            quantity: Number(a.quantity),
            itemCount: Number(a.itemCount) || 0,
          })),
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Consumption recorded successfully");
      router.push("/raw-materials");
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const locationOptions = locationType === "factory"
    ? factories.map((f) => ({ value: f._id, label: f.name }))
    : depots.map((d) => ({ value: d._id, label: d.name }));

  const availableBatches = batches.filter((b) => b.availableQuantity > 0);
  const selectedMaterialObj = materials.find((m) => m._id === selectedMaterial);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Consume Raw Material" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm mb-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material *</label>
              <Select
                options={materials.map((m) => ({ value: m._id, label: `${m.name} (${m.currentStock.toLocaleString()} ${m.unit} available)` }))}
                value={selectedMaterial}
                onChange={setSelectedMaterial}
                placeholder="Select material"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type *</label>
              <Select
                options={[{ value: "factory", label: "Factory" }, { value: "depot", label: "Depot" }]}
                value={locationType}
                onChange={(v) => { setLocationType(v); setLocationId(""); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
              <Select options={[{ value: "", label: "Select location" }, ...locationOptions]} value={locationId} onChange={setLocationId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose *</label>
              <Select options={PURPOSE_OPTIONS} value={purpose} onChange={setPurpose} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <Input placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Batch Allocations
              {selectedMaterialObj && <span className="ml-2 text-xs text-gray-400 font-normal">({selectedMaterialObj.unit})</span>}
            </h3>
            <Button type="button" size="sm" variant="outline" startIcon={<PlusIcon />} onClick={addAllocation} disabled={!selectedMaterial || !locationId}>
              Add Batch
            </Button>
          </div>

          {allocations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {selectedMaterial && locationId
                ? "Click \"Add Batch\" to select which batches to consume from."
                : "Select a material and location first, then add batch allocations."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Batch</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Available</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Qty to Use *</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Item Count</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit Cost</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Subtotal</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"> </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((alloc, i) => {
                  const batch = batches.find((b) => b._id === alloc.batchId);
                  const maxQty = alloc.batchId ? getBatchAvailable(alloc.batchId) : 0;
                  const isOver = (Number(alloc.quantity) || 0) > maxQty && maxQty > 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="py-2">
                        <select
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-800 dark:text-white/90"
                          value={alloc.batchId}
                          onChange={(e) => updateAllocation(i, "batchId", e.target.value)}
                        >
                          <option value="">Select batch</option>
                          {availableBatches.map((b) => (
                            <option key={b._id} value={b._id} disabled={allocations.some((a, j) => j !== i && a.batchId === b._id)}>
                              {b.batchNumber} — {b.availableQuantity} {b.unit} @ ₦{b.unitPrice.toLocaleString()}/kg
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">
                        {batch ? `${batch.availableQuantity.toLocaleString()} ${batch.unit}` : "—"}
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          value={alloc.quantity}
                          onChange={(e) => updateAllocation(i, "quantity", Number(e.target.value))}
                          className={isOver ? "!border-red-500" : ""}
                        />
                        {isOver && <p className="text-xs text-red-500 mt-1">Max: {maxQty}</p>}
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          value={alloc.itemCount}
                          onChange={(e) => updateAllocation(i, "itemCount", Number(e.target.value))}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">
                        {batch ? `₦${batch.unitPrice.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {batch ? `₦${((Number(alloc.quantity) || 0) * batch.unitPrice).toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="py-2">
                        <button type="button" onClick={() => removeAllocation(i)} className="text-red-500 hover:text-red-700">
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {allocations.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-6 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total: <strong className="text-gray-800 dark:text-white/90">{totalQuantity.toLocaleString()} {selectedMaterialObj?.unit || ""}</strong></span>
              <span className="text-gray-500 dark:text-gray-400">Cost: <strong className="text-gray-800 dark:text-white/90">₦{totalCost.toLocaleString()}</strong></span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting || allocations.length === 0}>
            {submitting ? "Saving..." : "Record Consumption"}
          </Button>
        </div>
      </form>
    </div>
  );
}
