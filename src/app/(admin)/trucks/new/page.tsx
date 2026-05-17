"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";

export default function NewTruckPage() {
  const router = useRouter();
  const [form, setForm] = useState({ plateNumber: "", driverName: "", capacity: "" });
  const [assignedToType, setAssignedToType] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [depots, setDepots] = useState<{ value: string; label: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/factories").then(r => r.json()).then(data =>
      setFactories(data.map((f: any) => ({ value: f._id, label: f.name })))
    );
    fetch("/api/depots").then(r => r.json()).then(data =>
      setDepots(data.map((d: any) => ({ value: d._id, label: d.name })))
    );
  }, []);

  const assignmentOptions = assignedToType === "factory" ? factories : assignedToType === "depot" ? depots : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body: any = { ...form, capacity: Number(form.capacity) };
    if (assignedToType && assignedToId) {
      body.assignedToType = assignedToType;
      body.assignedToId = assignedToId;
    }
    try {
      const res = await fetch("/api/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("Failed to add truck");
        setSubmitting(false);
        return;
      }
      toast.success("Truck added");
      router.push("/trucks");
    } catch {
      toast.error("Network error");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Add Truck</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate Number</label>
          <InputField id="plateNumber" name="plateNumber" placeholder="Plate number" value={form.plateNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver Name</label>
          <InputField id="driverName" name="driverName" placeholder="Driver name" value={form.driverName} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
          <InputField id="capacity" name="capacity" type="number" placeholder="Capacity" value={form.capacity} onChange={handleChange} />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Assignment (optional)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Assign To</label>
              <Select
                options={[
                  { value: "factory", label: "Factory" },
                  { value: "depot", label: "Depot" },
                ]}
                placeholder="Not assigned"
                onChange={(val) => { setAssignedToType(val); setAssignedToId(""); }}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Location</label>
              <Select
                options={assignmentOptions}
                placeholder={assignedToType ? "Select location" : "Select type first"}
                onChange={setAssignedToId}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/trucks")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
