"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";

export default function NewCostPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);

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
  }, []);

  const locationOptions = locationType === "factory" ? factories : locationType === "depot" ? depots : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/costs", {
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
    router.push("/costs");
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Record Cost</h1>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
            <Select
              options={[
                { value: "factory", label: "Factory" },
                { value: "depot", label: "Depot" },
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <InputField type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
    </div>
  );
}
