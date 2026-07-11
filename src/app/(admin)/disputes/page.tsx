"use client";

import { useEffect, useState, useCallback } from "react";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { showSuccess, showError } from "@/lib/toast";
import { formatDate } from "@/lib/dateFormat";
import { useAuth } from "@/context/AuthContext";
import { PlusIcon } from "@/icons";

interface Dispute {
  _id: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  reason: string;
  description: string;
  status: "pending" | "confirmed" | "resolved" | "dismissed";
  resolution: string;
  createdBy: { _id: string; name: string; email: string };
  confirmedBy?: { _id: string; name: string; email: string };
  resolvedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

const statusBadge = (s: string) => {
  const map: Record<string, { color: "warning" | "success" | "error" | "info"; label: string }> = {
    pending: { color: "warning", label: "Pending" },
    confirmed: { color: "info", label: "Confirmed" },
    resolved: { color: "success", label: "Resolved" },
    dismissed: { color: "error", label: "Dismissed" },
  };
  const m = map[s] ?? { color: "light" as const, label: s };
  return <Badge variant="light" color={m.color}>{m.label}</Badge>;
};

export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionTarget, setActionTarget] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [action, setAction] = useState<"resolved" | "dismissed">("resolved");
  const [saving, setSaving] = useState(false);

  const fetchDisputes = useCallback(() => {
    setLoading(true);
    fetch(`/api/disputes?status=${statusFilter}`)
      .then((r) => r.json())
      .then((data) => setDisputes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]); // eslint-disable-line react-hooks/set-state-in-effect

  const resolveDispute = async () => {
    if (!actionTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/disputes/${actionTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, resolution }),
      });
      if (!res.ok) { showError("Failed to update"); return; }
      showSuccess(`Dispute ${action}`);
      setActionTarget(null);
      setResolution("");
      fetchDisputes();
    } catch { showError("Network error"); }
    finally { setSaving(false); }
  };

  const isAdmin = user?.role === "admin";
  const isManager = isAdmin || user?.role === "factory-manager" || user?.role === "depot-manager";
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ entity: "production", entityId: "", entityLabel: "", reason: "", description: "" });
  const [formSaving, setFormSaving] = useState(false);

  const entityOptions = ["production", "sale", "transfer", "stock", "quality", "delivery", "payment", "other"];

  const handleFileDispute = async () => {
    if (!formData.entityId || !formData.reason) { showError("Entity ID and reason are required"); return; }
    setFormSaving(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { showError("Failed to file dispute"); return; }
      showSuccess("Dispute filed");
      setShowForm(false);
      setFormData({ entity: "production", entityId: "", entityLabel: "", reason: "", description: "" });
      fetchDisputes();
    } catch { showError("Network error"); }
    finally { setFormSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Disputes" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowForm(true)}>
            <PlusIcon className="size-4" />
            File a Dispute
          </Button>
          {["all", "pending", "confirmed", "resolved", "dismissed"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Entity</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Reason</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Filed By</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Details</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              {isManager && <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Action</TableCell>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 text-sm" colSpan={isManager ? 7 : 6}>Loading...</TableCell></TableRow>
            ) : disputes.length === 0 ? (
              <TableRow><TableCell className="text-center py-10 text-gray-500 text-sm" colSpan={isManager ? 7 : 6}>No disputes found.</TableCell></TableRow>
            ) : (
              disputes.map((d) => (
                <TableRow key={d._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90 capitalize">{d.entity} <span className="text-gray-400">{d.entityLabel || ""}</span></TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{d.reason.replace(/-/g, " ")}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{d.createdBy?.name ?? d.createdBy?.email ?? "—"}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{d.description || d.entityLabel || "—"}</TableCell>
                  <TableCell className="py-3">{statusBadge(d.status)}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(d.createdAt)}</TableCell>
                  {isManager && (
                    <TableCell className="py-3">
                      {d.status === "pending" && (
                        <div className="flex gap-1.5">
                          {isAdmin ? (
                            <>
                              <Button size="sm" onClick={() => { setActionTarget(d); setAction("resolved"); setResolution(""); }}>Resolve</Button>
                              <Button size="sm" variant="outline" onClick={() => { setActionTarget(d); setAction("dismissed"); setResolution(""); }}>Dismiss</Button>
                            </>
                          ) : (
                            <Button size="sm" onClick={async () => {
                              try {
                                const res = await fetch(`/api/disputes/${d._id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "confirmed" }),
                                });
                                if (!res.ok) { showError("Failed to confirm"); return; }
                                showSuccess("Dispute confirmed");
                                fetchDisputes();
                              } catch { showError("Network error"); }
                            }}>Confirm</Button>
                          )}
                        </div>
                      )}
                      {d.status === "confirmed" && (
                        <span className="text-xs text-gray-400">
                          Confirmed{d.confirmedBy ? ` by ${(d.confirmedBy as { name: string }).name ?? "manager"}` : ""}
                        </span>
                      )}
                      {(d.status === "resolved" || d.status === "dismissed") && (
                        <span className="text-xs text-gray-400">
                          {d.status} by {d.resolvedBy?.name ?? "admin"}
                          {d.resolution ? `: ${d.resolution}` : ""}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {actionTarget && isAdmin && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setActionTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              {action === "resolved" ? "Resolve Dispute" : "Dismiss Dispute"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {actionTarget.entity} {actionTarget.entityLabel || ""} — {actionTarget.reason.replace(/-/g, " ")}
            </p>
            {actionTarget.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {actionTarget.description}
              </p>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution notes</label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Optional notes about this resolution..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setActionTarget(null)}>Cancel</Button>
              <Button size="sm" disabled={saving} onClick={resolveDispute}>
                {saving ? "Saving..." : action === "resolved" ? "Mark Resolved" : "Dismiss"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">File a Dispute</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</label>
              <select
                value={formData.entity}
                onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              >
                {entityOptions.map((e) => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity ID</label>
              <input
                value={formData.entityId}
                onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                placeholder="e.g. 60f7b1c5d4a5b2c3d4e5f6a7"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Label</label>
              <input
                value={formData.entityLabel}
                onChange={(e) => setFormData({ ...formData, entityLabel: e.target.value })}
                placeholder="e.g. Production Batch #123"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g. damaged-goods"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue in detail..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" disabled={formSaving} onClick={handleFileDispute}>
                {formSaving ? "Saving..." : "File Dispute"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
