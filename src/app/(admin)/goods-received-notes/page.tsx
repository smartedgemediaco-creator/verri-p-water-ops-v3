"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { ListIcon, GroupIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface RawMaterialRef {
  _id: string;
  name: string;
  unit: string;
}

interface GRNItem {
  rawMaterialId?: RawMaterialRef;
  itemName?: string;
  quantityReceived: number;
  quantityOrdered: number;
  condition: "good" | "damaged" | "partial";
}

interface SupplierRef {
  _id: string;
  name: string;
}

interface PORef {
  _id: string;
  orderNumber: string;
  supplierId?: SupplierRef;
  supplierName?: string;
}

interface GoodsReceivedNote {
  _id: string;
  purchaseOrderId: PORef;
  receivedDate: string;
  items: GRNItem[];
  receivedBy: string;
  notes: string;
}

export default function GoodsReceivedNotesPage() {
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [poList, setPoList] = useState<{ _id: string; orderNumber: string }[]>([]);
  const [rmList, setRmList] = useState<{ _id: string; name: string; unit: string }[]>([]);
  const [grnForm, setGrnForm] = useState({ purchaseOrderId: "", receivedDate: new Date().toISOString().split("T")[0], receivedBy: "", notes: "", items: [{ rawMaterialId: "", itemName: "", quantityReceived: 1, quantityOrdered: 1, condition: "good" as const }] });
  const { ref, loading: pdfLoading, download } = usePdfDownload("goods-received-list", { title: "Goods Received Notes" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchPoList = () => {
    fetch("/api/purchase-orders").then((r) => r.json()).then((data) => setPoList(Array.isArray(data) ? data : [])).catch(() => {});
  };
  const fetchRmList = () => {
    fetch("/api/raw-materials").then((r) => r.json()).then((data) => setRmList(Array.isArray(data) ? data : [])).catch(() => {});
  };

  useEffect(() => {
    fetchPoList();
    fetchRmList();
  }, []);

  const handleNewGrn = async () => {
    if (!grnForm.purchaseOrderId) { showError("Select a purchase order"); return; }
    setFormSaving(true);
    try {
      const res = await fetch("/api/goods-received-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: grnForm.purchaseOrderId,
          receivedDate: grnForm.receivedDate || undefined,
          receivedBy: grnForm.receivedBy,
          notes: grnForm.notes,
          items: grnForm.items.filter((i) => (i.rawMaterialId || i.itemName) && i.quantityReceived > 0),
        }),
      });
      if (!res.ok) { showError("Failed to create GRN"); return; }
      showSuccess("Goods received note created");
      setShowForm(false);
      setGrnForm({ purchaseOrderId: "", receivedDate: new Date().toISOString().split("T")[0], receivedBy: "", notes: "", items: [{ rawMaterialId: "", itemName: "", quantityReceived: 1, quantityOrdered: 1, condition: "good" as const }] });
      fetchGrns();
    } catch { showError("Network error"); }
    finally { setFormSaving(false); }
  };

  const addGrnItem = () => setGrnForm({ ...grnForm, items: [...grnForm.items, { rawMaterialId: "", itemName: "", quantityReceived: 1, quantityOrdered: 1, condition: "good" as const }] });
  const updateGrnItem = (i: number, field: string, value: string | number) => {
    const items = [...grnForm.items];
    items[i] = { ...items[i], [field]: value };
    setGrnForm({ ...grnForm, items });
  };
  const removeGrnItem = (i: number) => {
    if (grnForm.items.length <= 1) return;
    setGrnForm({ ...grnForm, items: grnForm.items.filter((_, idx) => idx !== i) });
  };

  const fetchGrns = () => {
    setLoading(true);
    fetch("/api/goods-received-notes")
      .then((r) => r.json())
      .then((data) => setGrns(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGrns(); }, []);

  const totalItemsReceived = grns.reduce((sum, g) => sum + (Array.isArray(g.items) ? g.items.length : 0), 0);

  const uniqueSupplierIds = new Set(
    grns
      .map((g) => g.purchaseOrderId?.supplierId?._id)
      .filter(Boolean)
  );

  const getSupplierId = (grn: GoodsReceivedNote): string | null => {
    return grn.purchaseOrderId?.supplierId?._id ?? null;
  };

  const getSupplierName = (grn: GoodsReceivedNote): string => {
    return grn.purchaseOrderId?.supplierId?.name ?? grn.purchaseOrderId?.supplierName ?? "Unknown";
  };

  const getPoNumber = (grn: GoodsReceivedNote): string => {
    return grn.purchaseOrderId?.orderNumber ?? "N/A";
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/goods-received-notes/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to delete"); return; }
      showSuccess("GRN deleted"); setDeleteTarget(null); fetchGrns();
    } catch { showError("Network error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Goods Received Notes" />
        <div className="flex gap-3">
          <Button size="sm" onClick={() => setShowForm(true)}>
            <PlusIcon className="size-4" />
            New GRN
          </Button>
          <Button variant="outline" size="sm" onClick={fetchGrns}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/goods-received-notes" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <ListIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total GRNs</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{grns.length}</h4>
        </Link>
        <Link href="/goods-received-notes" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <ListIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Items Received</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalItemsReceived}</h4>
        </Link>
        <Link href="/goods-received-notes" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <GroupIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Unique Suppliers</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{uniqueSupplierIds.size}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">PO #</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Supplier</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Items</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Received By</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Condition</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : grns.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>No goods received notes found.</TableCell>
              </TableRow>
            ) : (
              grns.map((g) => {
                const items = Array.isArray(g.items) ? g.items : [];
                const firstItem = items[0];
                const remaining = items.length - 1;
                const goodCount = items.filter((i) => i.condition === "good").length;
                const damagedCount = items.filter((i) => i.condition === "damaged").length;
                const partialCount = items.filter((i) => i.condition === "partial").length;

                return (
                  <TableRow key={g._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(g.receivedDate)}</TableCell>
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      <span className="font-mono text-xs">{getPoNumber(g)}</span>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {getSupplierId(g) ? (
                        <Link href={`/suppliers/${getSupplierId(g)}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {getSupplierName(g)}
                        </Link>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>{firstItem?.rawMaterialId?.name ?? firstItem?.itemName ?? "Unknown"}</span>
                        {remaining > 0 && (
                          <Badge variant="light" color="info">+{remaining} more</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{g.receivedBy || <span className="text-gray-400">&mdash;</span>}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {goodCount > 0 && <Badge variant="light" color="success">{goodCount} good</Badge>}
                        {damagedCount > 0 && <Badge variant="light" color="error">{damagedCount} damaged</Badge>}
                        {partialCount > 0 && <Badge variant="light" color="warning">{partialCount} partial</Badge>}
                        {items.length === 0 && <span className="text-gray-400 text-xs">&mdash;</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <button onClick={() => setDeleteTarget(g._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                        <TrashBinIcon className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">New Goods Received Note</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Order</label>
              <select
                value={grnForm.purchaseOrderId}
                onChange={(e) => setGrnForm({ ...grnForm, purchaseOrderId: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="" disabled>Select purchase order</option>
                {poList.map((po) => (
                  <option key={po._id} value={po._id}>{po.orderNumber}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Received Date</label>
              <input
                type="date"
                value={grnForm.receivedDate}
                onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Received By</label>
              <input
                value={grnForm.receivedBy}
                onChange={(e) => setGrnForm({ ...grnForm, receivedBy: e.target.value })}
                placeholder="Name of receiver"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
                <Button size="sm" variant="outline" onClick={addGrnItem}>+ Add Item</Button>
              </div>
              {grnForm.items.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Material</label>
                    <select
                      value={item.rawMaterialId}
                      onChange={(e) => updateGrnItem(i, "rawMaterialId", e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                    >
                      <option value="" disabled>Select</option>
                      {rmList.map((rm) => (
                        <option key={rm._id} value={rm._id}>{rm.name} ({rm.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-gray-500 mb-1">Qty Recv</label>
                    <input
                      type="number"
                      min={0}
                      value={item.quantityReceived}
                      onChange={(e) => updateGrnItem(i, "quantityReceived", Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-gray-500 mb-1">Qty Ord</label>
                    <input
                      type="number"
                      min={0}
                      value={item.quantityOrdered}
                      onChange={(e) => updateGrnItem(i, "quantityOrdered", Number(e.target.value))}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-gray-500 mb-1">Condition</label>
                    <select
                      value={item.condition}
                      onChange={(e) => updateGrnItem(i, "condition", e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                    >
                      <option value="good">Good</option>
                      <option value="partial">Partial</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                  {grnForm.items.length > 1 && (
                    <button
                      onClick={() => removeGrnItem(i)}
                      className="h-10 px-2 text-red-500 hover:text-red-700 text-sm"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={grnForm.notes}
                onChange={(e) => setGrnForm({ ...grnForm, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" disabled={formSaving} onClick={handleNewGrn}>
                {formSaving ? "Saving..." : "Create GRN"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete GRN"
        message="Are you sure you want to delete this goods received note? This action cannot be undone."
      />
    </div>
  );
}
