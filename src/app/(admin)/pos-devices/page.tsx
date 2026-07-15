"use client";

import { useEffect, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import { PlusIcon, TrashBinIcon, PencilIcon, BoxIconLine } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface PosDevice {
  _id: string;
  terminalSerial: string;
  name: string;
  provider: string;
  locationType: string;
  locationId: { _id: string; name?: string; plateNumber?: string } | string;
  isActive: boolean;
}

const PROVIDERS = [
  { value: "moniepoint", label: "Moniepoint" },
  { value: "opay", label: "Opay" },
  { value: "palmpay", label: "Palmpay" },
  { value: "other", label: "Other" },
];

const LOCATION_TYPES = [
  { value: "factory", label: "Factory" },
  { value: "depot", label: "Depot" },
  { value: "truck", label: "Truck" },
];

export default function PosDevicesPage() {
  const [devices, setDevices] = useState<PosDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<PosDevice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [terminalSerial, setTerminalSerial] = useState("");
  const [provider, setProvider] = useState("moniepoint");
  const [locationType, setLocationType] = useState("");
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);
  const [locationId, setLocationId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const { ref, loading: pdfLoading, download } = usePdfDownload("pos-devices-list");

  const fetchDevices = () => {
    fetch("/api/pos-devices")
      .then((r) => r.json())
      .then((data) => setDevices(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDevices(); }, []);

  useEffect(() => {
    if (!locationType) { setLocations([]); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const endpoint = locationType === "truck" ? "/api/trucks" : locationType === "factory" ? "/api/factories" : `/api/${locationType}s`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: { _id: string; name?: string; plateNumber?: string }[]) => {
        if (Array.isArray(data)) {
          setLocations(
            data.map((d) => ({
              value: d._id,
              label: d.name ?? `Truck: ${d.plateNumber ?? "Unknown"}`,
            }))
          );
        }
      });
    setLocationId(""); // eslint-disable-line react-hooks/set-state-in-effect
  }, [locationType]);

  const resetForm = () => {
    setName("");
    setTerminalSerial("");
    setProvider("moniepoint");
    setLocationType("");
    setLocationId("");
    setIsActive(true);
  };

  const openEdit = (d: PosDevice) => {
    setEditTarget(d);
    setName(d.name);
    setTerminalSerial(d.terminalSerial);
    setProvider(d.provider);
    setLocationType(d.locationType);
    setLocationId(typeof d.locationId === "object" && d.locationId ? d.locationId._id : "");
    setIsActive(d.isActive);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editTarget ? `/api/pos-devices/${editTarget._id}` : "/api/pos-devices";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, terminalSerial, provider, locationType, locationId, isActive }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Operation failed");
        return;
      }
      showSuccess(editTarget ? "Device updated" : "POS device registered");
      setShowForm(false);
      setEditTarget(null);
      resetForm();
      fetchDevices();
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/pos-devices/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    showSuccess("Device removed");
    setDeleteTarget(null);
    fetchDevices();
  };

  const locationName = (d: PosDevice): string => {
    if (typeof d.locationId === "object" && d.locationId) {
      return d.locationId.name ?? `Truck: ${d.locationId.plateNumber ?? ""}`;
    }
    return typeof d.locationId === "string" ? (d.locationType ?? "Location") : "";
  };

  const totalActive = devices.filter((d) => d.isActive).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="POS Devices" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={() => { setShowForm(!showForm); if (!showForm) { setEditTarget(null); resetForm(); } }}>
            {showForm ? "Cancel" : "Register Device"}
          </Button>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/pos-devices" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <BoxIconLine className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Devices</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{devices.length}</h4>
        </Link>
        <Link href="/pos-devices" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <BoxIconLine className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{totalActive}</h4>
        </Link>
        <Link href="/pos-devices" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <BoxIconLine className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{devices.length - totalActive}</h4>
        </Link>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm p-6 mb-6 max-w-2xl space-y-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {editTarget ? "Edit POS Terminal" : "Register POS Terminal"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device Name</label>
              <Input id="name" placeholder="e.g. Factory 1 POS" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terminal Serial</label>
              <Input id="serial" placeholder="e.g. P260XXXXX" value={terminalSerial} onChange={(e) => setTerminalSerial(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
              <Select options={PROVIDERS} value={provider} onChange={setProvider} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
              <Select options={LOCATION_TYPES} value={locationType} placeholder="Select type" onChange={(v) => { setLocationType(v); setLocationId(""); }} />
            </div>
          </div>
          {locationType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <Select options={locations} placeholder={`Select ${locationType}`} value={locationId} onChange={setLocationId} />
            </div>
          )}
          {editTarget && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="edit-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <label htmlFor="edit-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
            </div>
          )}
          <Button type="submit" variant="primary" disabled={submitting || !locationId}>
            {submitting ? "Saving..." : editTarget ? "Update Device" : "Register Device"}
          </Button>
        </form>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Device</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Terminal Serial</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Provider</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>Loading...</TableCell>
              </TableRow>
            ) : devices.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={6}>No POS devices registered. Click &quot;Register Device&quot; to add one.</TableCell>
              </TableRow>
            ) : (
              devices.map((d) => (
                <TableRow key={d._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{d.name}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">{d.terminalSerial}</TableCell>
                  <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{d.provider}</TableCell>
                  <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{d.locationType}: {locationName(d)}</TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${d.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(d)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                        <PencilIcon className="w-3.5 h-3.5 mr-1" /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget(d._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                        <TrashBinIcon className="w-3.5 h-3.5 mr-1" /> Remove
                      </button>
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
        onConfirm={handleDelete}
        title="Remove POS Device"
        message={<p>Are you sure you want to remove this POS device? Transactions linked to it will not be affected.</p>}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
