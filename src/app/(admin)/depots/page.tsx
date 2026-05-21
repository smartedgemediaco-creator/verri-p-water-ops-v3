"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, TrashBinIcon, PencilIcon, GroupIcon } from "@/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DepotIcon } from "@/components/icons/EntityIcons";

interface Depot {
  _id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export default function DepotsPage() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/depots").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([depotData, userData]) => {
      setDepots(depotData);
      const map: Record<string, string> = {};
      const raw = Array.isArray(userData) ? userData : ((userData as Record<string, unknown>)?.users as unknown[] ?? []);
      for (const u of raw) {
        const user = u as { name: string; depotId?: string | { _id: string } };
        const depotId = typeof user.depotId === "string" ? user.depotId : user.depotId?._id;
        if (depotId) map[depotId] = user.name;
      }
      setAssignedUsers(map);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => setDeleteTarget(id);

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/depots/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setDepots((prev) => prev.filter((d) => d._id !== deleteTarget));
  };

  const totalActive = depots.filter((d) => d.isActive).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Depots" />
        <Link href="/depots/new">
          <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
            Add Depot
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <DepotIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Depots</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{depots.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <GroupIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalActive}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800 mb-3">
            <GroupIcon className="text-gray-600 size-5 dark:text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{depots.length - totalActive}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Manager</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={5}>Loading...</TableCell>
              </TableRow>
            ) : depots.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={5}>No depots found. Click &quot;Add Depot&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              depots.map((depot) => (
                <TableRow key={depot._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{depot.name}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{depot.location}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{assignedUsers[depot._id] || "—"}</TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                      depot.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                    }`}>
                      {depot.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-2">
                      <Link href={`/depots/${depot._id}/edit`}>
                        <Button variant="outline" size="sm" startIcon={<PencilIcon />}>
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        startIcon={<TrashBinIcon />}
                        onClick={() => handleDelete(depot._id)}
                      >
                        Delete
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
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Depot"
        message="This will permanently delete this depot and all associated data. This action cannot be undone."
        confirmLabel="Delete Depot"
        variant="danger"
      />
    </div>
  );
}
