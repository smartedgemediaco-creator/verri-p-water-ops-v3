"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function NewTruckPage() {
  const router = useRouter();
  const [form, setForm] = useState({ plateNumber: "", chassisNumber: "", engineNumber: "", capacity: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plateNumber.trim()) {
      showError("Plate number is required");
      return;
    }
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    const body: Record<string, unknown> = { ...form, capacity: Number(form.capacity) };
    try {
      const res = await fetch("/api/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        showError("Failed to add truck");
        setSubmitting(false);
        throw new Error("Failed to add truck");
      }
      showSuccess("Truck added");
      router.push("/trucks");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Add Truck/Tricycle</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate Number <span className="text-red-500">*</span></label>
          <InputField id="plateNumber" name="plateNumber" placeholder="Plate number" value={form.plateNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassis Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="chassisNumber" name="chassisNumber" placeholder="Chassis number" value={form.chassisNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engine Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="engineNumber" name="engineNumber" placeholder="Engine number" value={form.engineNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="capacity" name="capacity" type="number" placeholder="Capacity" value={form.capacity} onChange={handleChange} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting || !form.plateNumber.trim()}>
            {submitting ? "Saving..." : "Save"}
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
        title="Create Delivery Vehicle"
        message={
          <>
            You are about to create a new delivery vehicle:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Plate:</strong> {form.plateNumber}</li>
              <li><strong>Chassis:</strong> {form.chassisNumber || "—"}</li>
              <li><strong>Engine:</strong> {form.engineNumber || "—"}</li>
              <li><strong>Capacity:</strong> {form.capacity}</li>
            </ul>
            <p className="mt-2">This entity will be immediately available in the system. Are you sure?</p>
          </>
        }
        confirmLabel="Create Vehicle"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
