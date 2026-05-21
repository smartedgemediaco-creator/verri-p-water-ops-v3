"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { useRouter } from "next/navigation";
import {
  BoxCubeIcon, FolderIcon, BoxIconLine,
  DollarLineIcon, ListIcon, PieChartIcon
} from "@/icons";

interface EntityRow {
  _id: string;
  name?: string;
  location?: string;
  plateNumber?: string;
  driverName?: string;
  sales: number;
  costs: number;
  profit: number;
  inventory: number;
  wastage: number;
  wastageCount: number;
  activeTransfers?: number;
}

interface AnalysisData {
  factories: EntityRow[];
  depots: EntityRow[];
  trucks: EntityRow[];
}

export default function AnalysisPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<AnalysisData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFetchError(false);
    fetch("/api/analysis")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => setFetchError(true))
      .finally(() => setPageLoading(false));
  }, [user]);

  if (pageLoading) {
    return (
      <div>
        <div className="mb-6"><PageBreadcrumb pageTitle="Analysis" /></div>
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading analysis...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <div className="mb-6"><PageBreadcrumb pageTitle="Analysis" /></div>
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Failed to load analysis data.</p>
          <button onClick={() => { setPageLoading(true); setFetchError(false); setData(null); fetch("/api/analysis").then((r) => r.json()).then(setData).catch(() => setFetchError(true)).finally(() => setPageLoading(false)); }} className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const f = data.factories ?? [];
  const d = data.depots ?? [];
  const t = data.trucks ?? [];
  const totalFactories = f.length;
  const totalDepots = d.length;
  const totalTrucks = t.length;
  const totalSales = [...f, ...d, ...t].reduce((s: number, r: EntityRow) => s + (r.sales ?? 0), 0);
  const totalCosts = [...f, ...d, ...t].reduce((s: number, r: EntityRow) => s + (r.costs ?? 0), 0);
  const totalProfit = totalSales - totalCosts;
  const totalInv = [...f, ...d, ...t].reduce((s: number, r: EntityRow) => s + (r.inventory ?? 0), 0);
  const totalWastage = [...f, ...d, ...t].reduce((s: number, r: EntityRow) => s + (r.wastage ?? 0), 0);
  const totalTransfers = t.reduce((s: number, r: EntityRow) => s + (r.activeTransfers ?? 0), 0);

  const isDriver = user?.role === "driver";
  const resourceCards = [
    { label: "Factories", value: totalFactories, icon: <BoxCubeIcon className="text-blue-600 size-5 dark:text-blue-400" />, bg: "bg-blue-100 dark:bg-blue-500/10" },
    { label: "Depots", value: totalDepots, icon: <FolderIcon className="text-green-600 size-5 dark:text-green-400" />, bg: "bg-green-100 dark:bg-green-500/10" },
    { label: "Trucks", value: totalTrucks, icon: <BoxIconLine className="text-purple-600 size-5 dark:text-purple-400" />, bg: "bg-purple-100 dark:bg-purple-500/10" },
    { label: "Active Transfers", value: totalTransfers, icon: <BoxIconLine className="text-indigo-600 size-5 dark:text-indigo-400" />, bg: "bg-indigo-100 dark:bg-indigo-500/10" },
  ];

  const financialCards = isDriver ? [] : [
    { label: "Total Inventory", value: totalInv.toLocaleString(), icon: <BoxIconLine className="text-orange-600 size-5 dark:text-orange-400" />, bg: "bg-orange-100 dark:bg-orange-500/10" },
    { label: "Total Sales", value: `₦${totalSales.toLocaleString()}`, icon: <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />, bg: "bg-emerald-100 dark:bg-emerald-500/10" },
    { label: "Total Costs", value: `₦${totalCosts.toLocaleString()}`, icon: <ListIcon className="text-red-600 size-5 dark:text-red-400" />, bg: "bg-red-100 dark:bg-red-500/10" },
    { label: "Profit", value: `₦${totalProfit.toLocaleString()}`, icon: <PieChartIcon className={`size-5 ${totalProfit >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`} />, bg: totalProfit >= 0 ? "bg-teal-100 dark:bg-teal-500/10" : "bg-red-100 dark:bg-red-500/10" },
    { label: "Total Wastage", value: totalWastage.toLocaleString(), icon: <BoxIconLine className="text-amber-600 size-5 dark:text-amber-400" />, bg: "bg-amber-100 dark:bg-amber-500/10" },
  ];

  const profitBadge = (v: number) => (
    <Badge variant="light" color={v >= 0 ? "success" : "error"}>
      ₦{Math.abs(v).toLocaleString()} {v >= 0 ? "profit" : "loss"}
    </Badge>
  );

  // Business insights computed from data
  interface EntityWithMeta extends EntityRow { type: string; display: string }
  const allEntities: EntityWithMeta[] = [
    ...f.map((r) => ({ ...r, type: "factory" as const, display: r.name ?? "" })),
    ...d.map((r) => ({ ...r, type: "depot" as const, display: r.name ?? "" })),
    ...t.map((r) => ({ ...r, type: "truck" as const, display: r.plateNumber ?? "" })),
  ];
  const profitLeaders = [...allEntities].sort((a, b) => b.profit - a.profit).slice(0, 3);
  const lossLeaders = [...allEntities].filter((r) => r.profit < 0).sort((a, b) => a.profit - b.profit);
  const idleTrucks = allEntities.filter((r) => r.type === "truck" && !r.activeTransfers && !r.inventory);
  const mostStock = [...allEntities].sort((a, b) => b.inventory - a.inventory).slice(0, 3);
  const totalSalesRatio = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : "0.0";
  const profitableEntities = allEntities.filter((r) => r.profit > 0);
  const lossMakingCount = lossLeaders.length;
  const highWastage = [...allEntities].filter((r) => r.wastage > 0).sort((a, b) => b.wastage - a.wastage).slice(0, 3);
  const insights: { title: string; body: string; type: "success" | "warning" | "danger" | "info" }[] = [];

  if (lossMakingCount > 0) {
    insights.push({
      title: `${lossMakingCount} location${lossMakingCount > 1 ? "s" : ""} operating at a loss`,
      body: lossLeaders.slice(0, 3).map((r) => `• ${r.display} (${r.type}): ₦${Math.abs(r.profit).toLocaleString()} loss`).join("\n"),
      type: "danger",
    });
  }
  if (profitLeaders.length > 0) {
    insights.push({
      title: `Top profit performers`,
      body: profitLeaders.map((r) => `• ${r.display} (${r.type}): ₦${r.profit.toLocaleString()} profit`).join("\n"),
      type: "success",
    });
  }
  if (idleTrucks.length > 0) {
    insights.push({
      title: `${idleTrucks.length} truck${idleTrucks.length > 1 ? "s" : ""} idle — no active transfers or stock`,
      body: idleTrucks.slice(0, 3).map((r) => `• ${r.display} — driver: ${r.driverName || "none"}`).join("\n"),
      type: "warning",
    });
  }
  if (mostStock.length > 0) {
    insights.push({
      title: `Highest stock concentration`,
      body: mostStock.map((r) => `• ${r.display} (${r.type}): ${r.inventory.toLocaleString()} units`).join("\n"),
      type: "info",
    });
  }
  if (totalSales > 0) {
    insights.push({
      title: `Overall profit margin: ${totalSalesRatio}%`,
      body: `For every ₦100 in sales, ₦${(Number(totalSalesRatio) > 0 ? Number(totalSalesRatio) : 0).toFixed(1)} is profit. ${Number(totalSalesRatio) < 10 ? "Consider reviewing costs to improve margins." : Number(totalSalesRatio) > 30 ? "Healthy margins." : "Moderate margins — room for optimization."}`,
      type: Number(totalSalesRatio) < 10 ? "warning" : "success",
    });
  }
  if (highWastage.length > 0) {
    insights.push({
      title: `${highWastage.length} location${highWastage.length > 1 ? "s" : ""} with highest wastage`,
      body: highWastage.map((r) => `• ${r.display} (${r.type}): ${r.wastage.toLocaleString()} units lost`).join("\n"),
      type: "warning",
    });
  }

  if (profitableEntities.length > 0 && lossMakingCount > 0) {
    const ratio = (profitableEntities.length / allEntities.length * 100).toFixed(0);
    insights.push({
      title: `${ratio}% of locations are profitable`,
      body: `${profitableEntities.length} out of ${allEntities.length} entities generate positive returns. Consider investigating the ${lossMakingCount} loss-making location${lossMakingCount > 1 ? "s" : ""} for cost optimization or operational changes.`,
      type: Number(ratio) >= 70 ? "success" : "warning",
    });
  }

  const adviceCards = f.length > 0 || d.length > 0 || t.length > 0 ? insights : [];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <PageBreadcrumb pageTitle="Analysis" />
        <span className="text-xs text-gray-400 dark:text-gray-500">{user?.name ?? user?.email ?? ""}</span>
      </div>

      <div className="space-y-6">
        {/* Business Insights */}
        {adviceCards.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Business Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adviceCards.map((insight, idx) => {
                const borderColor = insight.type === "danger" ? "border-red-300 dark:border-red-500/30"
                  : insight.type === "warning" ? "border-amber-300 dark:border-amber-500/30"
                  : insight.type === "success" ? "border-emerald-300 dark:border-emerald-500/30"
                  : "border-blue-300 dark:border-blue-500/30";
                const badgeColor = insight.type === "danger" ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                  : insight.type === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  : insight.type === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
                return (
                  <div key={idx} className={`bg-white dark:bg-gray-900 rounded-xl border ${borderColor} p-4 shadow-theme-sm`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${badgeColor}`}>
                        {insight.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-1">{insight.title}</p>
                        <pre className="text-xs text-gray-500 dark:text-gray-400 font-sans whitespace-pre-wrap leading-relaxed">{insight.body}</pre>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {resourceCards.map((card) => (
              <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-3`}>{card.icon}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{card.value}</p>
              </div>
            ))}
            {financialCards.map((card) => (
              <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm min-w-0">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-3`}>{card.icon}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                <AutoAmount value={card.value} className="text-gray-800 dark:text-white" />
              </div>
            ))}
          </div>
        </div>

        {/* Empty state when nothing registered yet */}
        {f.length === 0 && d.length === 0 && t.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm">
            <BoxCubeIcon className="mx-auto mb-3 text-gray-300 dark:text-gray-600 size-10" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No data yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start by adding factories, depots, and products, then record production and sales.</p>
          </div>
        )}

        {/* Factories table */}
        {f.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Per Factory</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Factory</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Sales</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Costs</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Profit</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Inventory</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Wastage</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {f.map((fac) => (
                      <TableRow key={fac._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/factories/${fac._id}`)}>
                        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{fac.name}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{fac.location}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${fac.sales.toLocaleString()}`} /></TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${fac.costs.toLocaleString()}`} /></TableCell>
                        <TableCell className="py-3">{profitBadge(fac.profit)}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{fac.inventory.toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{fac.wastage.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Depots table */}
        {d.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Per Depot</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Depot</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Sales</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Costs</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Profit</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Inventory</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Wastage</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.map((dep) => (
                      <TableRow key={dep._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/depots/${dep._id}`)}>
                        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{dep.name}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{dep.location}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${dep.sales.toLocaleString()}`} /></TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${dep.costs.toLocaleString()}`} /></TableCell>
                        <TableCell className="py-3">{profitBadge(dep.profit)}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{dep.inventory.toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{dep.wastage.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Trucks table */}
        {t.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Per Truck</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Plate Number</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Driver</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Sales</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Costs</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Profit</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Inventory</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Wastage</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Active Transfers</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.map((trk) => (
                      <TableRow key={trk._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/trucks/${trk._id}`)}>
                        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{trk.plateNumber}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{trk.driverName || "—"}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${trk.sales.toLocaleString()}`} /></TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${trk.costs.toLocaleString()}`} /></TableCell>
                        <TableCell className="py-3">{profitBadge(trk.profit)}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{trk.inventory.toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{trk.wastage.toLocaleString()}</TableCell>
                        <TableCell className="py-3"><Badge variant="light" color="info">{trk.activeTransfers} active</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
