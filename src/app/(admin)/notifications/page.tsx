"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { AlertIcon, BoxIconLine, BellIcon } from "@/icons";

interface ActivityItem {
  _id: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
}

interface LowStockItem {
  product: string;
  quantity: number;
  locationType: string;
  locationId: string;
}

interface InTransitItem {
  product: string;
  truck: string;
  quantity: number;
}

interface NotificationData {
  recentActivity: ActivityItem[];
  unreadCount: number;
  lowStock: LowStockItem[];
  inTransit: InTransitItem[];
}

const ENTITY_COLORS: Record<string, string> = {
  sale: "text-green-600 bg-green-100 dark:bg-green-500/10 dark:text-green-400",
  transfer: "text-blue-600 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400",
  cost: "text-red-600 bg-red-100 dark:bg-red-500/10 dark:text-red-400",
  product: "text-purple-600 bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400",
  factory: "text-orange-600 bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400",
  depot: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400",
  truck: "text-yellow-600 bg-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400",
  user: "text-sky-600 bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400",
  "pos-device": "text-indigo-600 bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400",
  import: "text-gray-600 bg-gray-100 dark:bg-gray-500/10 dark:text-gray-400",
};

function timeAgo(dateStr: string) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AlertsPage() {
  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "alerts" | "activity">("all");

  useEffect(() => {
    let cancelled = false;
    const fetchData = () => {
      fetch("/api/notifications")
        .then((res) => { if (!res.ok) throw new Error(`notifications ${res.status}`); return res.json(); })
        .then((d) => { if (!cancelled) setData(d); })
        .catch((e) => console.error("Failed to load notifications:", e))
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <PageBreadcrumb pageTitle="Notifications" />
        </div>
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</div>
      </div>
    );
  }

  const allActivity = data?.recentActivity ?? [];
  const lowStock = data?.lowStock ?? [];
  const inTransit = data?.inTransit ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Notifications" />
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-medium">
          <BellIcon className="size-4" />
          {allActivity.length + lowStock.length + inTransit.length} notifications
        </span>
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "alerts", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {tab === "all" ? "All" : tab === "alerts" ? "Alerts" : "Activity"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 mb-6">
        <Link href="/stock" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <AlertIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Alerts</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{lowStock.length}</h4>
        </Link>
        <Link href="/transfers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <BoxIconLine className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">In-Transit Items</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{inTransit.length}</h4>
        </Link>
      </div>

      {(activeTab === "all" || activeTab === "alerts") && lowStock.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white/90">
              <AlertIcon className="text-red-500" />
              Low Stock Alerts
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {lowStock.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                <div>
                  <p className="font-medium text-sm text-gray-800 dark:text-white/90">{item.product}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.locationType} &middot; {(item.locationId ?? "").slice(-6)}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === "all" || activeTab === "alerts") && inTransit.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white/90">
              <BoxIconLine className="text-blue-500" />
              In-Transit Items
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {inTransit.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                <div>
                  <p className="font-medium text-sm text-gray-800 dark:text-white/90">{item.product}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Truck: {item.truck}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeTab === "all" || activeTab === "activity") && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white/90">
              <BellIcon className="text-brand-500" />
              Recent Activity
              <span className="text-xs font-normal text-gray-400 ml-auto">Last 7 days &middot; {allActivity.length} events</span>
            </h2>
          </div>
          {allActivity.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No recent activity.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {allActivity.map((item) => (
                <div key={item._id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                  <span className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-bold uppercase ${ENTITY_COLORS[item.entity] || "text-gray-500 bg-gray-100 dark:bg-gray-500/10 dark:text-gray-400"}`}>
                    {item.entity.slice(0, 2)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-white/90 leading-snug">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      <span className="capitalize">{item.action}</span>
                      &nbsp;&middot;&nbsp;
                      <span className="capitalize">{item.entity}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
