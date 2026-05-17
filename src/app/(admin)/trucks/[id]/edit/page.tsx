"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        toast.error("Failed to update truck");
        setSubmitting(false);
        return;
      }
      toast.success("Truck updated");
      router.push("/trucks");
    } catch {
      toast.error("Network error");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Edit Truck</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate Number</label>
          <InputField id="plateNumber" name="plateNumber" value={form.plateNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Driver Name</label>
          <InputField id="driverName" name="driverName" value={form.driverName} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
          <InputField id="capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Assignment</p>
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
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Update"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/trucks")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
