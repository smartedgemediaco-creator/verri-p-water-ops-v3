"use client";

import { useEffect, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { AlertIcon, BoxIconLine, BellIcon } from "@/icons";

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
  lowStock: LowStockItem[];
  inTransit: InTransitItem[];
}

export default function AlertsPage() {
  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <PageBreadcrumb pageTitle="Notifications" />
        </div>
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <PageBreadcrumb pageTitle="Notifications" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <AlertIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Alerts</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{data?.lowStock.length ?? 0}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <BellIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">In-Transit Items</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{data?.inTransit.length ?? 0}</h4>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white/90">
              <AlertIcon className="text-red-500" />
              Low Stock Alerts
            </h2>
          </div>
          {data?.lowStock.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No low stock items.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data?.lowStock.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-800 dark:text-white/90">{item.product}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.locationType} &middot; {item.locationId}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-white/90">
              <BoxIconLine className="text-blue-500" />
              In-Transit Items
            </h2>
          </div>
          {data?.inTransit.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No active transfers.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data?.inTransit.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-gray-800 dark:text-white/90">{item.product}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Truck: {item.truck}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
