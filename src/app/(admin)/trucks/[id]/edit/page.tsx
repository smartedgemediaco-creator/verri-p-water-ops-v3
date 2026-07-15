"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function EditTruckPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ name: "", plateNumber: "", chassisNumber: "", engineNumber: "", capacity: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/trucks/${id}`).then(r => r.json()).then((truck) => {
      setForm({ name: truck.name ?? "", plateNumber: truck.plateNumber, chassisNumber: truck.chassisNumber ?? "", engineNumber: truck.engineNumber ?? "", capacity: String(truck.capacity) });
    }).finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const doSubmit = async () => {
    setSubmitting(true);
    const body: Record<string, unknown> = { ...form, capacity: Number(form.capacity) };
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
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Edit Truck/Tricycle</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="name" name="name" placeholder="e.g. Truck 1, Blue Van" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate Number <span className="text-red-500">*</span></label>
          <InputField id="plateNumber" name="plateNumber" value={form.plateNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassis Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="chassisNumber" name="chassisNumber" value={form.chassisNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engine Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="engineNumber" name="engineNumber" value={form.engineNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
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
        title="Confirm Vehicle Update"
        message={
          <>
            You are about to update this delivery vehicle:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              {form.name && <li><strong>Name:</strong> {form.name}</li>}
              <li><strong>Plate:</strong> {form.plateNumber}</li>
              <li><strong>Chassis:</strong> {form.chassisNumber || "—"}</li>
              <li><strong>Engine:</strong> {form.engineNumber || "—"}</li>
              <li><strong>Capacity:</strong> {form.capacity}</li>
            </ul>
            <p className="mt-2">Changes will be applied immediately. Are you sure?</p>
          </>
        }
        confirmLabel="Update Vehicle"
        variant="warning"
      />
    </div>
  );
}
