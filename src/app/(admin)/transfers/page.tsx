"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, ListIcon } from "@/icons";
import { TransferIcon } from "@/components/icons/EntityIcons";
import { useAuth } from "@/context/AuthContext";

interface Transfer {
  _id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  productId: { _id: string; name: string } | null;
  quantity: number;
  truckId: { _id: string; plateNumber: string } | null;
  status: string;
  date: string;
}

export default function TransfersPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTransfers = () => {
    fetch("/api/transfers")
      .then((res) => res.json())
      .then((data) => setTransfers(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTransfers(); }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, { color: "warning" | "info" | "success" | "error"; label: string }> = {
      pending: { color: "warning", label: "Pending" },
      "in-transit": { color: "info", label: "In Transit" },
      delivered: { color: "success", label: "Delivered" },
      cancelled: { color: "error", label: "Cancelled" },
    };
    const s = map[status] ?? { color: "light" as const, label: status };
    return <Badge variant="light" color={s.color}>{s.label}</Badge>;
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to update");
      } else {
        fetchTransfers();
      }
    } catch {
      alert("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const canAct = (t: Transfer, action: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;

    const fromMatch =
      (t.fromType === "factory" && user.role === "factory-manager" && user.factoryId === t.fromId) ||
      (t.fromType === "depot" && user.role === "depot-manager" && user.depotId === t.fromId);
    const toMatch =
      (t.toType === "factory" && user.role === "factory-manager" && user.factoryId === t.toId) ||
      (t.toType === "depot" && user.role === "depot-manager" && user.depotId === t.toId);

    if (action === "in-transit") return fromMatch;
    if (action === "delivered") return toMatch;
    if (action === "cancelled") return fromMatch || toMatch;
    return false;
  };

  const byStatus = (status: string) => transfers.filter((t) => t.status === status).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Transfers" />
        <Link href="/transfers/new">
          <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
            New Transfer
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <TransferIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Transfers</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{transfers.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg dark:bg-yellow-500/10 mb-3">
            <ListIcon className="text-yellow-600 size-5 dark:text-yellow-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{byStatus("pending")}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <ListIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">In Transit</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{byStatus("in-transit")}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <ListIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Delivered</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{byStatus("delivered")}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">From</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">To</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Product</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Truck</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>No transfers found. Click &quot;New Transfer&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              transfers.map((t) => (
                <TableRow key={t._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{t.fromType} ({t.fromId.slice(-6)})</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{t.toType} ({t.toId.slice(-6)})</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{t.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{t.quantity.toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{t.truckId?.plateNumber ?? <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell className="py-3">{statusBadge(t.status)}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{t.date ? new Date(t.date).toLocaleDateString() : "N/A"}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-1.5">
                      {t.status === "pending" && canAct(t, "in-transit") && (
                        <Button size="sm" disabled={actionLoading === t._id} onClick={() => updateStatus(t._id, "in-transit")}>
                          {actionLoading === t._id ? "..." : "Dispatch"}
                        </Button>
                      )}
                      {t.status === "in-transit" && canAct(t, "delivered") && (
                        <Button size="sm" disabled={actionLoading === t._id} onClick={() => updateStatus(t._id, "delivered")}>
                          {actionLoading === t._id ? "..." : "Confirm"}
                        </Button>
                      )}
                      {(t.status === "pending" || t.status === "in-transit") && canAct(t, "cancelled") && (
                        <Button size="sm" variant="outline" disabled={actionLoading === t._id} onClick={() => updateStatus(t._id, "cancelled")}>
                          {actionLoading === t._id ? "..." : "Cancel"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
