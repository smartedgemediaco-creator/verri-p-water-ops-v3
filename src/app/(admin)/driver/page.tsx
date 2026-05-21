"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { TruckIcon, WaterDropIcon } from "@/components/icons/EntityIcons";
import { DollarLineIcon, AlertIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";

interface Transfer {
  _id: string;
  fromType: "factory" | "depot";
  fromId: { _id: string; name: string };
  toType: "factory" | "depot";
  toId: { _id: string; name: string };
  productId: { _id: string; name: string };
  quantity: number;
  truckId: { _id: string; plateNumber: string };
  status: string;
  date: string;
  notes: string;
}

interface InventoryItem {
  _id: string;
  productId: { _id: string; name: string };
  quantity: number;
  locationType: string;
}

const statusBadge = (status: string) => {
  const colorMap: Record<string, "primary" | "warning" | "success" | "info"> = {
    pending: "warning",
    "in-transit": "primary",
    delivered: "success",
    cancelled: "info",
  };
  return <Badge variant="light" color={colorMap[status] ?? "light"}>{status}</Badge>;
};

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const truckId =
    user?.truckId && typeof user.truckId === "object"
      ? user.truckId._id
      : user?.truckId ?? null;
  const truckPlate =
    user?.truckId && typeof user.truckId === "object"
      ? user.truckId.plateNumber
      : truckId
      ? `Truck (${(truckId as string).slice(-6)})`
      : "";

  const fetchData = useCallback(() => {
    if (!truckId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/transfers?truckId=${truckId}&status=pending,in-transit`).then((r) => r.json()),
      fetch(`/api/inventory?locationType=truck&locationId=${truckId}`).then((r) => r.json()),
    ])
      .then(([transfersData, invData]) => {
        setTransfers(Array.isArray(transfersData) ? transfersData : []);
        setInventory(Array.isArray(invData) ? invData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [truckId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      showSuccess(`Transfer marked as ${status}`);
      fetchData();
    } catch {
      showError("Failed to update transfer");
    }
  };

  const activeCount = transfers.filter((t) => t.status === "in-transit").length;
  const pendingCount = transfers.filter((t) => t.status === "pending").length;
  const truckStock = inventory.reduce((sum, i) => sum + (i.quantity ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
            {user?.role === "driver" ? `My Dashboard` : `Driver Portal`}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {truckPlate ? `Truck: ${truckPlate}` : "No truck assigned"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <TruckIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Truck Stock</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {(truckStock ?? 0).toLocaleString()}
          </h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-3">
            <AlertIcon className="text-amber-600 size-5 dark:text-amber-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Pickups</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{pendingCount}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <TruckIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Deliveries</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{activeCount}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <DollarLineIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Quick Actions</p>
          <div className="mt-2 flex gap-2">
            <Link href="/sales/new"><Button variant="primary" size="sm">Record Sale</Button></Link>
            <Link href="/inventory"><Button variant="outline" size="sm">Stock</Button></Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Active Transfers</h2>
            <Link href="/transfers" className="text-sm text-brand-500 hover:underline">View all</Link>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Loading transfers...</p>
          ) : !truckId ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No truck assigned to your account.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Contact an admin to link your account to a truck.</p>
            </div>
          ) : transfers.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No active transfers. All clear!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Product</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">From</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">To</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Qty</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t._id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="py-3 px-2 font-medium text-gray-800 dark:text-white/90">{t.productId?.name ?? "—"}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{t.fromId?.name ?? t.fromType}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{t.toId?.name ?? t.toType}</td>
                      <td className="py-3 px-2 text-right font-medium text-gray-800 dark:text-white/90">{(t.quantity ?? 0).toLocaleString()}</td>
                      <td className="py-3 px-2 text-center">{statusBadge(t.status)}</td>
                      <td className="py-3 px-2 text-right">
                        {t.status === "pending" && (
                          <Button variant="primary" size="sm" onClick={() => updateStatus(t._id, "in-transit")}>
                            Start Trip
                          </Button>
                        )}
                        {t.status === "in-transit" && (
                          <Button variant="outline" size="sm" onClick={() => updateStatus(t._id, "delivered")}>
                            Mark Delivered
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Links</h2>
          <div className="space-y-3">
            <Link href="/sales" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <DollarLineIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sales</span>
            </Link>
            <Link href="/sales/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <DollarLineIcon className="w-5 h-5 text-brand-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Record New Sale</span>
            </Link>
            <Link href="/inventory" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <WaterDropIcon className="w-5 h-5 text-cyan-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Inventory</span>
            </Link>
            <Link href="/transfers" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All Transfers</span>
            </Link>
            <Link href="/products" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <WaterDropIcon className="w-5 h-5 text-teal-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Products</span>
            </Link>
            <Link href="/notifications" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <AlertIcon className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
