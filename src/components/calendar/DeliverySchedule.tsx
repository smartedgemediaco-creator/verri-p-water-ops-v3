"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TruckIcon, TransferIcon, WaterDropIcon } from "@/components/icons/EntityIcons";

interface TransferEvent {
  _id: string;
  fromType: string;
  toType: string;
  quantity: number;
  status: "pending" | "in-transit" | "delivered" | "cancelled";
  date: string;
  fromName?: string;
  toName?: string;
  productName?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400",
  "in-transit": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400",
};

export default function DeliverySchedule() {
  const [transfers, setTransfers] = useState<TransferEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/transfers")
      .then((r) => r.json())
      .then((data) => setTransfers(data.transfers || []))
      .catch(() => {});
  }, []);

  const filtered = filter === "all" ? transfers : transfers.filter((t) => t.status === filter);

  const groupedByDate: Record<string, TransferEvent[]> = {};
  filtered.forEach((t) => {
    const date = new Date(t.date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(t);
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Transfer Schedule
            </h3>
          </div>
          <div className="flex gap-2">
            {["all", "pending", "in-transit", "delivered", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                  filter === s
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {s === "in-transit" ? "In Transit" : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5">
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="text-center py-12">
            <TransferIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No transfers found</p>
            <Link
              href="/transfers/new"
              className="inline-block mt-3 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600"
            >
              Create Transfer
            </Link>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="mb-6 last:mb-0">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <WaterDropIcon className="w-4 h-4 text-brand-500" />
                {date}
                <span className="text-xs text-gray-400 font-normal">
                  ({items.length} transfer{items.length > 1 ? "s" : ""})
                </span>
              </h4>
              <div className="space-y-2">
                {items.map((t) => (
                  <Link
                    key={t._id}
                    href="/transfers"
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                        <TruckIcon className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {t.productName || "Unknown Product"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {t.fromName || t.fromType} → {t.toName || t.toType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t.quantity.toLocaleString()} units
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${statusColors[t.status] || ""}`}>
                        {t.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
