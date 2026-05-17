"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarLineIcon,
  PieChartIcon,
} from "@/icons";
import { FactoryIcon, DepotIcon, TruckIcon, WaterDropIcon, TransferIcon } from "@/components/icons/EntityIcons";
import RevenueChart from "@/components/charts/RevenueChart";
import CostBreakdownChart from "@/components/charts/CostBreakdownChart";
import BusinessAdviceCard from "@/components/business/BusinessAdviceCard";
import ProductionForm from "@/components/charts/ProductionForm";
import { useAuth } from "@/context/AuthContext";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    factories: 0,
    depots: 0,
    trucks: 0,
    totalInventory: 0,
    totalSales: 0,
    totalCosts: 0,
    profit: 0,
    activeTransfers: 0,
  });

  useEffect(() => {
    fetch("/api/analysis")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

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
    { label: "Inventory (units)", value: stats.totalInventory, icon: <WaterDropIcon className="w-5 h-5" />, href: "/inventory", circleBg: "bg-cyan-100 dark:bg-cyan-500/10", iconColor: "text-cyan-600 dark:text-cyan-400" },
    ...(isOwner || isDepotManager
      ? [{ label: "Sales (₦)", value: stats.totalSales.toLocaleString(), icon: <DollarLineIcon />, href: "/sales", circleBg: "bg-emerald-100 dark:bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" }]
      : []),
    ...(isOwner || isFactoryManager || isDepotManager
      ? [{ label: "Costs (₦)", value: stats.totalCosts.toLocaleString(), icon: <DollarLineIcon />, href: "/costs", circleBg: "bg-red-100 dark:bg-red-500/10", iconColor: "text-red-600 dark:text-red-400" }]
      : []),
    ...(isOwner
      ? [{ label: "Profit (₦)", value: stats.profit.toLocaleString(), icon: <PieChartIcon />, href: "/analysis", circleBg: "bg-teal-100 dark:bg-teal-500/10", iconColor: "text-teal-600 dark:text-teal-400" }]
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
          {isFactoryManager
            ? "Factory Operations Overview"
            : isDepotManager
            ? "Depot Operations Overview"
            : "Dashboard — Factory, Depot &amp; Distribution Overview"}
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
              <div>
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="mt-1 text-title-sm font-bold text-gray-800 dark:text-white">
                  {card.value}
                </p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.circleBg}`}>
                <span className={card.iconColor}>{card.icon}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(isOwner || isDepotManager) && <RevenueChart />}
        <CostBreakdownChart />
      </div>
      {(user?.role === "factory-manager" || user?.role === "admin") && (
        <div className="mt-6">
          <ProductionForm />
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
