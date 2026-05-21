"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";

export default function NewCostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);
  const [trucks, setTrucks] = useState<{ value: string; label: string }[]>([]);

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState("");
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    fetch("/api/factories")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setFactories(data.map((f) => ({ value: f._id, label: f.name })))
      );
    fetch("/api/depots")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setDepots(data.map((d) => ({ value: d._id, label: d.name })))
      );
    fetch("/api/trucks")
      .then((r) => r.json())
      .then((data: { _id: string; plateNumber: string }[]) =>
        setTrucks(data.map((t) => ({ value: t._id, label: `Truck: ${t.plateNumber}` })))
      );
  }, []);

  const locationOptions = locationType === "factory" ? factories : locationType === "depot" ? depots : locationType === "truck" ? trucks : [];

  const isDepotManager = user?.role === "depot-manager";
  const isFactoryManager = user?.role === "factory-manager";

  const userDisplayName = user?.name ?? user?.email ?? "User";
  const userDepotName = user?.depotName ?? (typeof user?.depotId === "object" ? user.depotId?.name : undefined) ?? "Your Depot";
  const userFactoryName = user?.factoryName ?? (typeof user?.factoryId === "object" ? user.factoryId?.name : undefined) ?? "Your Factory";

  useEffect(() => {
    if (isDepotManager && !locationType) setLocationType("depot");
    if (isFactoryManager && !locationType) setLocationType("factory");
  }, [isDepotManager, isFactoryManager, locationType]);

  useEffect(() => {
    if (isDepotManager && user?.depotId && !locationId) {
      const id = typeof user.depotId === "string" ? user.depotId : user.depotId._id;
      setLocationId(id);
    }
    if (isFactoryManager && user?.factoryId && !locationId) {
      const id = typeof user.factoryId === "string" ? user.factoryId : user.factoryId._id;
      setLocationId(id);
    }
  }, [isDepotManager, isFactoryManager, user?.depotId, user?.factoryId, locationId]);

  const doSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          amount: Number(amount),
          description,
          locationType,
          locationId,
          date: date || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to record cost");
        setSubmitting(false);
        throw new Error(err.error || "Failed to record cost");
      }
      showSuccess("Cost recorded");
      router.push("/costs");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
      throw e;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Record Cost</h1>
        <span className="text-xs text-gray-400 dark:text-gray-500">Recorded by: {userDisplayName}</span>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <Select
              options={[
                { value: "production", label: "Production" },
                { value: "transport", label: "Transport" },
                { value: "maintenance", label: "Maintenance" },
                { value: "salary", label: "Salary" },
                { value: "utility", label: "Utility" },
                { value: "other", label: "Other" },
              ]}
              placeholder="Select category"
              onChange={setCategory}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₦)</label>
            <InputField type="number" id="amount" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <TextArea placeholder="Description" value={description} onChange={setDescription} />
        </div>

        {isDepotManager || isFactoryManager ? (
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-sm text-blue-700 dark:text-blue-400 font-medium">
            Recording cost for: {isDepotManager ? userDepotName : userFactoryName} ({isDepotManager ? "Depot" : "Factory"})
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
              <Select
                options={[
                  { value: "factory", label: "Factory" },
                  { value: "depot", label: "Depot" },
                  { value: "truck", label: "Truck" },
                ]}
                placeholder="Select type"
                onChange={(val) => { setLocationType(val); setLocationId(""); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <Select
                options={locationOptions}
                placeholder={locationType ? "Select location" : "Select type first"}
                onChange={setLocationId}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <DatePicker id="date" placeholder="Select date" defaultDate={date || undefined} onChange={(_dates, dateStr) => setDate(dateStr)} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Record Cost"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/costs")}>
            Cancel
          </Button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Record Cost"
        message={
          <>
            You are about to record an expense:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Category:</strong> {category}</li>
              <li><strong>Amount:</strong> ₦{Number(amount).toLocaleString()}</li>
              <li><strong>Description:</strong> {description || "—"}</li>
            </ul>
            <p className="mt-2">This cost will be reflected in financial reports. Are you sure?</p>
          </>
        }
        confirmLabel="Record Cost"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
