"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function EditTruckPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ plateNumber: "", driverName: "", capacity: "" });
  const [assignedToType, setAssignedToType] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/trucks/${id}`).then(r => r.json()),
      fetch("/api/factories").then(r => r.json()),
      fetch("/api/depots").then(r => r.json()),
    ]).then(([truck, facData, depData]) => {
      setForm({ plateNumber: truck.plateNumber, driverName: truck.driverName, capacity: String(truck.capacity) });
      setAssignedToType(truck.assignedToType ?? "");
      setAssignedToId(truck.assignedToId ?? "");
      setFactories(facData.map((f: any) => ({ value: f._id, label: f.name })));
      setDepots(depData.map((d: any) => ({ value: d._id, label: d.name })));
    }).finally(() => setLoading(false));
  }, [id]);

  const assignmentOptions = assignedToType === "factory" ? factories : assignedToType === "depot" ? depots : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const doSubmit = async () => {
    setSubmitting(true);
    const body: any = { ...form, capacity: Number(form.capacity) };
    if (assignedToType && assignedToId) {
      body.assignedToType = assignedToType;
      body.assignedToId = assignedToId;
    } else {
      body.assignedToType = null;
      body.assignedToId = null;
    }
    try {
      const res = await fetch(`/api/trucks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        showError("Failed to update truck");
        setSubmitting(false);
        throw new Error("Failed to update truck");
      }
      showSuccess("Truck updated");
      router.push("/trucks");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plateNumber.trim()) {
      showError("Plate number is required");
      return;
    }
    setConfirmOpen(true);
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Edit Truck</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate Number <span className="text-red-500">*</span></label>
          <InputField id="plateNumber" name="plateNumber" value={form.plateNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver Name <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="driverName" name="driverName" value={form.driverName} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Assignment <span className="text-gray-400 font-normal">(optional)</span></p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Assign To</label>
              <Select
                options={[
                  { value: "factory", label: "Factory" },
                  { value: "depot", label: "Depot" },
                ]}
                placeholder="Not assigned"
                defaultValue={assignedToType}
                onChange={(val) => { setAssignedToType(val); setAssignedToId(""); }}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Location</label>
              <Select
                options={assignmentOptions}
                placeholder={assignedToType ? "Select location" : "Select type first"}
                defaultValue={assignedToId}
                onChange={setAssignedToId}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting || !form.plateNumber.trim()}>
            {submitting ? "Saving..." : "Update"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/trucks")}>
            Cancel
          </Button>
        </div>
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Confirm Truck Update"
        message={
          <>
            You are about to update this truck:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Plate:</strong> {form.plateNumber}</li>
              <li><strong>Driver:</strong> {form.driverName}</li>
              <li><strong>Capacity:</strong> {form.capacity}</li>
            </ul>
            <p className="mt-2">Changes will be applied immediately. Are you sure?</p>
          </>
        }
        confirmLabel="Update Truck"
        variant="warning"
      />
    </div>
  );
}
