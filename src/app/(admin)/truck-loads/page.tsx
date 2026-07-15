"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import { showSuccess, showError } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PlusIcon, ListIcon } from "@/icons";
import { TransferIcon } from "@/components/icons/EntityIcons";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/dateFormat";

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
  notes?: string;
}

export default function TruckLoadsPage() {
  const { user } = useAuth();
  const [loads, setLoads] = useState<TruckLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [spoilageTarget, setSpoilageTarget] = useState<TruckLoad | null>(null);
  const [spoilageQty, setSpoilageQty] = useState("0");
  const [spoilageReason, setSpoilageReason] = useState("");
  const [pendingAction, setPendingAction] = useState<{ id: string; action: string } | null>(null);

  const [editTarget, setEditTarget] = useState<TruckLoad | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);
  const [trucks, setTrucks] = useState<{ value: string; label: string }[]>([]);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

  const [formFromType, setFormFromType] = useState("");
  const [formFromId, setFormFromId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formTruckId, setFormTruckId] = useState("");
  const [formLoadType, setFormLoadType] = useState("dispatch");
  const [formToType, setFormToType] = useState("");
  const [formToId, setFormToId] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const fetchLoads = () => {
    fetch("/api/truck-loads")
      .then((res) => res.json())
      .then((data) => setLoads(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLoads(); }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/factories").then(r => r.json()),
      fetch("/api/depots").then(r => r.json()),
      fetch("/api/trucks").then(r => r.json()),
      fetch("/api/products").then(r => r.json()),
    ]).then(([f, d, t, p]) => {
      setFactories((Array.isArray(f) ? f : []).map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      setDepots((Array.isArray(d) ? d : []).map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      setTrucks((Array.isArray(t) ? t : []).map((x: { _id: string; plateNumber: string }) => ({ value: x._id, label: x.plateNumber })));
      setProducts((Array.isArray(p) ? p : []).map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
    });
  }, []);

  const sourceOptions = [
    ...factories.map(f => ({ ...f, group: "Factory" })),
    ...depots.map(d => ({ ...d, group: "Depot" })),
  ];

  const destinationOptions = [
    ...factories.map(f => ({ ...f, group: "Factory" })),
    ...depots.map(d => ({ ...d, group: "Depot" })),
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, { color: "info" | "success" | "error" | "warning" | "light"; label: string }> = {
      "in-transit": { color: "info", label: "In Transit" },
      delivered: { color: "success", label: "Delivered" },
      cancelled: { color: "error", label: "Cancelled" },
      dispatched: { color: "warning", label: "Dispatched" },
    };
    const s = map[status] ?? { color: "light" as const, label: status };
    return <Badge variant="light" color={s.color}>{s.label}</Badge>;
  };

  const filtered = statusFilter === "all" ? loads : loads.filter((t) => t.status === statusFilter);

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

  const openEdit = (t: TruckLoad) => {
    setEditTarget(t);
    setEditQty(String(t.quantity ?? ""));
    setEditAmount(String(t.loadAmount ?? ""));
    setEditDate(t.date ? t.date.slice(0, 10) : "");
    setEditNotes(t.notes ?? "");
  };

  const doEdit = async () => {
    if (!editTarget) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/truck-loads/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: Number(editQty), loadAmount: Number(editAmount) || 0, date: editDate, notes: editNotes }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed" })); showError(err.error || "Failed to update"); return; }
      showSuccess("Load updated");
      setEditTarget(null);
      fetchLoads();
    } catch { showError("Network error"); } finally { setEditSubmitting(false); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/truck-loads/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) { showError("Failed to delete"); return; }
    showSuccess("Load deleted");
    setDeleteTarget(null);
    fetchLoads();
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

  const byStatus = (s: string) => loads.filter((t) => t.status === s).length;

  const resetForm = () => {
    setFormFromType("");
    setFormFromId("");
    setFormProductId("");
    setFormQuantity("");
    setFormTruckId("");
    setFormLoadType("dispatch");
    setFormToType("");
    setFormToId("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormNotes("");
    setFormAmount("");
  };

  const handleCreateLoad = async () => {
    if (!formFromType || !formFromId || !formProductId || !formQuantity || !formTruckId) {
      showError("Please fill in all required fields");
      return;
    }
    if (formLoadType === "transfer" && (!formToType || !formToId)) {
      showError("Please select a destination for transfer");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        fromType: formFromType,
        fromId: formFromId,
        productId: formProductId,
        quantity: Number(formQuantity),
        truckId: formTruckId,
        date: formDate,
        notes: formNotes,
        loadAmount: formAmount ? Number(formAmount) : 0,
      };
      if (formLoadType === "transfer") {
        body.toType = formToType;
        body.toId = formToId;
      } else {
        body.toType = "customer";
      }
      const res = await fetch("/api/truck-loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to create load");
        return;
      }
      showSuccess(formLoadType === "dispatch" ? "Truck dispatched for direct sale" : "Truck loaded for transfer");
      setShowForm(false);
      resetForm();
      fetchLoads();
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { key: "all", label: "All", count: loads.length },
    { key: "dispatched", label: "Dispatched", count: byStatus("dispatched") },
    { key: "in-transit", label: "In Transit", count: byStatus("in-transit") },
    { key: "delivered", label: "Delivered", count: byStatus("delivered") },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Delivery Loads" />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">{user?.name ?? user?.email ?? ""}</span>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => setShowForm(true)}>
            Load Truck/Tricycle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <TransferIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Loads</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{loads.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-3">
            <ListIcon className="text-orange-600 size-5 dark:text-orange-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Dispatched (Direct Sale)</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{byStatus("dispatched")}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <ListIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">In Transit (Transfer)</p>
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

      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === t.key
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">From</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">To</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Product</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Qty</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Truck</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={8}>No delivery loads found.</TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => {
                const isDispatch = t.toType === "customer" || t.status === "dispatched";
                return (
                  <TableRow key={t._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">
                      {t.fromName ? (
                        t.fromType === "factory" ? <Link href={`/factories/${t.fromId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.fromName}</Link> :
                        t.fromType === "depot" ? <Link href={`/depots/${t.fromId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.fromName}</Link> :
                        t.fromType === "truck" ? <Link href={`/trucks/${t.fromId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.fromName}</Link> :
                        <span>{t.fromName}</span>
                      ) : t.fromType
                    }
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 capitalize">
                      {isDispatch ? (
                        <span className="text-theme-sm text-orange-600 dark:text-orange-400 font-medium">Direct Sale</span>
                      ) : t.toName ? (
                        t.toType === "factory" ? <Link href={`/factories/${t.toId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.toName}</Link> :
                        t.toType === "depot" ? <Link href={`/depots/${t.toId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.toName}</Link> :
                        t.toType === "truck" ? <Link href={`/trucks/${t.toId}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.toName}</Link> :
                        <span>{t.toName}</span>
                      ) : t.toType
                    }
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">{t.productId?._id ? <Link href={`/products/${t.productId._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{t.productId.name}</Link> : "N/A"}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{(t.quantity ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{t.truckId?._id ? <Link href={`/trucks/${t.truckId._id}`} className="text-theme-sm text-blue-600 dark:text-blue-400 hover:underline">{t.truckId.plateNumber}</Link> : <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell className="py-3">{statusBadge(t.status)}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(t.date)}</TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1.5 items-center flex-wrap">
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
                        {user?.role === "admin" && (
                          <>
                            <button onClick={() => openEdit(t)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">Edit</button>
                            {t.status !== "delivered" && (
                              <button onClick={() => setDeleteTarget(t._id)} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">Delete</button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Load Truck/Tricycle</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Load Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormLoadType("dispatch")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                    formLoadType === "dispatch"
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  Dispatch (Direct Sale)
                </button>
                <button
                  onClick={() => setFormLoadType("transfer")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                    formLoadType === "transfer"
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  Transfer
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <Select
                    options={[
                      { value: "factory", label: "Factory" },
                      { value: "depot", label: "Depot" },
                    ]}
                    placeholder="Type"
                    value={formFromType}
                    onChange={setFormFromType}
                  />
                </div>
                <div className="flex-1">
                  <Select
                    options={formFromType === "factory" ? factories : formFromType === "depot" ? depots : []}
                    placeholder="Location"
                    value={formFromId}
                    onChange={setFormFromId}
                  />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
              <Select
                options={products}
                placeholder="Select product"
                value={formProductId}
                onChange={setFormProductId}
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <Input
                type="number"
                placeholder="Units"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Truck</label>
              <Select
                options={trucks}
                placeholder="Select truck"
                value={formTruckId}
                onChange={setFormTruckId}
              />
            </div>

            {formLoadType === "transfer" && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
                <div className="flex gap-2">
                  <div className="w-1/3">
                    <Select
                      options={[
                        { value: "factory", label: "Factory" },
                        { value: "depot", label: "Depot" },
                      ]}
                      placeholder="Type"
                      value={formToType}
                      onChange={setFormToType}
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      options={formToType === "factory" ? factories : formToType === "depot" ? depots : []}
                      placeholder="Location"
                      value={formToId}
                      onChange={setFormToId}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Load Amount (₦) <span className="text-gray-400 font-normal">optional</span></label>
              <Input
                type="number"
                placeholder="0"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 font-normal">optional</span></label>
              <input
                type="text"
                placeholder="Any notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button size="sm" onClick={handleCreateLoad} disabled={submitting}>
                {submitting ? "Loading..." : formLoadType === "dispatch" ? "Dispatch Vehicle" : "Load Truck/Tricycle"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
        title={pendingAction?.action === "cancelled" ? "Cancel Transfer" : "Confirm Delivery"}
        message={
          pendingAction?.action === "cancelled"
            ? "Stock will return to the origin location."
            : "Confirm this delivery."
        }
        confirmLabel={pendingAction?.action === "cancelled" ? "Cancel Transfer" : "Confirm Delivery"}
        variant="warning"
      />

      {editTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setEditTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Edit Load</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <Input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Load Amount (₦)</label>
              <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button size="sm" disabled={editSubmitting} onClick={doEdit}>{editSubmitting ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Load"
        message="This will permanently delete this truck load record. Stock adjustments will NOT be reversed."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
