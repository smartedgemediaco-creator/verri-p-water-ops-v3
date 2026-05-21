"use client";

import { useEffect, useState } from "react";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";

const CATEGORY_OPTIONS = [
  { value: "production", label: "Production" },
  { value: "transport", label: "Transport" },
  { value: "maintenance", label: "Maintenance" },
  { value: "salary", label: "Salary" },
  { value: "utility", label: "Utility" },
  { value: "other", label: "Other" },
];

export default function RecordCostForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [locationType, setLocationType] = useState("");
  const [locationId, setLocationId] = useState("");
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);
  const [trucks, setTrucks] = useState<{ value: string; label: string }[]>([]);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    Promise.all([
      fetch("/api/factories").then((r) => r.json()),
      fetch("/api/depots").then((r) => r.json()),
      fetch("/api/trucks").then((r) => r.json()),
    ]).then(([f, d, t]) => {
      setFactories(f.map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      setDepots(d.map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      setTrucks(t.map((x: { _id: string; plateNumber: string }) => ({ value: x._id, label: `Truck: ${x.plateNumber}` })));
    });
  }, []);

  const locationOptions = locationType === "factory" ? factories : locationType === "depot" ? depots : locationType === "truck" ? trucks : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    setSuccess("");

    try {
      const body: Record<string, unknown> = { category, amount: Number(amount), description };
      if (isAdmin) {
        body.locationType = locationType;
        body.locationId = locationId;
      }

      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed");

      setSuccess(`Recorded ${category} cost of ₦${Number(amount).toLocaleString()}`);
      setCategory("");
      setAmount("");
      setDescription("");
      setLocationType("");
      setLocationId("");
      onSuccess?.();
    } catch {
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Record Cost</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        <div className="w-44">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <Select options={CATEGORY_OPTIONS} placeholder="Select category" value={category} onChange={setCategory} />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₦)</label>
          <InputField type="number" id="cost-amount" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="w-56">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <InputField id="cost-desc" placeholder="e.g. Raw materials" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {isAdmin && (
          <>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <Select
                options={[
                  { value: "factory", label: "Factory" },
                  { value: "depot", label: "Depot" },
                  { value: "truck", label: "Truck" },
                ]}
                placeholder="Type"
                value={locationType}
                onChange={(val) => { setLocationType(val); setLocationId(""); }}
              />
            </div>
            {locationType && (
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <Select options={locationOptions} placeholder="Select" value={locationId} onChange={setLocationId} />
              </div>
            )}
          </>
        )}
        <Button type="submit" variant="primary" disabled={submitting || !category || !amount || (isAdmin && (!locationType || !locationId))}>
          {submitting ? "Recording..." : "Record"}
        </Button>
        {success && <p className="text-sm text-success-600">{success}</p>}
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Record Cost"
        message={
          <>
            You are about to record a cost of <strong>₦{Number(amount).toLocaleString()}</strong> for <strong>{category}</strong>.
            <p className="mt-2">This expense will be reflected in financial reports. Are you sure?</p>
          </>
        }
        confirmLabel="Record Cost"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
