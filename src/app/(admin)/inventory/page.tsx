"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableIcon } from "@/icons";
import { WaterDropIcon } from "@/components/icons/EntityIcons";

interface InventoryItem {
  _id: string;
  productId: { _id: string; name: string } | null;
  locationType: string;
  locationId: string;
  quantity: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div>
      <div className="mb-6">
        <PageBreadcrumb pageTitle="Inventory" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-cyan-100 rounded-lg dark:bg-cyan-500/10 mb-3">
            <WaterDropIcon className="text-cyan-600 size-5 dark:text-cyan-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{items.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <WaterDropIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Quantity</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalQuantity.toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <TableIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Locations</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{new Set(items.map((i) => i.locationId)).size}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Product</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location Type</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location Name</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={4}>Loading...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={4}>No inventory records found.</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{item.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{item.locationType}</span>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">{item.locationId}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{item.quantity.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
