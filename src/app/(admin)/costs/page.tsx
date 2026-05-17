"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, ListIcon, DollarLineIcon } from "@/icons";

interface Cost {
  _id: string;
  category: string;
  amount: number;
  description: string;
  locationType: string;
  locationId: string;
  date: string;
}

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/costs")
      .then((res) => res.json())
      .then((data) => setCosts(data))
      .finally(() => setLoading(false));
  }, []);

  const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Costs" />
        <Link href="/costs/new">
          <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
            Record Cost
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <ListIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{costs.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-3">
            <DollarLineIcon className="text-orange-600 size-5 dark:text-orange-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">₦{totalCost.toLocaleString()}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <ListIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{new Set(costs.map((c) => c.category)).size}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Amount</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={5}>Loading...</TableCell>
              </TableRow>
            ) : costs.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={5}>No cost records found. Click "Record Cost" to create one.</TableCell>
              </TableRow>
            ) : (
              costs.map((cost) => (
                <TableRow key={cost._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{cost.category}</span>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{cost.amount?.toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{cost.description}</TableCell>
                  <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{cost.locationType} ({cost.locationId.slice(-6)})</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{cost.date ? new Date(cost.date).toLocaleDateString() : "N/A"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
