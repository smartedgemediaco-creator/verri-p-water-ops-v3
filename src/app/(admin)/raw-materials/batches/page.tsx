"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import { formatDate } from "@/lib/dateFormat";

interface Batch {
  _id: string;
  batchNumber: string;
  rawMaterialId: { _id: string; name: string; unit: string; category?: string } | string;
  supplierId: { _id: string; name: string } | null;
  purchaseOrderId: { _id: string; orderNumber: string } | null;
  locationType: string;
  locationId: { _id: string; name: string } | string;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
  itemCount: number;
  itemUnit: string;
  unitPrice: number;
  totalCost: number;
  status: string;
  receivedDate?: string;
  expiryDate?: string;
  availableQuantity: number;
  consumedQuantity: number;
  qualityNotes: string;
  createdAt: string;
}

const statusColors: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  pending: "light",
  "partially-received": "warning",
  received: "success",
  consumed: "info",
  expired: "error",
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [materials, setMaterials] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/raw-materials/batches").then((r) => r.json()),
      fetch("/api/raw-materials").then((r) => r.json()),
    ]).then(([batchData, matData]) => {
      setBatches(Array.isArray(batchData) ? batchData : []);
      if (Array.isArray(matData)) setMaterials(matData.map((m: { _id: string; name: string }) => ({ value: m._id, label: m.name })));
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const matName = typeof b.rawMaterialId === "object" ? b.rawMaterialId.name : "";
      const supplierName = typeof b.supplierId === "object" ? (b.supplierId?.name ?? "") : "";
      const matchSearch = !search || b.batchNumber.toLowerCase().includes(search.toLowerCase()) || matName.toLowerCase().includes(search.toLowerCase()) || supplierName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || b.status === statusFilter;
      const matchMaterial = !materialFilter || (typeof b.rawMaterialId === "object" ? b.rawMaterialId._id : b.rawMaterialId) === materialFilter;
      return matchSearch && matchStatus && matchMaterial;
    });
  }, [batches, search, statusFilter, materialFilter]);

  const totalValue = filtered.reduce((s, b) => s + (b.availableQuantity * b.unitPrice), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Raw Material Batches" />
        <div className="flex gap-3">
          <Link href="/raw-materials/consume">
            <Button variant="outline" size="sm">Consume Material</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Batches</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{filtered.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Available Stock (filtered)</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {filtered.reduce((s, b) => s + b.availableQuantity, 0).toLocaleString()}
          </h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Available Value</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">₦{totalValue.toLocaleString()}</h4>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input placeholder="Search batch number, material, or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-48">
          <Select
            options={[{ value: "", label: "All Statuses" }, { value: "pending", label: "Pending" }, { value: "partially-received", label: "Partial" }, { value: "received", label: "Received" }, { value: "consumed", label: "Consumed" }, { value: "expired", label: "Expired" }]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
        <div className="w-48">
          <Select options={[{ value: "", label: "All Materials" }, ...materials]} value={materialFilter} onChange={setMaterialFilter} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Batch #</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Material</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Received</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Available</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Items</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit Cost</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Value</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 text-sm" colSpan={11}>Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 text-sm" colSpan={11}>{batches.length === 0 ? "No batches yet. Receive goods from a Purchase Order to create batches." : "No batches match your search."}</TableCell></TableRow>
            ) : (
              filtered.map((b) => {
                const mat = typeof b.rawMaterialId === "object" ? b.rawMaterialId : null;
                const supplier = typeof b.supplierId === "object" ? b.supplierId : null;
                const loc = typeof b.locationId === "object" ? b.locationId : null;
                const po = typeof b.purchaseOrderId === "object" ? b.purchaseOrderId : null;
                return (
                  <TableRow key={b._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-2 text-theme-sm font-mono text-blue-600 dark:text-blue-400">
                      {po ? <Link href={`/purchase-orders/${po._id}`} className="hover:underline">{b.batchNumber}</Link> : b.batchNumber}
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm">
                      {mat ? <Link href={`/raw-materials/${mat._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{mat.name}</Link> : "—"}
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">
                      <span className="capitalize">{b.locationType}</span>{loc ? ` — ${loc.name}` : ""}
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{supplier?.name || "—"}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-800 dark:text-white/90">{b.receivedQuantity.toLocaleString()} {b.unit}</TableCell>
                    <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">{b.availableQuantity.toLocaleString()} {b.unit}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">
                      {b.itemCount > 0 ? `${b.itemCount.toLocaleString()} ${b.itemUnit || ""}` : "—"}
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">₦{b.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-800 dark:text-white/90">₦{(b.availableQuantity * b.unitPrice).toLocaleString()}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="light" color={statusColors[b.status] ?? "light"}>{b.status}</Badge>
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{b.receivedDate ? formatDate(b.receivedDate) : "—"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
