"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, TrashBinIcon, PencilIcon, GroupIcon } from "@/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FactoryIcon } from "@/components/icons/EntityIcons";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface Factory {
  _id: string;
  name: string;
  location: string;
  capacity: number;
  isActive: boolean;
}

export default function FactoriesPage() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { ref, loading: pdfLoading, download } = usePdfDownload("factories-list");

  useEffect(() => {
    fetch("/api/factories")
      .then((res) => res.json())
      .then((data) => setFactories(data))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => setDeleteTarget(id);

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/factories/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setFactories((prev) => prev.filter((f) => f._id !== deleteTarget));
  };

  const totalActive = factories.filter((f) => f.isActive).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Factories" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Link href="/factories/new">
            <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
              Add Factory
            </Button>
          </Link>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/factories" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <FactoryIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Factories</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{factories.length}</h4>
        </Link>
        <Link href="/factories" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <GroupIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalActive}</h4>
        </Link>
        <Link href="/factories" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800 mb-3">
            <GroupIcon className="text-gray-600 size-5 dark:text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{factories.length - totalActive}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Capacity</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={5}>Loading...</TableCell>
              </TableRow>
            ) : factories.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={5}>No factories found. Click &quot;Add Factory&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              factories.map((factory) => (
                <TableRow key={factory._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90"><Link href={`/factories/${factory._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{factory.name}</Link></TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{factory.location}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{factory.capacity.toLocaleString()}</TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                      factory.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
                    }`}>
                      {factory.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-2">
                      <Link href={`/factories/${factory._id}/edit`}>
                        <Button variant="outline" size="sm" startIcon={<PencilIcon />}>
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        startIcon={<TrashBinIcon />}
                        onClick={() => handleDelete(factory._id)}
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
        title="Delete Factory"
        message="This will permanently delete this factory and all associated data. This action cannot be undone."
        confirmLabel="Delete Factory"
        variant="danger"
      />
    </div>
  );
}
