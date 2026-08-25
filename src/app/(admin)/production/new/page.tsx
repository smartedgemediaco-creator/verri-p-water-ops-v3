"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function NewProductionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);

  const [locationType, setLocationType] = useState("factory");
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState("");

  const isFactoryManager = user?.role === "factory-manager";
  const canRecord = user?.role === "admin" || isFactoryManager;

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setProducts(data.map((p) => ({ value: p._id, label: p.name })))
      )
      .catch(() => showError("Failed to load products"));
  }, []);

  // Factory managers are locked to their own factory.
  useEffect(() => {
    if (isFactoryManager && user?.factoryId) {
      const id = typeof user.factoryId === "string" ? user.factoryId : user.factoryId._id;
      const name = user.factoryName ?? (typeof user.factoryId === "object" ? user.factoryId.name : "My Factory");
      setLocationType("factory"); // eslint-disable-line react-hooks/set-state-in-effect
      setLocations([{ value: id, label: name }]);
      setLocationId(id);
      return;
    }
    const endpoint = locationType === "depot" ? "/api/depots" : "/api/factories";
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: { _id: string; name?: string }[]) =>
        setLocations(data.map((d) => ({ value: d._id, label: d.name ?? d._id })))
      )
      .catch(() => showError(`Failed to load ${locationType}s`));
  }, [isFactoryManager, locationType, user?.factoryId, user?.factoryName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { showError("Select a product"); return; }
    if (!quantity || Number(quantity) <= 0) { showError("Enter a valid quantity"); return; }
    if (!locationId) { showError("Select a location"); return; }
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { productId, quantity: Number(quantity), locationType, locationId };
      if (date) body.date = date;

      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { showError(data.error || "Failed to record production"); return; }

      showSuccess("Production recorded — stock updated");
      router.push("/stock");
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canRecord) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg">
        <p className="text-gray-500 dark:text-gray-400">You don&apos;t have permission to record production. Only admins and factory managers can do this.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/stock")}>Go to Stock</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Record Production</h1>
          <div className="flex gap-3">
            <Link href="/transfers/new" className="text-sm text-brand-600 hover:underline">New Transfer</Link>
            <Link href="/wastage" className="text-sm text-brand-600 hover:underline">Record Spoilage</Link>
            <Link href="/stock" className="text-sm text-brand-600 hover:underline">View Stock</Link>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Log a production batch. Stock will be added to the selected location automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
          <Select options={products} placeholder="Select product" value={productId} onChange={setProductId} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Produced</label>
          <InputField type="number" placeholder="Units produced" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
          {isFactoryManager ? (
            <div className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
              Factory (your assigned factory)
            </div>
          ) : (
            <Select
              options={[
                { value: "factory", label: "Factory" },
                { value: "depot", label: "Depot" },
              ]}
              placeholder="Select location type"
              value={locationType}
              onChange={(v) => { setLocationType(v); setLocationId(""); }}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          {isFactoryManager ? (
            <div className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
              {locations.find((l) => l.value === locationId)?.label ?? "Your assigned factory"}
            </div>
          ) : (
            <Select options={locations} placeholder={`Select ${locationType}`} value={locationId} onChange={setLocationId} />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date (optional)</label>
          <InputField type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Recording..." : "Record Production"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Record Production"
        message={
          <>
            <p>You are about to record a production batch:</p>
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Product:</strong> {products.find((p) => p.value === productId)?.label ?? "—"}</li>
               <li><strong>Quantity:</strong> {quantity}</li>
               <li><strong>Location:</strong> {locations.find((l) => l.value === locationId)?.label ?? "—"}</li>
            </ul>
          </>
        }
        confirmLabel="Record Production"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
