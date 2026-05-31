"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import { formatDate } from "@/lib/dateFormat";
import { ListIcon, GroupIcon } from "@/icons";

interface RawMaterialRef {
  _id: string;
  name: string;
  unit: string;
}

interface GRNItem {
  rawMaterialId: RawMaterialRef;
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
  supplierId: SupplierRef;
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
    return grn.purchaseOrderId?.supplierId?.name ?? "Unknown";
  };

  const getPoNumber = (grn: GoodsReceivedNote): string => {
    return grn.purchaseOrderId?.orderNumber ?? "N/A";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Goods Received Notes" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={fetchGrns}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : grns.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>No goods received notes found.</TableCell>
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
                        <span>{firstItem?.rawMaterialId?.name ?? "Unknown"}</span>
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
