"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", unit: "", category: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error("Failed to add product");
        setSubmitting(false);
        return;
      }
      toast.success("Product added");
      router.push("/products");
    } catch {
      toast.error("Network error");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Add Product</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <InputField id="name" name="name" placeholder="Product name" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
          <InputField id="unit" name="unit" placeholder="e.g. pieces, kg, litres" value={form.unit} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <Select
            options={[
              { value: "sachet", label: "Sachet" },
              { value: "bottle", label: "Bottle" },
            ]}
            placeholder="Select category"
            onChange={(val) => setForm({ ...form, category: val })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <InputField id="description" name="description" placeholder="Description (optional)" value={form.description} onChange={handleChange} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/products")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
