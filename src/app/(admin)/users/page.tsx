"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Select from "@/components/form/Select";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, UserIcon, GroupIcon, PencilIcon, PaperPlaneIcon, TrashBinIcon } from "@/icons";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  factoryId?: { _id: string; name: string } | string;
  depotId?: { _id: string; name: string } | string;
  truckId?: { _id: string; plateNumber: string } | string;
  isActive: boolean;
  createdAt: string;
}

interface Option {
  value: string;
  label: string;
}

const roleBadge = (role: string) => {
  const map: Record<string, "primary" | "success" | "warning" | "info" | "light"> = {
    admin: "primary",
    "factory-manager": "warning",
    "depot-manager": "info",
    driver: "light",
  };
  return <Badge variant="light" color={map[role] ?? "light"}>{role}</Badge>;
};

const roleLabel = (role: string) => {
  const map: Record<string, string> = {
    admin: "Admin",
    "factory-manager": "Factory Manager",
    "depot-manager": "Depot Manager",
    driver: "Driver",
  };
  return map[role] || role;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editFactoryId, setEditFactoryId] = useState("");
  const [editDepotId, setEditDepotId] = useState("");
  const [editTruckId, setEditTruckId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const { ref, loading: pdfLoading, download } = usePdfDownload("users-list", { title: "Users Report" });

  const [factories, setFactories] = useState<Option[]>([]);
  const [depots, setDepots] = useState<Option[]>([]);
  const [trucks, setTrucks] = useState<Option[]>([]);
  const [resending, setResending] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]); // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    fetch("/api/factories").then(r => { if (!r.ok) throw new Error(`factories ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setFactories((data as { _id: string; name: string }[]).map((f) => ({ value: f._id, label: f.name }))); }).catch((e) => console.error("Failed to load factories:", e));
    fetch("/api/depots").then(r => { if (!r.ok) throw new Error(`depots ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setDepots((data as { _id: string; name: string }[]).map((d) => ({ value: d._id, label: d.name }))); }).catch((e) => console.error("Failed to load depots:", e));
    fetch("/api/trucks").then(r => { if (!r.ok) throw new Error(`trucks ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setTrucks((data as { _id: string; plateNumber: string }[]).map((t) => ({ value: t._id, label: t.plateNumber }))); }).catch((e) => console.error("Failed to load trucks:", e));
  }, []);

  const resendInvite = async (id: string) => {
    setResending(id);
    try {
      const res = await fetch("/api/auth/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (!res.ok) { showError(data.error || "Failed"); return; }
      if (data.emailSent === false) {
        showSuccess("Invite re-created but email failed — check SMTP");
      } else {
        showSuccess("Invite resent successfully");
      }
    } catch { showError("Network error"); }
    finally { setResending(null); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchUsers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) { showError("Failed to delete user"); return; }
      showSuccess("User deleted");
      setDeleteTarget(null);
      fetchUsers();
    } catch { showError("Network error"); }
    finally { setDeleting(false); }
  };

  const openEdit = (u: User) => {
    setEditTarget(u);
    setEditFactoryId(typeof u.factoryId === "object" ? u.factoryId._id : u.factoryId ?? "");
    setEditDepotId(typeof u.depotId === "object" ? u.depotId._id : u.depotId ?? "");
    setEditTruckId(typeof u.truckId === "object" ? u.truckId._id : u.truckId ?? "");
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editTarget.role === "factory-manager") body.factoryId = editFactoryId || null;
      if (editTarget.role === "depot-manager") body.depotId = editDepotId || null;
      if (editTarget.role === "driver") body.truckId = editTruckId || null;
      const res = await fetch(`/api/users/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showError("Failed to update"); return; }
      showSuccess("User updated");
      setEditTarget(null);
      fetchUsers();
    } catch { showError("Network error"); }
    finally { setEditSaving(false); }
  };

  const totalActive = users.filter((u) => u.isActive).length;

  const assignedTo = (user: User): string => {
    if (user.factoryId && typeof user.factoryId === "object") return user.factoryId.name;
    if (user.depotId && typeof user.depotId === "object") return user.depotId.name;
    if (user.truckId && typeof user.truckId === "object") return `Truck: ${user.truckId.plateNumber}`;
    return "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Users" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Link href="/users/new">
            <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
              Add User
            </Button>
          </Link>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/users" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <UserIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{users.length}</h4>
        </Link>
        <Link href="/users" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <GroupIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalActive}</h4>
        </Link>
        <Link href="/users" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-3">
            <UserIcon className="text-purple-600 size-5 dark:text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Roles</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{new Set(users.map((u) => u.role)).size}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Role</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Assigned To</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Joined</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>Loading...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={7}>No users found. Click &quot;Add User&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              users.filter((u) => u._id).map((u) => (
                <TableRow key={u._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{u.name}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{u.email}</TableCell>
                  <TableCell className="py-3">{roleBadge(u.role)}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{assignedTo(u) || roleLabel(u.role)}</TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                    }`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="p-1.5 text-gray-400 hover:text-error-500 transition-colors"
                        title="Delete user"
                      >
                        <TrashBinIcon className="w-4 h-4" />
                      </button>
                      {!u.isActive && (
                        <button
                          onClick={() => resendInvite(u._id)}
                          disabled={resending === u._id}
                          className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors disabled:opacity-40"
                          title="Resend invite email"
                        >
                          <PaperPlaneIcon className="w-4 h-4" />
                        </button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => toggleActive(u._id, u.isActive)}>
                        {u.isActive ? "Revoke" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={
          deleteTarget
            ? <span>Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? This will also remove their role and staff link. This action cannot be undone.</span>
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />

      {editTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setEditTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Edit User</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{editTarget.name} ({editTarget.email})</p>

            {editTarget.role === "factory-manager" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Factory</label>
                <Select options={factories} placeholder="Select factory" value={editFactoryId} onChange={setEditFactoryId} />
              </div>
            )}
            {editTarget.role === "depot-manager" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Depot</label>
                <Select options={depots} placeholder="Select depot" value={editDepotId} onChange={setEditDepotId} />
              </div>
            )}
            {editTarget.role === "driver" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Truck</label>
                <Select options={trucks} placeholder="Select truck" value={editTruckId} onChange={setEditTruckId} />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button size="sm" disabled={editSaving} onClick={saveEdit}>{editSaving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
