"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", unit: "", category: "", description: "", unitPrice: "", chilledPrice: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to add product");
        setSubmitting(false);
        throw new Error(err.error || "Failed to add product");
      }
      showSuccess("Product added");
      router.push("/products");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦) <span className="text-red-500">*</span></label>
          <InputField type="number" id="unitPrice" name="unitPrice" placeholder="e.g. 120" value={form.unitPrice} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chilled Price (₦) <span className="text-gray-400 font-normal">(Optional)</span></label>
          <InputField type="number" id="chilledPrice" name="chilledPrice" placeholder="e.g. 150" value={form.chilledPrice} onChange={handleChange} />
          {form.chilledPrice && <p className="text-xs text-gray-400 mt-1">Price when sold chilled/cold</p>}
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
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Create Product"
        message={
          <>
            You are about to create a new product:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Name:</strong> {form.name}</li>
              <li><strong>Category:</strong> {form.category}</li>
              <li><strong>Unit Price:</strong> ₦{Number(form.unitPrice).toLocaleString()}</li>
              {form.chilledPrice && <li><strong>Chilled Price:</strong> ₦{Number(form.chilledPrice).toLocaleString()}</li>}
            </ul>
            <p className="mt-2">This product will be available for stock and sales. Are you sure?</p>
          </>
        }
        confirmLabel="Create Product"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
