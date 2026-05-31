"use client";

import { useEffect, useState } from "react";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";

export default function ProductionForm() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isFactoryManager = user?.role === "factory-manager";
  const userDisplayName = user?.name ?? user?.email ?? "User";
  const userFactoryName = user?.factoryName ?? (typeof user?.factoryId === "object" ? user.factoryId?.name : undefined) ?? "Your Factory";

  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

  const [factoryId, setFactoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [spoilage, setSpoilage] = useState("");
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const effectiveFactoryId = isAdmin
    ? factoryId
    : typeof user?.factoryId === "string"
      ? user.factoryId
      : (user?.factoryId as { _id: string })?._id ?? "";

  useEffect(() => {
    if (effectiveFactoryId && productId) {
      fetch(`/api/stock?locationType=factory&locationId=${effectiveFactoryId}&productId=${productId}`)
        .then((r) => r.json())
        .then((data: { quantity?: number }[]) => {
          const total = Array.isArray(data) ? data.reduce((s, item) => s + (item.quantity ?? 0), 0) : 0;
          setAvailableStock(total);
          setStockLoading(false);
        })
        .catch(() => { setAvailableStock(null); setStockLoading(false); });
    }
  }, [effectiveFactoryId, productId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
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

      if (Number(spoilage) > 0) {
        await fetch("/api/wastage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            quantity: Number(spoilage),
            source: "production",
            locationType: "factory",
            locationId: effectiveFactoryId,
            description: `Spoilage during production batch of ${quantity} units`,
          }),
        });
      }

      setSuccess(`Recorded production of ${quantity} units${Number(spoilage) > 0 ? ` (${spoilage} spoiled)` : ""}`);
      setProductId("");
      setQuantity("");
      setSpoilage("");
    } catch {
      setSuccess("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Record Production</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">by {userDisplayName}</span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        {isAdmin && (
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Factory</label>
            <Select options={factories} placeholder="Select factory" value={factoryId} onChange={setFactoryId} />
          </div>
        )}
        {isFactoryManager && !isAdmin && (
          <div className="flex items-end">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-sm text-blue-700 dark:text-blue-400 font-medium">
              Producing at: {userFactoryName} (Factory)
            </div>
          </div>
        )}
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
          <Select options={products} placeholder="Select product" value={productId} onChange={setProductId} />
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produced</label>
          <div className="relative">
            <InputField type="number" id="qty" placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            {availableStock !== null && effectiveFactoryId && productId && (
              <div
                className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  availableStock > 0
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${availableStock > 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                {availableStock.toLocaleString()} avail.
              </div>
            )}
            {stockLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">loading...</div>
            )}
          </div>
        </div>
        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <span className="text-red-500">Spoiled</span>
          </label>
          <InputField type="number" id="spoilage" placeholder="Damaged" value={spoilage} onChange={(e) => setSpoilage(e.target.value)} />
        </div>
        <Button type="submit" variant="primary" disabled={submitting || !productId || !quantity}>
          {submitting ? "Recording..." : "Record"}
        </Button>
        {success && <p className="text-sm text-success-600">{success}</p>}
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Record Production"
        message={
          <>
            You are about to record production that will <strong>permanently add stock</strong>:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Quantity:</strong> {quantity} units</li>
              <li><strong>Spoilage:</strong> {spoilage || "0"} units</li>
            </ul>
            <p className="mt-2 text-red-600 dark:text-red-400 font-medium">This action affects stock levels. Password required to confirm.</p>
          </>
        }
        confirmLabel="Record Production"
        variant="password"
        loading={submitting}
      />
    </div>
  );
}
