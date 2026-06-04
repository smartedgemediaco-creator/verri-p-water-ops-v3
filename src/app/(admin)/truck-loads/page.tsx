"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { showSuccess, showError } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PlusIcon, ListIcon } from "@/icons";
import { TransferIcon } from "@/components/icons/EntityIcons";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/dateFormat";
import DisputeButton from "@/components/disputes/DisputeButton";

interface TruckLoad {
  _id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  fromName?: string;
  toName?: string;
  productId: { _id: string; name: string } | null;
  quantity: number;
  loadAmount?: number;
  capacityUsed?: number;
  truckId: { _id: string; plateNumber: string } | null;
  status: string;
  date: string;
}

export default function TruckLoadsPage() {
  const { user } = useAuth();
  const [loads, setLoads] = useState<TruckLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [spoilageTarget, setSpoilageTarget] = useState<TruckLoad | null>(null);
  const [spoilageQty, setSpoilageQty] = useState("0");
  const [spoilageReason, setSpoilageReason] = useState("");
  const [pendingAction, setPendingAction] = useState<{ id: string; action: string } | null>(null);

  const fetchLoads = () => {
    fetch("/api/truck-loads")
      .then((res) => res.json())
      .then((data) => setLoads(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLoads(); }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, { color: "info" | "success" | "error" | "light"; label: string }> = {
      "in-transit": { color: "info", label: "In Transit" },
      delivered: { color: "success", label: "Delivered" },
      cancelled: { color: "error", label: "Cancelled" },
    };
    const s = map[status] ?? { color: "light" as const, label: status };
    return <Badge variant="light" color={s.color}>{s.label}</Badge>;
  };

  const updateStatus = async (id: string, status: string, spoilage?: number, reason?: string) => {
    setActionLoading(id);
    try {
      const body: Record<string, unknown> = { status };
      if (spoilage !== undefined && spoilage > 0) {
        body.spoilage = spoilage;
        body.spoilageReason = reason || "";
      }
      const res = await fetch(`/api/truck-loads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to update");
        throw new Error(err.error || "Failed to update");
      }
      const msgs: Record<string, string> = {
        "in-transit": "Truck dispatched",
        delivered: "Delivery confirmed",
        cancelled: "Load cancelled",
      };
      showSuccess(msgs[status] || `Status changed to ${status}`);
      fetchLoads();
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      throw e;
    } finally {
      setActionLoading(null);
      setSpoilageTarget(null);
    }
  };

  const confirmDelivered = (t: TruckLoad) => {
    const sq = Number(spoilageQty);
    if (sq > t.quantity) {
      showError("Spoilage cannot exceed load quantity");
      return;
    }
    updateStatus(t._id, "delivered", sq, spoilageReason);
  };

  const openSpoilage = (t: TruckLoad) => {
    setSpoilageTarget(t);
    setSpoilageQty("0");
    setSpoilageReason("");
  };

  const confirmStatusAction = async () => {
    if (!pendingAction) return;
    try {
      await updateStatus(pendingAction.id, pendingAction.action);
    } finally {
      setPendingAction(null);
    }
  };

  const canAct = (t: TruckLoad, action: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const uid = (id: string | { _id: string; name?: string } | { _id: string; plateNumber?: string } | undefined) =>
      typeof id === "string" ? id : id?._id ?? "";
    const driverTruckId = uid(user.truckId);
    const fromMatch =
      (t.fromType === "factory" && user.role === "factory-manager" && uid(user.factoryId) === t.fromId) ||
      (t.fromType === "depot" && user.role === "depot-manager" && uid(user.depotId) === t.fromId) ||
      (t.fromType === "truck" && user.role === "driver" && driverTruckId === t.fromId);
    const toMatch =
      (t.toType === "factory" && user.role === "factory-manager" && uid(user.factoryId) === t.toId) ||
      (t.toType === "depot" && user.role === "depot-manager" && uid(user.depotId) === t.toId) ||
      (t.toType === "truck" && user.role === "driver" && driverTruckId === t.toId);
    const isAssignedDriver = user.role === "driver" && driverTruckId === t.truckId?._id;
    if (action === "delivered") return toMatch || isAssignedDriver;
    if (action === "cancelled") return fromMatch || toMatch || isAssignedDriver;
    return false;
  };

  const byStatus = (status: string) => loads.filter((t) => t.status === status).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Truck Loads" />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">{user?.name ?? user?.email ?? ""}</span>
          <Link href="/transfers/new">
            <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
              Load Truck
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/truck-loads" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <TransferIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Loads</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{loads.length}</h4>
        </Link>
        <Link href="/truck-loads" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <ListIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">In Transit</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{byStatus("in-transit")}</h4>
        </Link>
        <Link href="/truck-loads" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <ListIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Delivered</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{byStatus("delivered")}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">From</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">To</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Product</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Qty</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Capacity</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Truck</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>Loading...</TableCell>
              </TableRow>
            ) : loads.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>No truck loads found. Click &quot;Load Truck&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              loads.map((t) => {
                const capPct = t.capacityUsed ? `${Math.round(t.capacityUsed)}%` : "—";
                return (
                  <TableRow key={t._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{
                      t.fromName ? (
                        t.fromType === "factory" ? <Link href={`/factories/${t.fromId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.fromName}</Link> :
                        t.fromType === "depot" ? <Link href={`/depots/${t.fromId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.fromName}</Link> :
                        t.fromType === "truck" ? <Link href={`/trucks/${t.fromId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.fromName}</Link> :
                        <span>{t.fromName}</span>
                      ) : `${t.fromType} (${(t.fromId ?? "").slice(-6)})`
                    }</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{
                      t.toName ? (
                        t.toType === "factory" ? <Link href={`/factories/${t.toId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.toName}</Link> :
                        t.toType === "depot" ? <Link href={`/depots/${t.toId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.toName}</Link> :
                        t.toType === "truck" ? <Link href={`/trucks/${t.toId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.toName}</Link> :
                        <span>{t.toName}</span>
                      ) : `${t.toType} (${(t.toId ?? "").slice(-6)})`
                    }</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{t.productId?._id ? <Link href={`/products/${t.productId._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{t.productId.name}</Link> : "N/A"}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(t.quantity ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{capPct}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{t.truckId?._id ? <Link href={`/trucks/${t.truckId._id}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.truckId.plateNumber}</Link> : <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell className="py-3">{statusBadge(t.status)}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(t.date)}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1.5 items-center">
                        {t.status === "in-transit" && canAct(t, "delivered") && (
                          <Button size="sm" disabled={actionLoading === t._id} onClick={() => openSpoilage(t)}>
                            {actionLoading === t._id ? "..." : "Confirm"}
                          </Button>
                        )}
                        {t.status === "in-transit" && canAct(t, "cancelled") && (
                          <Button size="sm" variant="outline" disabled={actionLoading === t._id} onClick={() => setPendingAction({ id: t._id, action: "cancelled" })}>
                            {actionLoading === t._id ? "..." : "Cancel"}
                          </Button>
                        )}
                        <DisputeButton entity="truck-load" entityId={t._id} entityLabel={`${t.productId?.name ?? "load"} x${(t.quantity ?? 0).toLocaleString()}`} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {spoilageTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setSpoilageTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Confirm Delivery</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {(spoilageTarget.quantity ?? 0).toLocaleString()} units of{" "}
              {spoilageTarget.productId?.name ?? "product"} — any spoilage?
            </p>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Damaged / Spoiled</label>
              <input type="text" inputMode="numeric" min="0" max={spoilageTarget.quantity} value={spoilageQty} onChange={(e) => { const raw = e.target.value; if (raw === "" || /^\d+$/.test(raw)) setSpoilageQty(raw); }} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
              <input type="text" value={spoilageReason} onChange={(e) => setSpoilageReason(e.target.value)} placeholder="e.g. sachets damaged" className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setSpoilageTarget(null)}>Cancel</Button>
              <Button size="sm" onClick={() => confirmDelivered(spoilageTarget)}>Confirm Delivery</Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmStatusAction}
        title={pendingAction?.action === "cancelled" ? "Cancel Load" : "Confirm Delivery"}
        message={
          pendingAction?.action === "cancelled"
            ? "You are about to cancel this truck load. Stock will return to the origin."
            : "Confirm this delivery."
        }
        confirmLabel={pendingAction?.action === "cancelled" ? "Cancel Load" : "Confirm Delivery"}
        variant="warning"
      />
    </div>
  );
}
