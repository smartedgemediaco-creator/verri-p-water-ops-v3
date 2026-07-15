"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { AlertIcon, PlusIcon, CloseIcon, CheckCircleIcon, TimeIcon, PencilIcon, TrashBinIcon } from "@/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface ScheduledOperation {
  _id: string;
  title: string;
  description: string;
  entityType: string;
  entityId?: string;
  frequency: string;
  customDays?: number;
  dueDate: string;
  leadDays: number;
  autoReschedule: boolean;
  completedAt?: string;
  isActive: boolean;
  priority: string;
  createdBy: string;
  assignedTo?: string;
  tags: string[];
  result?: string;
}

const ENTITY_TYPES = [
  { value: "", label: "All Types" },
  { value: "truck", label: "Truck" },
  { value: "factory", label: "Factory" },
  { value: "depot", label: "Depot" },
  { value: "staff", label: "Staff" },
  { value: "customer", label: "Customer" },
  { value: "product", label: "Product" },
  { value: "raw-material", label: "Raw Material" },
  { value: "general", label: "General" },
];

const PRIORITIES = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const FREQUENCIES = [
  { value: "one-time", label: "One Time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];

const entityTypeLabel: Record<string, string> = {
  truck: "Truck", factory: "Factory", depot: "Depot",
  staff: "Staff", customer: "Customer", product: "Product",
  "raw-material": "Raw Material", general: "General",
};

function getStatus(item: ScheduledOperation): { label: string; color: "error" | "warning" | "success" | "light" } {
  if (item.completedAt) return { label: "Completed", color: "light" };
  if (!item.isActive) return { label: "Inactive", color: "light" };
  const now = new Date();
  const due = new Date(item.dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Overdue", color: "error" };
  if (diffDays <= item.leadDays) return { label: "Due Soon", color: "warning" };
  return { label: "On Track", color: "success" };
}

const priorityColor: Record<string, "light" | "info" | "warning" | "error"> = {
  low: "light", medium: "info", high: "warning", critical: "error",
};

function getEntityHref(item: ScheduledOperation): string | null {
  if (!item.entityId) return null;
  const map: Record<string, string> = {
    truck: "/trucks", factory: "/factories", depot: "/depots",
    staff: "/staff", customer: "/customers", product: "/products",
  };
  const base = map[item.entityType];
  return base ? `${base}/${item.entityId}` : null;
}

export default function ScheduledOperationsPage() {
  const [items, setItems] = useState<ScheduledOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ScheduledOperation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { ref, loading: pdfLoading, download } = usePdfDownload("scheduled-ops-list");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", entityType: "general", entityId: "",
    frequency: "one-time", customDays: 30, dueDate: "", leadDays: 3,
    autoReschedule: false, priority: "medium", tags: "", assignedTo: "",
  });

  const fetchItems = () => {
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterEntityType) params.set("entityType", filterEntityType);
    if (filterPriority) params.set("priority", filterPriority);
    if (search) params.set("search", search);
    fetch(`/api/scheduled-operations?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, [filterStatus, filterEntityType, filterPriority, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "", description: "", entityType: "general", entityId: "",
      frequency: "one-time", customDays: 30, dueDate: "", leadDays: 3,
      autoReschedule: false, priority: "medium", tags: "", assignedTo: "",
    });
    setShowModal(true);
  };

  const openEdit = (item: ScheduledOperation) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? "",
      entityType: item.entityType,
      entityId: item.entityId ?? "",
      frequency: item.frequency,
      customDays: item.customDays ?? 30,
      dueDate: new Date(item.dueDate).toISOString().slice(0, 10),
      leadDays: item.leadDays,
      autoReschedule: item.autoReschedule,
      priority: item.priority,
      tags: (item.tags ?? []).join(", "),
      assignedTo: item.assignedTo ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.dueDate) return;
    setSaving(true);
    const body = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      entityId: form.entityId || undefined,
      assignedTo: form.assignedTo || undefined,
    };
    try {
      if (editing) {
        const res = await fetch(`/api/scheduled-operations/${editing._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update");
        showSuccess("Scheduled operation updated");
      } else {
        const res = await fetch("/api/scheduled-operations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create");
        showSuccess("Scheduled operation created");
      }
      setShowModal(false);
      fetchItems();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (item: ScheduledOperation) => {
    try {
      const res = await fetch(`/api/scheduled-operations/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to complete");
      showSuccess("Marked as complete");
      fetchItems();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const snooze = async (item: ScheduledOperation) => {
    const newDue = new Date(item.dueDate);
    newDue.setDate(newDue.getDate() + item.leadDays);
    try {
      const res = await fetch(`/api/scheduled-operations/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDue.toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to snooze");
      showSuccess(`Snoozed by ${item.leadDays} days`);
      fetchItems();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/scheduled-operations/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setItems((prev) => prev.filter((i) => i._id !== deleteTarget));
    showSuccess("Scheduled operation deleted");
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const totalActive = items.filter((i) => i.isActive && !i.completedAt).length;
  const overdue = items.filter((i) => i.isActive && !i.completedAt && new Date(i.dueDate) < now).length;
  const completedToday = items.filter((i) => {
    if (!i.completedAt) return false;
    const c = new Date(i.completedAt);
    return c >= todayStart && c < todayEnd;
  }).length;
  const highCritical = items.filter((i) => (i.priority === "high" || i.priority === "critical") && i.isActive && !i.completedAt).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Scheduled Operations" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={openCreate}>
            New Scheduled Operation
          </Button>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 mb-6">
        <Link href="/scheduled-operations" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <AlertIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Active</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalActive}</h4>
        </Link>
        <Link href="/scheduled-operations" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <AlertIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{overdue}</h4>
        </Link>
        <Link href="/scheduled-operations" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <CheckCircleIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed Today</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{completedToday}</h4>
        </Link>
        <Link href="/scheduled-operations" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-3">
            <AlertIcon className="text-orange-600 size-5 dark:text-orange-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">High / Critical</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{highCritical}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 dark:text-gray-400">Search</label>
            <InputField placeholder="Search by title..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 dark:text-gray-400">Status</label>
            <Select options={STATUS_OPTIONS} value={filterStatus} onChange={setFilterStatus} />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 dark:text-gray-400">Entity Type</label>
            <Select options={ENTITY_TYPES} value={filterEntityType} onChange={setFilterEntityType} />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 dark:text-gray-400">Priority</label>
            <Select options={PRIORITIES} value={filterPriority} onChange={setFilterPriority} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Title</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Entity</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Due Date</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Priority</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Lead</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>No scheduled operations found. Click &quot;New Scheduled Operation&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const status = getStatus(item);
                const href = getEntityHref(item);
                return (
                  <TableRow key={item._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {item.title}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {href ? (
                        <Link href={href} className="text-brand-500 hover:underline">
                          {entityTypeLabel[item.entityType] ?? item.entityType}
                        </Link>
                      ) : (
                        entityTypeLabel[item.entityType] ?? item.entityType
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {formatDate(item.dueDate)}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="light" color={priorityColor[item.priority] ?? "light"} size="sm">
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="light" color={status.color} size="sm">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {item.completedAt ? "-" : (() => {
                        const diff = Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return diff <= 0 ? "0 days" : `${diff} days`;
                      })()}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1.5">
                        {!item.completedAt && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => markComplete(item)}>
                              <CheckCircleIcon className="size-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => snooze(item)}>
                              <TimeIcon className="size-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                              <PencilIcon className="size-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setDeleteTarget(item._id)}>
                          <TrashBinIcon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">{editing ? "Edit Scheduled Operation" : "New Scheduled Operation"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title *</label>
                <InputField value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Inspect delivery truck" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Optional details" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Entity Type</label>
                  <Select options={ENTITY_TYPES.filter((e) => e.value !== "")} value={form.entityType} onChange={(v) => setForm({ ...form, entityType: v })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Entity ID (optional)</label>
                  <InputField value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} placeholder="MongoDB ObjectId" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Frequency</label>
                  <Select options={FREQUENCIES} value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })} />
                </div>
                {form.frequency === "custom" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Custom Days</label>
                    <InputField type="number" value={form.customDays} onChange={(e) => setForm({ ...form, customDays: Number(e.target.value) })} min="1" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date *</label>
                  <InputField type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lead Days</label>
                  <InputField type="number" value={form.leadDays} onChange={(e) => setForm({ ...form, leadDays: Number(e.target.value) })} min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                  <Select options={PRIORITIES.filter((p) => p.value !== "")} value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.autoReschedule} onChange={(e) => setForm({ ...form, autoReschedule: e.target.checked })} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Auto-reschedule</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tags (comma separated)</label>
                <InputField value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. inspection, safety, weekly" />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-gray-200 dark:border-gray-800">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !form.title.trim() || !form.dueDate}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Scheduled Operation"
        message="This will permanently delete this scheduled operation. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
