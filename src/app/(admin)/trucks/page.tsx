"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { PlusIcon, TrashBinIcon, PencilIcon, GroupIcon, ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, CloseLineIcon, EyeIcon } from "@/icons";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TruckIcon } from "@/components/icons/EntityIcons";
import { formatDate } from "@/lib/dateFormat";

interface Truck {
  _id: string;
  name?: string;
  plateNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  capacity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/trucks")
      .then((res) => res.json())
      .then((data) => setTrucks(data))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => {
    setExpandedId(null);
    setDeleteTarget(id);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/trucks/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setTrucks((prev) => prev.filter((t) => t._id !== deleteTarget));
  };

  const toggleActive = async (truck: Truck) => {
    const res = await fetch(`/api/trucks/${truck._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !truck.isActive }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setTrucks((prev) => prev.map((t) => (t._id === truck._id ? { ...t, isActive: updated.isActive } : t)));
  };

  const filtered = trucks.filter((t) =>
    [t.plateNumber, t.chassisNumber, t.engineNumber]
      .some((v) => v && v.toLowerCase().includes(search.toLowerCase()))
  );

  const totalActive = trucks.filter((t) => t.isActive).length;
  const totalCapacity = trucks.reduce((sum, t) => sum + (t.capacity ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Delivery Trucks/Tricycles" />
        <Link href="/trucks/new">
          <Button variant="primary" size="sm" startIcon={<PlusIcon />}>
            Add Truck/Tricycle
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 md:gap-6 mb-6">
        <Link href="/trucks" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-3">
            <TruckIcon className="text-orange-600 size-5 dark:text-orange-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Vehicles</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{trucks.length}</h4>
        </Link>
        <Link href="/trucks" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <CheckCircleIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalActive}</h4>
        </Link>
        <Link href="/trucks" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800 mb-3">
            <CloseLineIcon className="text-gray-600 size-5 dark:text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{trucks.length - totalActive}</h4>
        </Link>
        <Link href="/trucks" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <GroupIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Capacity</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalCapacity.toLocaleString()}</h4>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by plate, chassis, engine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} of {trucks.length}</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-8">{' '}</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Plate Number</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Chassis Number</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Engine Number</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Capacity</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>
                  {search ? "No delivery vehicles match your search." : "No delivery vehicles found. Click \"Add Truck/Tricycle\" to create one."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((truck) => (
                <TruckRow
                  key={truck._id}
                  truck={truck}
                  isExpanded={expandedId === truck._id}
                  onToggle={() => setExpandedId(expandedId === truck._id ? null : truck._id)}
                  onDelete={handleDelete}
                  onToggleActive={toggleActive}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete Delivery Vehicle"
        message="This will permanently delete this delivery vehicle and all associated data. This action cannot be undone."
        confirmLabel="Delete Vehicle"
        variant="danger"
      />
    </div>
  );
}

function TruckRow({
  truck,
  isExpanded,
  onToggle,
  onDelete,
  onToggleActive,
}: {
  truck: Truck;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onToggleActive: (truck: Truck) => void;
}) {
  return (
    <>
      <TableRow
        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <TableCell className="py-3">
          <span className="text-gray-400 dark:text-gray-500">
            {isExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
          </span>
        </TableCell>
        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
          <span className="flex items-center gap-2">
            <TruckIcon className="size-4 text-orange-500 shrink-0" />
            <Link href={`/trucks/${truck._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{truck.name || truck.plateNumber}</Link>
            {truck.name && <span className="text-xs text-gray-400 font-mono">{truck.plateNumber}</span>}
          </span>
        </TableCell>
        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 font-mono">
          {truck.chassisNumber ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              {truck.chassisNumber}
            </span>
          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
        </TableCell>
        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 font-mono">
          {truck.engineNumber ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              {truck.engineNumber}
            </span>
          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
        </TableCell>
        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">{truck.capacity.toLocaleString()}</span>
        </TableCell>
        <TableCell className="py-3">
          <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
            truck.isActive
              ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
              : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
          }`}>
            {truck.isActive ? "Active" : "Inactive"}
          </span>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="p-0 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="border-t border-b border-gray-200 dark:border-gray-700">
              <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <DetailField label="Plate Number" value={truck.plateNumber} />
                  <DetailField label="Chassis Number" value={truck.chassisNumber ?? "—"} mono />
                  <DetailField label="Engine Number" value={truck.engineNumber ?? "—"} mono />
                  <DetailField label="Capacity" value={`${truck.capacity.toLocaleString()} units`} />
                  <DetailField
                    label="Status"
                    value={truck.isActive ? "Active" : "Inactive"}
                    badge={truck.isActive ? "success" : "error"}
                  />
                  <DetailField label="Created" value={truck.createdAt ? formatDate(truck.createdAt) : "—"} />
                  <DetailField label="Last Updated" value={truck.updatedAt ? formatDate(truck.updatedAt) : "—"} />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link href={`/trucks/${truck._id}/edit`}>
                    <Button variant="outline" size="sm" startIcon={<PencilIcon />}>
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    startIcon={truck.isActive ? <CloseLineIcon /> : <CheckCircleIcon />}
                    onClick={() => onToggleActive(truck)}
                  >
                    {truck.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Link href={`/truck-loads?truckId=${truck._id}`}>
                    <Button variant="outline" size="sm" startIcon={<EyeIcon />}>
                      View Loads
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    startIcon={<TrashBinIcon />}
                    onClick={() => onDelete(truck._id)}
                    className="!text-error-500 hover:!bg-error-50 dark:hover:!bg-error-500/10"
                  >
                    Delete
                  </Button>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    {truck.plateNumber}
                  </span>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function DetailField({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: "success" | "error" }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      {badge ? (
        <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
          badge === "success"
            ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
            : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"
        }`}>
          {value}
        </span>
      ) : (
        <p className={`text-sm font-medium text-gray-800 dark:text-white/90 ${mono ? "font-mono" : ""}`}>
          {value || <span className="text-gray-300 dark:text-gray-600">—</span>}
        </p>
      )}
    </div>
  );
}