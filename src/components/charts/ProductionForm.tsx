"use client";

import { useEffect, useState } from "react";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";

export default function ProductionForm() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

  const [factoryId, setFactoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/factories")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setFactories(data.map((f) => ({ value: f._id, label: f.name })))
      );
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setProducts(data.map((p) => ({ value: p._id, label: p.name })))
      );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess("");

    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factoryId,
          productId,
          quantity: Number(quantity),
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setSuccess(`Recorded production of ${quantity} units`);
      setProductId("");
      setQuantity("");
    } catch {
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Record Production</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        {isAdmin && (
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Factory</label>
            <Select options={factories} placeholder="Select factory" value={factoryId} onChange={setFactoryId} />
          </div>
        )}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
          <Select options={products} placeholder="Select product" value={productId} onChange={setProductId} />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
          <InputField type="number" id="qty" placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <Button type="submit" variant="primary" disabled={submitting || !productId || !quantity}>
          {submitting ? "Recording..." : "Record"}
        </Button>
        {success && <p className="text-sm text-success-600">{success}</p>}
      </form>
    </div>
  );
}
