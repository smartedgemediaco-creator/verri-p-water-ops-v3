"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarLineIcon,
  PieChartIcon,
  AlertIcon,
} from "@/icons";
import { FactoryIcon, DepotIcon, TruckIcon, BottleIcon, TransferIcon } from "@/components/icons/EntityIcons";
import RevenueChart from "@/components/charts/RevenueChart";
import CostBreakdownChart from "@/components/charts/CostBreakdownChart";
import PaymentMethodChart from "@/components/charts/PaymentMethodChart";
import BusinessAdviceCard from "@/components/business/BusinessAdviceCard";
import ProductionForm from "@/components/charts/ProductionForm";
import RecordCostForm from "@/components/charts/RecordCostForm";
import AutoAmount from "@/components/ui/AutoAmount";
import { useAuth } from "@/context/AuthContext";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    factories: number;
    depots: number;
    trucks: number;
    products: number;
    totalSales: number;
    totalCosts: number;
    profit: number;
    activeTransfers: number;
  }>({ factories: 0, depots: 0, trucks: 0, products: 0, totalSales: 0, totalCosts: 0, profit: 0, activeTransfers: 0 });
  const [invStats, setInvStats] = useState({
    totalProduced: 0,
    totalSold: 0,
    totalAvailable: 0,
    factoryStock: 0,
    depotStock: 0,
    truckStock: 0,
    locationCount: 0,
    pendingTransferQty: 0,
    pendingTransferCount: 0,
    inTransitQty: 0,
    inTransitCount: 0,
    totalWastage: 0,
  });
  const [pendingDisputes, setPendingDisputes] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);
  useEffect(() => {
    const fetchStats = () => {
      Promise.all([
        fetch("/api/analysis").then((r) => r.json()),
        fetch("/api/inventory/stats").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/disputes?status=pending").then((r) => r.json()),
      ])
        .then(([analysis, inv, products, disputes]) => {
          const a = analysis as { factories?: { sales?: number; costs?: number; activeTransfers?: number }[]; depots?: { sales?: number; costs?: number }[]; trucks?: { sales?: number; costs?: number; activeTransfers?: number }[] };
          const factories = Array.isArray(a?.factories) ? a.factories : [];
          const depots = Array.isArray(a?.depots) ? a.depots : [];
          const trucks = Array.isArray(a?.trucks) ? a.trucks : [];
          const totalSales = factories.reduce((s, f) => s + (f.sales ?? 0), 0) + depots.reduce((s, d) => s + (d.sales ?? 0), 0) + trucks.reduce((s, t) => s + (t.sales ?? 0), 0);
          const totalCosts = factories.reduce((s, f) => s + (f.costs ?? 0), 0) + depots.reduce((s, d) => s + (d.costs ?? 0), 0) + trucks.reduce((s, t) => s + (t.costs ?? 0), 0);
          setStats({
            factories: factories.length,
            depots: depots.length,
            trucks: trucks.length,
            products: Array.isArray(products) ? products.length : 0,
            totalSales,
            totalCosts,
            profit: totalSales - totalCosts,
            activeTransfers: trucks.reduce((s, t) => s + (t.activeTransfers ?? 0), 0),
          });
          setInvStats(inv);
          setPendingDisputes(Array.isArray(disputes) ? disputes.length : 0);
        })
        .catch(() => {});
    };
    fetchStats();
    const id = setInterval(fetchStats, 15000);
    return () => clearInterval(id);
  }, [refreshKey]);

  const isOwner = user?.role === "admin";
  const isFactoryManager = user?.role === "factory-manager";
  const isDepotManager = user?.role === "depot-manager";

  const cards = [
    ...(isOwner || isFactoryManager
      ? [{ label: "Factories", value: stats.factories, icon: <FactoryIcon className="w-5 h-5" />, href: "/factories", circleBg: "bg-blue-100 dark:bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400" }]
      : []),
    ...(isOwner || isDepotManager
      ? [{ label: "Depots", value: stats.depots, icon: <DepotIcon className="w-5 h-5" />, href: "/depots", circleBg: "bg-emerald-100 dark:bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" }]
      : []),
    { label: "Trucks", value: stats.trucks, icon: <TruckIcon className="w-5 h-5" />, href: "/trucks", circleBg: "bg-orange-100 dark:bg-orange-500/10", iconColor: "text-orange-600 dark:text-orange-400" },
    { label: "Products", value: stats.products, icon: <BottleIcon className="w-5 h-5" />, href: "/products", circleBg: "bg-pink-100 dark:bg-pink-500/10", iconColor: "text-pink-600 dark:text-pink-400" },
    ...(isOwner || isDepotManager || isFactoryManager
      ? [{ label: "Sales (₦)", value: stats.totalSales.toLocaleString(), icon: <DollarLineIcon />, href: "/sales", circleBg: "bg-emerald-100 dark:bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" }]
      : []),
    ...(isOwner || isFactoryManager || isDepotManager
      ? [{ label: "Costs (₦)", value: stats.totalCosts.toLocaleString(), icon: <DollarLineIcon />, href: "/costs", circleBg: "bg-red-100 dark:bg-red-500/10", iconColor: "text-red-600 dark:text-red-400" }]
      : []),
    ...(isOwner
      ? [{ label: "Profit (₦)", value: stats.profit.toLocaleString(), icon: <PieChartIcon />, href: "/analysis", circleBg: "bg-teal-100 dark:bg-teal-500/10", iconColor: "text-teal-600 dark:text-teal-400" }]
      : []),
    ...(isOwner
      ? [{ label: "Disputes", value: pendingDisputes, icon: <AlertIcon />, href: "/disputes", circleBg: "bg-red-100 dark:bg-red-500/10", iconColor: "text-red-600 dark:text-red-400" }]
      : []),
    { label: "Active Transfers", value: stats.activeTransfers, icon: <TransferIcon className="w-5 h-5" />, href: "/transfers", circleBg: "bg-purple-100 dark:bg-purple-500/10", iconColor: "text-purple-600 dark:text-purple-400" },
  ];

  const entityName = user?.factoryName
    || user?.depotName
    || (isFactoryManager && typeof user?.factoryId === "object" && user.factoryId !== null
      ? (user.factoryId as { _id: string; name: string }).name
      : null)
    || (isDepotManager && typeof user?.depotId === "object" && user.depotId !== null
      ? (user.depotId as { _id: string; name: string }).name
      : null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title-md font-bold text-gray-800 dark:text-white">
          {entityName ? `${entityName} — Dashboard` : "Verri P Water Inc"}
        </h1>
        <p className="text-theme-sm text-gray-500">
          {user?.name ? `Welcome, ${user.name} — ` : ""}
          {isFactoryManager
            ? "Factory Operations Overview"
            : isDepotManager
            ? "Depot Operations Overview"
            : "Dashboard — Factory, Depot & Distribution Overview"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900 hover:shadow-theme-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <AutoAmount value={String(card.value)} className="text-gray-800 dark:text-white" />
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.circleBg}`}>
                <span className={card.iconColor}>{card.icon}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3 uppercase tracking-wide">Stock Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link href="/inventory" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Produced</span>
            </div>
            <AutoAmount value={invStats.totalProduced.toLocaleString()} className="text-emerald-700 dark:text-emerald-300" />
          </Link>
          <Link href="/inventory" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Sold</span>
            </div>
            <AutoAmount value={invStats.totalSold.toLocaleString()} className="text-blue-700 dark:text-blue-300" />
          </Link>
          <Link href="/inventory" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">In Stock</span>
            </div>
            <AutoAmount value={invStats.totalAvailable.toLocaleString()} className="text-cyan-700 dark:text-cyan-300" />
          </Link>
          <Link href="/transfers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
            </div>
            <AutoAmount value={invStats.pendingTransferQty.toLocaleString()} className="text-amber-700 dark:text-amber-300" />
          </Link>
          <Link href="/transfers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">In Transit</span>
            </div>
            <AutoAmount value={invStats.inTransitQty.toLocaleString()} className="text-purple-700 dark:text-purple-300" />
          </Link>
          <Link href="/inventory" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Wastage</span>
            </div>
            <AutoAmount value={invStats.totalWastage.toLocaleString()} className="text-red-700 dark:text-red-300" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
          <Link href="/inventory" className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Factory</p>
            <AutoAmount value={invStats.factoryStock.toLocaleString()} className="text-gray-800 dark:text-white/90 !text-sm" />
          </Link>
          <Link href="/inventory" className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Depot</p>
            <AutoAmount value={invStats.depotStock.toLocaleString()} className="text-gray-800 dark:text-white/90 !text-sm" />
          </Link>
          <Link href="/inventory" className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Truck</p>
            <AutoAmount value={invStats.truckStock.toLocaleString()} className="text-gray-800 dark:text-white/90 !text-sm" />
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(isOwner || isDepotManager || isFactoryManager) && <RevenueChart />}
        <CostBreakdownChart />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(isOwner || isDepotManager || isFactoryManager) && <PaymentMethodChart />}
      </div>
      {(isFactoryManager || isOwner) && (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ProductionForm />
          <RecordCostForm onSuccess={triggerRefresh} />
        </div>
      )}
      {isDepotManager && (
        <div className="mt-6">
          <RecordCostForm onSuccess={triggerRefresh} />
        </div>
      )}
      {isOwner && (
        <div className="mt-6">
          <BusinessAdviceCard />
        </div>
      )}
    </div>
  );
}
