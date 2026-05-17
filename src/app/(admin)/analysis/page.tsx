"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  BoxCubeIcon, FolderIcon, BoxIconLine, TableIcon,
  DollarLineIcon, ListIcon, PieChartIcon
} from "@/icons";

interface Analysis {
  factories: number;
  depots: number;
  trucks: number;
  totalInventory: number;
  totalSales: number;
  totalCosts: number;
  profit: number;
  activeTransfers: number;
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.push("/");
    }
  }, [user, loading, router]);

  const [data, setData] = useState<Analysis | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetch("/api/analysis")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setPageLoading(false));
  }, [user]);

  const resourceCards = data
    ? [
        { label: "Factories", value: data.factories, icon: <BoxCubeIcon className="text-blue-600 size-5 dark:text-blue-400" />, bg: "bg-blue-100 dark:bg-blue-500/10" },
        { label: "Depots", value: data.depots, icon: <FolderIcon className="text-green-600 size-5 dark:text-green-400" />, bg: "bg-green-100 dark:bg-green-500/10" },
        { label: "Trucks", value: data.trucks, icon: <BoxIconLine className="text-purple-600 size-5 dark:text-purple-400" />, bg: "bg-purple-100 dark:bg-purple-500/10" },
        { label: "Active Transfers", value: data.activeTransfers, icon: <BoxIconLine className="text-indigo-600 size-5 dark:text-indigo-400" />, bg: "bg-indigo-100 dark:bg-indigo-500/10" },
      ]
    : [];

  const financialCards = data
    ? [
        { label: "Total Inventory", value: data.totalInventory.toLocaleString(), icon: <TableIcon className="text-orange-600 size-5 dark:text-orange-400" />, bg: "bg-orange-100 dark:bg-orange-500/10" },
        { label: "Total Sales", value: `₦${data.totalSales.toLocaleString()}`, icon: <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />, bg: "bg-emerald-100 dark:bg-emerald-500/10" },
        { label: "Total Costs", value: `₦${data.totalCosts.toLocaleString()}`, icon: <ListIcon className="text-red-600 size-5 dark:text-red-400" />, bg: "bg-red-100 dark:bg-red-500/10" },
        { label: "Profit", value: `₦${data.profit.toLocaleString()}`, icon: <PieChartIcon className={`size-5 ${data.profit >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`} />, bg: data.profit >= 0 ? "bg-teal-100 dark:bg-teal-500/10" : "bg-red-100 dark:bg-red-500/10" },
      ]
    : [];

  return (
    <div>
      <div className="mb-6">
        <PageBreadcrumb pageTitle="Analysis" />
      </div>

      {pageLoading ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading analysis...</div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Resources</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {resourceCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm"
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-3`}>
                    {card.icon}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Financial</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {financialCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm"
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-3`}>
                    {card.icon}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
