"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import AutoAmount from "@/components/ui/AutoAmount";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { PlusIcon, CloseIcon } from "@/icons";

interface RawMaterial {
  _id: string; name: string; unit: string; stockUnit: string; conversionRate: number;
  category: string; currentStock: number; minimumStock: number; unitCost: number;
  supplierId: { _id: string; name: string; phone?: string; whatsapp?: string; email?: string } | null;
  totalReceived: number; totalConsumed: number; lastReceivedDate?: string; lastConsumedDate?: string; notes: string;
}

interface StockMovement {
  _id: string; type: string; quantity: number; unit: string; reference: string; notes: string; performedBy: string; createdAt: string;
}

const movementTypeColors: Record<string, string> = {
  purchase: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  consumption: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
  adjustment: "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  waste: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
  return: "bg-theme-pink-50 text-theme-pink-700 dark:bg-theme-pink-500/10 dark:text-theme-pink-400",
  correction: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

const CONSUMPTION_TYPES = [
  { value: "consumption", label: "Production Use" },
  { value: "waste", label: "Waste / Damaged" },
  { value: "adjustment", label: "Manual Adjustment" },
  { value: "return", label: "Return to Supplier" },
];

export default function RawMaterialDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [stockAmount, setStockAmount] = useState(0);
  const [consumeAmount, setConsumeAmount] = useState(0);
  const [consumeType, setConsumeType] = useState("consumption");
  const [consumeNotes, setConsumeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/raw-materials/${id}`).then((r) => r.json()),
      fetch(`/api/raw-materials/${id}/movements?limit=50`).then((r) => r.json()),
    ]).then(([mat, mvmts]) => {
      setMaterial(mat);
      setMovements(Array.isArray(mvmts) ? mvmts : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const handleAddStock = async () => {
    if (stockAmount <= 0) { showError("Enter a valid quantity"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${id}/stock`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: stockAmount }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Stock added"); setShowStockModal(false); setStockAmount(0); fetchData();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  const handleConsume = async () => {
    if (consumeAmount <= 0) { showError("Enter a valid quantity"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raw-materials/${id}/consume`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: consumeAmount, type: consumeType, notes: consumeNotes }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Consumption recorded"); setShowConsumeModal(false);
      setConsumeAmount(0); setConsumeType("consumption"); setConsumeNotes(""); fetchData();
    } catch { showError("Network error"); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!material) return <div className="p-8 text-center text-gray-500">Material not found.</div>;

  const isLow = material.minimumStock > 0 && material.currentStock < material.minimumStock;
  const isOut = material.currentStock <= 0;
  const supplier = material.supplierId;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={material.name} />
        <div className="flex gap-3">
          {supplier?.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${supplier!.phone}`, "_self")}>📞 Call Supplier</Button>}
          {supplier?.whatsapp && <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${supplier!.whatsapp!.replace(/[^0-9]/g, "")}`, "_blank")}>💬 WhatsApp</Button>}
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => { setStockAmount(0); setShowStockModal(true); }}>Add Stock</Button>
          <Button variant="outline" size="sm" onClick={() => { setConsumeAmount(0); setConsumeType("consumption"); setConsumeNotes(""); setShowConsumeModal(true); }}>Record Consumption</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">{material.currentStock.toLocaleString()} <span className="text-sm font-normal text-gray-400">{material.unit}</span></h4>
          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${isOut ? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400" : isLow ? "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" : "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"}`}>
            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Minimum Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">{material.minimumStock.toLocaleString()} <span className="text-sm font-normal text-gray-400">{material.unit}</span></h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Received</p>
          <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">{(material.totalReceived ?? 0).toLocaleString()}</h4>
          {material.lastReceivedDate && <p className="text-xs text-gray-400 mt-1">Last: {formatDate(material.lastReceivedDate)}</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Consumed</p>
          <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">{(material.totalConsumed ?? 0).toLocaleString()}</h4>
          {material.lastConsumedDate && <p className="text-xs text-gray-400 mt-1">Last: {formatDate(material.lastConsumedDate)}</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Stock Value</p>
          <AutoAmount value={`₦${(material.currentStock * material.unitCost).toLocaleString()}`} />
          <p className="text-xs text-gray-400 mt-1">₦{material.unitCost.toLocaleString()} / {material.unit}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Material Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Category</dt><dd className="text-gray-800 dark:text-white/90 capitalize">{material.category}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Unit</dt><dd className="text-gray-800 dark:text-white/90">{material.unit}</dd></div>
            {material.stockUnit && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Stock Unit</dt><dd className="text-gray-800 dark:text-white/90">{material.stockUnit} ({material.conversionRate} {material.unit}/{material.stockUnit})</dd></div>}
            {supplier && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" />
                <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Supplier</dt><dd><Link href={`/suppliers/${supplier._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{supplier.name}</Link></dd></div>
                {supplier.phone && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone</dt><dd className="text-gray-800 dark:text-white/90">{supplier.phone}</dd></div>}
                {supplier.email && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Email</dt><dd className="text-gray-800 dark:text-white/90">{supplier.email}</dd></div>}
              </>
            )}
            {material.notes && <><div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" /><div><dt className="text-gray-500 dark:text-gray-400 mb-1">Notes</dt><dd className="text-gray-600 dark:text-gray-300">{material.notes}</dd></div></>}
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Stock Movement History</h3>
          </div>
          {movements.length === 0 ? (
            <p className="p-5 text-sm text-gray-500 text-center">No movements recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Reference</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">By</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mv) => (
                  <TableRow key={mv._id}>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(mv.createdAt)}</TableCell>
                    <TableCell className="py-2"><span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${movementTypeColors[mv.type] || ""}`}>{mv.type}</span></TableCell>
                    <TableCell className={`py-2 text-theme-sm font-medium ${mv.quantity > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {mv.quantity > 0 ? "+" : ""}{mv.quantity.toLocaleString()} {mv.unit}
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{mv.reference || "—"}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{mv.performedBy || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowStockModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Add Stock</h3>
              <button onClick={() => setShowStockModal(false)} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity to Add</label>
                <Input type="number" placeholder="0" value={stockAmount} onChange={(e) => setStockAmount(Number(e.target.value))} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowStockModal(false)} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleAddStock} disabled={submitting || stockAmount <= 0}>{submitting ? "Saving..." : "Add Stock"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConsumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowConsumeModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Record Consumption</h3>
              <button onClick={() => setShowConsumeModal(false)} className="text-gray-400 hover:text-gray-600"><CloseIcon className="size-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <p className="text-gray-500 dark:text-gray-400">Available: <strong>{material.currentStock.toLocaleString()}</strong> {material.unit}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <Select options={CONSUMPTION_TYPES} value={consumeType} onChange={setConsumeType} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <Input type="number" placeholder="0" value={consumeAmount} onChange={(e) => setConsumeAmount(Number(e.target.value))} />
                {consumeAmount > 0 && consumeAmount > material.currentStock && <p className="text-xs text-red-500 mt-1">Exceeds available stock!</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <Input placeholder="Reason or reference..." value={consumeNotes} onChange={(e) => setConsumeNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowConsumeModal(false)} disabled={submitting}>Cancel</Button>
                <Button variant="primary" onClick={handleConsume} disabled={submitting || consumeAmount <= 0}>{submitting ? "Saving..." : "Record"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
