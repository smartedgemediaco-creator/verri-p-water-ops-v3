"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarLineIcon,
  AlertIcon,
  ArrowRightIcon,
  UserIcon,
  GroupIcon,
  BoxIcon,
  PlusIcon,
  PencilIcon,
} from "@/icons";
import { FactoryIcon, DepotIcon, TruckIcon, BottleIcon, TransferIcon } from "@/components/icons/EntityIcons";
import RevenueChart from "@/components/charts/RevenueChart";
import CostBreakdownChart from "@/components/charts/CostBreakdownChart";
import PaymentMethodChart from "@/components/charts/PaymentMethodChart";
import BusinessAdviceCard from "@/components/business/BusinessAdviceCard";
import ProductionForm from "@/components/charts/ProductionForm";
import RecordCostForm from "@/components/charts/RecordCostForm";
import AutoAmount from "@/components/ui/AutoAmount";
import LiveClock from "@/components/ui/LiveClock";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/dateFormat";

interface ActivityItem {
  _id: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
  user: { name: string; email: string; role: string } | null;
}

interface RawMaterialItem {
  _id: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  category: string;
}

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
    scheduledOverdue: number;
    scheduledDueSoon: number;
    scheduledItems: unknown[];
  }>({ factories: 0, depots: 0, trucks: 0, products: 0, totalSales: 0, totalCosts: 0, profit: 0, activeTransfers: 0, scheduledOverdue: 0, scheduledDueSoon: 0, scheduledItems: [] });
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
  const [customerCount, setCustomerCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [rawMaterialCount, setRawMaterialCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<RawMaterialItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [yesterdaySales, setYesterdaySales] = useState(0);
  const [todayCosts, setTodayCosts] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    const safeFetch = async (url: string) => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${r.status}`);
        return await r.json();
      } catch { return null; }
    };
    const fetchStats = () => {
      // Main batch — each fetch is independent so one failure doesn't kill the rest
      Promise.all([
        safeFetch("/api/analysis"),
        safeFetch("/api/stock/stats"),
        safeFetch("/api/products"),
        safeFetch("/api/customers"),
        safeFetch("/api/staff"),
        safeFetch("/api/suppliers"),
        safeFetch("/api/raw-materials"),
        safeFetch("/api/activity?limit=5"),
        safeFetch("/api/scheduled-operations"),
      ]).then(([analysis, inv, products, customers, staff, suppliers, rawMaterials, activity, scheduledData]) => {
          const a = analysis as { factories?: { sales?: number; costs?: number; activeTransfers?: number }[]; depots?: { sales?: number; costs?: number }[]; trucks?: { sales?: number; costs?: number; activeTransfers?: number }[] } | null;
          const factories = Array.isArray(a?.factories) ? a.factories : [];
          const depots = Array.isArray(a?.depots) ? a.depots : [];
          const trucks = Array.isArray(a?.trucks) ? a.trucks : [];
          const totalSales = factories.reduce((s, f) => s + (f.sales ?? 0), 0) + depots.reduce((s, d) => s + (d.sales ?? 0), 0) + trucks.reduce((s, t) => s + (t.sales ?? 0), 0);
          const totalCosts = factories.reduce((s, f) => s + (f.costs ?? 0), 0) + depots.reduce((s, d) => s + (d.costs ?? 0), 0) + trucks.reduce((s, t) => s + (t.costs ?? 0), 0);
          const scheduledItems = Array.isArray(scheduledData) ? scheduledData : [];
          const now = new Date();
          const scheduledOverdue = scheduledItems.filter((v: { dueDate: string; completedAt?: string | null }) => {
            if (v.completedAt) return false;
            return new Date(v.dueDate) < now;
          }).length;
          const scheduledDueSoon = scheduledItems.filter((v: { dueDate: string; completedAt?: string | null; leadDays?: number }) => {
            if (v.completedAt) return false;
            const ld = v.leadDays ?? 3;
            const due = new Date(v.dueDate);
            const threshold = new Date(now.getTime() + ld * 86400000);
            return due >= now && due <= threshold;
          }).length;
          setStats({
            factories: factories.length,
            depots: depots.length,
            trucks: trucks.length,
            products: Array.isArray(products) ? products.length : 0,
            totalSales,
            totalCosts,
            profit: totalSales - totalCosts,
            activeTransfers: trucks.reduce((s, t) => s + (t.activeTransfers ?? 0), 0),
            scheduledOverdue,
            scheduledDueSoon,
            scheduledItems,
          });
          if (inv && typeof inv === "object" && "totalProduced" in inv) setInvStats(inv as typeof invStats);
          setCustomerCount(Array.isArray(customers) ? customers.length : 0);
          setStaffCount(Array.isArray(staff) ? staff.length : 0);
          setSupplierCount(Array.isArray(suppliers) ? suppliers.length : 0);
          const materials = Array.isArray(rawMaterials) ? (rawMaterials as RawMaterialItem[]) : [];
          setRawMaterialCount(materials.length);
          const lowStock = materials.filter((m) => m.currentStock < m.minimumStock);
          setLowStockCount(lowStock.length);
          setLowStockItems(lowStock);
          const act = activity as { logs?: ActivityItem[] } | ActivityItem[] | null;
          const logs = Array.isArray(act) ? act : (act && Array.isArray(act?.logs) ? act.logs : []);
          setRecentActivity(logs.slice(0, 5));
        })
        .catch((e) => console.error("Dashboard fetch failed:", e));
      // today's & yesterday's sales stats — also resilient
      const today = new Date(); const todayStart = today.toISOString().slice(0, 10);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1); const yesterdayStart = yesterday.toISOString().slice(0, 10);
      Promise.all([
        safeFetch(`/api/sales/stats?startDate=${todayStart}`),
        safeFetch(`/api/sales/stats?startDate=${yesterdayStart}&endDate=${yesterdayStart}`),
        safeFetch(`/api/costs?startDate=${todayStart}`),
      ]).then(([todayData, yesterdayData, todayCostsData]) => {
        setTodaySales((todayData as { grandTotal?: number } | null)?.grandTotal ?? 0);
        setYesterdaySales((yesterdayData as { grandTotal?: number } | null)?.grandTotal ?? 0);
        const costsArr = Array.isArray(todayCostsData) ? todayCostsData : (todayCostsData as { costs?: unknown[] } | null)?.costs ?? [];
        setTodayCosts((costsArr as { amount?: number }[]).reduce((s: number, c: { amount?: number }) => s + (c.amount ?? 0), 0));
      }).catch((e) => console.error("Dashboard day-stats fetch failed:", e));
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
    { label: "Vehicles", value: stats.trucks, icon: <TruckIcon className="w-5 h-5" />, href: "/trucks", circleBg: "bg-orange-100 dark:bg-orange-500/10", iconColor: "text-orange-600 dark:text-orange-400" },
    { label: "Products", value: stats.products, icon: <BottleIcon className="w-5 h-5" />, href: "/products", circleBg: "bg-pink-100 dark:bg-pink-500/10", iconColor: "text-pink-600 dark:text-pink-400" },
    { label: "Customers", value: customerCount, icon: <UserIcon />, href: "/customers", circleBg: "bg-indigo-100 dark:bg-indigo-500/10", iconColor: "text-indigo-600 dark:text-indigo-400" },
    { label: "Staff", value: staffCount, icon: <GroupIcon />, href: "/staff", circleBg: "bg-cyan-100 dark:bg-cyan-500/10", iconColor: "text-cyan-600 dark:text-cyan-400" },
    ...(isOwner || isFactoryManager
      ? [{ label: "Suppliers", value: supplierCount, icon: <BoxIcon />, href: "/suppliers", circleBg: "bg-yellow-100 dark:bg-yellow-500/10", iconColor: "text-yellow-600 dark:text-yellow-400" }]
      : []),
    ...(isOwner || isFactoryManager
      ? [{ label: "Raw Materials", value: lowStockCount > 0 ? `${lowStockCount} low` : rawMaterialCount, icon: <BoxIcon />, href: "/raw-materials", circleBg: lowStockCount > 0 ? "bg-red-100 dark:bg-red-500/10" : "bg-gray-100 dark:bg-gray-500/10", iconColor: lowStockCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400" }]
      : []),
    { label: "Active Transfers", value: stats.activeTransfers, icon: <TransferIcon className="w-5 h-5" />, href: "/transfers", circleBg: "bg-purple-100 dark:bg-purple-500/10", iconColor: "text-purple-600 dark:text-purple-400" },
  ];

  const quickActions = [
    ...(isFactoryManager || isOwner
      ? [{ label: "Record Production", href: isFactoryManager && user?.factoryId ? `/factories/${typeof user.factoryId === "string" ? user.factoryId : user.factoryId._id}` : "/factories", icon: <PlusIcon className="w-4 h-4" />, color: "bg-blue-500 hover:bg-blue-600" }]
      : []),
    ...(isFactoryManager || isOwner
      ? [{ label: "Load Vehicle", href: "/truck-loads", icon: <TruckIcon className="w-4 h-4" />, color: "bg-orange-500 hover:bg-orange-600" }]
      : []),
    ...(isDepotManager || isFactoryManager || isOwner
      ? [{ label: "Record Sale", href: "/sales/new", icon: <DollarLineIcon className="w-4 h-4" />, color: "bg-emerald-500 hover:bg-emerald-600" }]
      : []),
    ...(isDepotManager || isFactoryManager || isOwner
      ? [{ label: "Record Cost", href: "/costs/new", icon: <PencilIcon className="w-4 h-4" />, color: "bg-red-500 hover:bg-red-600" }]
      : []),
    { label: "Record Leakage", href: "/wastage", icon: <AlertIcon className="w-4 h-4" />, color: "bg-amber-500 hover:bg-amber-600" },
    { label: "View Customers", href: "/customers", icon: <UserIcon className="w-4 h-4" />, color: "bg-indigo-500 hover:bg-indigo-600" },
  ];

  const entityName = user?.factoryName
    || user?.depotName
    || (isFactoryManager && typeof user?.factoryId === "object" && user.factoryId !== null
      ? (user.factoryId as { _id: string; name: string }).name
      : null)
    || (isDepotManager && typeof user?.depotId === "object" && user.depotId !== null
      ? (user.depotId as { _id: string; name: string }).name
      : null);

  const actionBadgeClass = (action: string) => {
    switch (action) {
      case "created": return "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "updated": return "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "deleted": return "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400";
      default: return "bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white">
            {entityName ? `${entityName} — Dashboard` : "Verri P Water Inc"}
          </h1>
          <p className="text-theme-sm text-gray-500">
            {user?.name ? `Welcome, ${user.name} — ` : ""}
            {isFactoryManager
              ? "Factory Operations Command Center"
              : isDepotManager
              ? "Depot Operations Command Center"
              : "Dashboard — Factory, Depot & Distribution Overview"}
          </p>
        </div>
        <LiveClock showDate showTime />
      </div>

      {/* Top summary row */}
      {(() => {
        const todayProfit = todaySales - todayCosts;
        const salesChange = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
        const trend = salesChange > 0 ? "up" : salesChange < 0 ? "down" : "flat";
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
            <Link href="/sales" className="card-corporate p-4 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800">
              <p className="stat-label mb-0.5">Total Sales</p>
              <AutoAmount value={stats.totalSales.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold text-lg" />
            </Link>
            <Link href="/sales" className="card-corporate p-4 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800">
              <p className="stat-label mb-0.5">Today&apos;s Sales</p>
              <AutoAmount value={todaySales.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold text-lg" />
              <div className="flex items-center gap-1 mt-1">
                {trend === "up" ? <TrendingUpIcon className="w-3.5 h-3.5 text-emerald-500" /> : trend === "down" ? <TrendingDownIcon className="w-3.5 h-3.5 text-red-500" /> : <MinusIcon className="w-3.5 h-3.5 text-gray-400" />}
                <span className={`text-xs font-medium ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-gray-400"}`}>
                  {salesChange === 0 ? "No change" : `${Math.abs(salesChange).toFixed(1)}% ${trend === "up" ? "vs yesterday" : "vs yesterday"}`}
                </span>
              </div>
            </Link>
            <Link href="/costs" className="card-corporate p-4 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800">
              <p className="stat-label mb-0.5">Today&apos;s Cost</p>
              <AutoAmount value={todayCosts.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold text-lg" />
            </Link>
            <Link href="/analysis" className="card-corporate p-4 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800">
              <p className="stat-label mb-0.5">Today&apos;s Profit</p>
              <AutoAmount value={todayProfit.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold text-lg" />
            </Link>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6 mb-6">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card-corporate p-4 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="stat-label mb-0.5">{card.label}</p>
                <AutoAmount value={String(card.value)} className="text-blue-600 dark:text-blue-400 !font-semibold" />
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.circleBg}`}>
                <span className={card.iconColor}>{card.icon}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card-corporate p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Maintenance — Upcoming</h3>
          <Link href="/scheduled-operations" className="text-xs text-accent hover:underline">View all</Link>
        </div>
        <div id="scheduled-ops-summary" className="text-sm text-gray-500">
          {stats.scheduledOverdue > 0 && (
            <span className="text-red-600 font-medium">{stats.scheduledOverdue} overdue</span>
          )}
          {stats.scheduledOverdue > 0 && stats.scheduledDueSoon > 0 && <span> · </span>}
          {stats.scheduledDueSoon > 0 && (
            <span className="text-amber-600 font-medium">{stats.scheduledDueSoon} due soon</span>
          )}
          {stats.scheduledOverdue === 0 && stats.scheduledDueSoon === 0 && (
            <span>No upcoming scheduled operations</span>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-white shadow-theme-xs transition-all ${action.color}`}
            >
              {action.icon}
              <span>{action.label}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5 opacity-70" />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3 uppercase tracking-wide">Stock Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link href="/stock" className="card-corporate p-3 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="stat-label mb-1">Produced</p>
            <AutoAmount value={invStats.totalProduced.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold" />
          </Link>
          <Link href="/stock" className="card-corporate p-3 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="stat-label mb-1">Sold</p>
            <AutoAmount value={invStats.totalSold.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold" />
          </Link>
          <Link href="/stock" className="card-corporate p-3 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="stat-label mb-1">In Stock</p>
            <AutoAmount value={invStats.totalAvailable.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold" />
          </Link>
          <Link href="/transfers" className="card-corporate p-3 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="stat-label mb-1">Pending</p>
            <AutoAmount value={invStats.pendingTransferQty.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold" />
          </Link>
          <Link href="/transfers" className="card-corporate p-3 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="stat-label mb-1">In Transit</p>
            <AutoAmount value={invStats.inTransitQty.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold" />
          </Link>
          <Link href="/stock" className="card-corporate p-3 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="stat-label mb-1 text-gray-400">Wastage</p>
            <AutoAmount value={invStats.totalWastage.toLocaleString()} className="text-blue-600 dark:text-blue-400 !font-semibold" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
          <Link href="/stock" className="card-corporate px-3 py-2 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Factory</p>
            <AutoAmount value={invStats.factoryStock.toLocaleString()} className="text-blue-600 dark:text-blue-400 !text-sm" />
          </Link>
          <Link href="/stock" className="card-corporate px-3 py-2 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Depot</p>
            <AutoAmount value={invStats.depotStock.toLocaleString()} className="text-blue-600 dark:text-blue-400 !text-sm" />
          </Link>
          <Link href="/stock" className="card-corporate px-3 py-2 hover:shadow-theme-md transition-shadow dark:bg-gray-900 dark:border-gray-800 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Vehicle</p>
            <AutoAmount value={invStats.truckStock.toLocaleString()} className="text-blue-600 dark:text-blue-400 !text-sm" />
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

      {(isOwner || isFactoryManager) && lowStockItems.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3 uppercase tracking-wide">
            Low Stock Alerts
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">
              {lowStockCount}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <Link
                key={item._id}
                href="/raw-materials"
                className="flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.currentStock} / {item.minimumStock} {item.unit} — {item.category}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {Math.round(((item.minimumStock - item.currentStock) / item.minimumStock) * 100)}% short
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90 uppercase tracking-wide">Recent Activity</h2>
            <Link href="/activity" className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
              View all <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-theme-sm">
            {recentActivity.map((log) => (
              <div key={log._id} className="flex items-start gap-3 border-b border-gray-100 dark:border-gray-800 px-5 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{log.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${actionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">{log.entity}</span>
                    {log.user && (
                      <span className="text-[10px] text-gray-400">by {log.user.name}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
