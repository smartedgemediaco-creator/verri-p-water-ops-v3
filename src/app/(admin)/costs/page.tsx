"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import { PlusIcon, ListIcon, DollarLineIcon, ChevronDownIcon, ArrowRightIcon } from "@/icons";
import { formatDate } from "@/lib/dateFormat";
import DisputeButton from "@/components/disputes/DisputeButton";
import AdminEditButton from "@/components/disputes/AdminEditButton";

interface Cost {
  _id: string;
  category: string;
  amount: number;
  description: string;
  locationType: string;
  locationId: string;
  locationName?: string;
  date: string;
}

const CATEGORIES = [
  { value: "production", label: "Production" },
  { value: "transport", label: "Transport" },
  { value: "maintenance", label: "Maintenance" },
  { value: "salary", label: "Salary" },
  { value: "utility", label: "Utility" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  production: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  transport: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  maintenance: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  salary: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  utility: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

export default function CostsPage() {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/costs")
      .then((res) => res.json())
      .then((data) => setCosts(data))
      .finally(() => setLoading(false));
  }, []);

  const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
  const categoryList = [...new Set(costs.map((c) => c.category))];

  const toggleRow = (id: string) => setExpanded(expanded === id ? null : id);

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
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm min-w-0">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <ListIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{costs.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm min-w-0">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-3">
            <DollarLineIcon className="text-orange-600 size-5 dark:text-orange-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Expenditure</p>
          <AutoAmount value={`₦${totalCost.toLocaleString()}`} className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm min-w-0">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <ListIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{categoryList.length}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-8"><span /></TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Amount</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : costs.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>No cost records found. Click &quot;Record Cost&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              costs.map((cost) => {
                const isExpanded = expanded === cost._id;
                const badge = CATEGORY_COLORS[cost.category] ?? "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400";
                return (
                  <TableRow key={cost._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggleRow(cost._id)}>
                    <TableCell className="py-3 text-gray-400">
                      {isExpanded ? <ChevronDownIcon className="size-4" /> : <ArrowRightIcon className="size-4" />}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${badge}`}>
                        {cost.category}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">₦{cost.amount?.toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{cost.description}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{cost.locationName ?? `${cost.locationType} (${(cost.locationId ?? "").slice(-6)})`}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(cost.date)}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1.5 items-center">
                        <AdminEditButton
                          entity="Cost"
                          entityId={cost._id}
                          entityLabel={`${cost.category} — ₦${cost.amount?.toLocaleString()}`}
                          apiPath={`/api/costs/${cost._id}`}
                          onSaved={() => { setCosts([]); setExpanded(null); }}
                          fields={[
                            { key: "category", label: "Category", type: "select", options: CATEGORIES },
                            { key: "amount", label: "Amount (₦)", type: "number" },
                            { key: "description", label: "Description", type: "textarea" },
                            { key: "date", label: "Date", type: "date" },
                          ]}
                          initialValues={{
                            category: cost.category,
                            amount: cost.amount,
                            description: cost.description ?? "",
                            date: cost.date?.split("T")[0] ?? "",
                          }}
                        />
                        <DisputeButton entity="cost" entityId={cost._id} entityLabel={`${cost.category} — ₦${cost.amount?.toLocaleString()}`} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {expanded && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            {(() => {
              const cost = costs.find((c) => c._id === expanded);
              if (!cost) return null;
              return (
                <div className="px-6 py-5 bg-gray-50/50 dark:bg-gray-800/30">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Transaction Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Reference</p>
                      <p className="text-gray-800 dark:text-white/90 font-mono text-xs mt-0.5">{cost._id}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Category</p>
                      <p className="text-gray-800 dark:text-white/90 capitalize mt-0.5">{cost.category}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Amount</p>
                      <p className="text-gray-800 dark:text-white/90 font-semibold mt-0.5">₦{cost.amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Location</p>
                      <p className="text-gray-800 dark:text-white/90 capitalize mt-0.5">{cost.locationName ?? cost.locationType} ({cost.locationType})</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Date</p>
                      <p className="text-gray-800 dark:text-white/90 mt-0.5">{cost.date ? new Date(cost.date).toLocaleString() : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Description</p>
                      <p className="text-gray-800 dark:text-white/90 mt-0.5">{cost.description || "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
