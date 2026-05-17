"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";

export default function EditDepotPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ name: "", location: "", manager: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/depots/${id}`)
      .then(r => r.json())
      .then(data => setForm({ name: data.name, location: data.location, manager: data.manager }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch(`/api/depots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    router.push("/depots");
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Edit Depot</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <InputField id="name" name="name" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <InputField id="location" name="location" value={form.location} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manager</label>
          <InputField id="manager" name="manager" value={form.manager} onChange={handleChange} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Update"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/depots")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
