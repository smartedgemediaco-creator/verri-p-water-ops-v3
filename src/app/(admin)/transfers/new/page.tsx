"use client";

import Link from "next/link";
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

interface Option {
  value: string;
  label: string;
}

export default function NewTransferPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [loadType, setLoadType] = useState<"transfer" | "dispatch">("transfer");
  const [fromType, setFromType] = useState("");
  const [fromId, setFromId] = useState("");
  const [toType, setToType] = useState("");
  const [toId, setToId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [truckId, setTruckId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const [factories, setFactories] = useState<Option[]>([]);
  const [depots, setDepots] = useState<Option[]>([]);
  const [trucks, setTrucks] = useState<Option[]>([]);
  const [truckLocations, setTruckLocations] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  const isDepotManager = user?.role === "depot-manager";
  const isFactoryManager = user?.role === "factory-manager";

  const userDisplayName = user?.name ?? user?.email ?? "User";
  const userDepotName = user?.depotName ?? (typeof user?.depotId === "object" ? user.depotId?.name : undefined) ?? "Your Depot";
  const userFactoryName = user?.factoryName ?? (typeof user?.factoryId === "object" ? user.factoryId?.name : undefined) ?? "Your Factory";

  useEffect(() => {
    if (fromType && fromId && productId) {
      fetch(`/api/stock?locationType=${fromType}&locationId=${fromId}&productId=${productId}`)
        .then((r) => r.json())
        .then((data: { quantity?: number }[]) => {
          const total = Array.isArray(data) ? data.reduce((s, item) => s + (item.quantity ?? 0), 0) : 0;
          setAvailableStock(total);
        })
        .catch(() => setAvailableStock(null))
        .finally(() => setStockLoading(false));
    }
  }, [fromType, fromId, productId]);

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, trucksRes, factoriesRes, depotsRes, customersRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/trucks"),
        fetch("/api/factories"),
        fetch("/api/depots"),
        fetch("/api/customers"),
      ]);
      const [productsData, trucksData, factoriesData, depotsData, customersData] = await Promise.all([
        productsRes.json(),
        trucksRes.json(),
        factoriesRes.json(),
        depotsRes.json(),
        customersRes.json(),
      ]);
      setProducts((Array.isArray(productsData) ? productsData : []).map((p: { _id: string; name: string }) => ({ value: p._id, label: p.name })));
      const truckOpts = (Array.isArray(trucksData) ? trucksData : []).map((t: { _id: string; plateNumber: string }) => ({ value: t._id, label: t.plateNumber }));
      setTrucks(truckOpts);
      setTruckLocations(truckOpts);
      setFactories((Array.isArray(factoriesData) ? factoriesData : []).map((f: { _id: string; name: string }) => ({ value: f._id, label: f.name })));
      setDepots((Array.isArray(depotsData) ? depotsData : []).map((d: { _id: string; name: string }) => ({ value: d._id, label: d.name })));
      setCustomers((Array.isArray(customersData) ? customersData : []).map((c: { _id: string; name: string }) => ({ value: c._id, label: c.name })));
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isDepotManager && !fromType) setFromType("depot"); // eslint-disable-line react-hooks/set-state-in-effect
    if (isFactoryManager && !fromType) setFromType("factory"); // eslint-disable-line react-hooks/set-state-in-effect
  }, [isDepotManager, isFactoryManager, fromType]);

  useEffect(() => {
    if (isDepotManager && user?.depotId && !fromId) {
      const id = typeof user.depotId === "string" ? user.depotId : user.depotId._id;
      setFromId(id); // eslint-disable-line react-hooks/set-state-in-effect
    }
    if (isFactoryManager && user?.factoryId && !fromId) {
      const id = typeof user.factoryId === "string" ? user.factoryId : user.factoryId._id;
      setFromId(id); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [isDepotManager, isFactoryManager, user?.depotId, user?.factoryId, fromId]);

  const fromOptions = fromType === "factory" ? factories : fromType === "depot" ? depots : fromType === "truck" ? truckLocations : [];
  const toOptions = toType === "factory" ? factories : toType === "depot" ? depots : toType === "truck" ? truckLocations : [];

  const locationName = (id: string, type: string) => {
    const opts = type === "factory" ? factories : type === "depot" ? depots : type === "truck" ? truckLocations : [];
    return opts.find((o) => o.value === id)?.label ?? id.slice(-6);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId) { showError("Please select a source location"); return; }
    if (loadType === "transfer" && !toId) { showError("Please select a destination location"); return; }
    if (!productId) { showError("Please select a product"); return; }
    if (!quantity || Number(quantity) <= 0) { showError("Please enter a valid quantity"); return; }
    if (!truckId) { showError("Please select a truck"); return; }
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const endpoint = loadType === "dispatch" ? "/api/truck-loads" : "/api/transfers";
      const body: Record<string, unknown> = {
        fromType,
        fromId,
        productId,
        quantity: Number(quantity),
        truckId,
        date,
        notes,
      };
      if (loadType === "transfer") {
        body.toType = toType;
        body.toId = toId;
      } else {
        body.toType = "customer";
        if (customerId) body.toId = customerId;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to create");
        setSubmitting(false);
        throw new Error(err.error || "Failed to create");
      }
      showSuccess(loadType === "dispatch" ? "Truck dispatched for direct sale" : "Transfer created");
      router.push(loadType === "dispatch" ? "/truck-loads" : "/transfers");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
      throw e;
    }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">New Transfer</h1>
          <Link href="/wastage" className="text-sm text-brand-600 hover:underline">Record Spoilage</Link>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">Created by: {userDisplayName}</span>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl space-y-4">
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Load Type</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLoadType("transfer")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                loadType === "transfer"
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
              }`}
            >
              Transfer
            </button>
            <button
              type="button"
              onClick={() => setLoadType("dispatch")}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                loadType === "dispatch"
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
              }`}
            >
              Dispatch (Direct Sale)
            </button>
          </div>
        </div>

        {isDepotManager || isFactoryManager ? (
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-sm text-blue-700 dark:text-blue-400 font-medium">
            {loadType === "dispatch" ? "Dispatching from: " : "Transferring from: "}
            {isDepotManager ? userDepotName : userFactoryName} ({isDepotManager ? "Depot" : "Factory"})
          </div>
        ) : null}
        {isDepotManager || isFactoryManager ? null : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Type</label>
              <Select
                options={[
                  { value: "factory", label: "Factory" },
                  { value: "depot", label: "Depot" },
                  { value: "truck", label: "Truck" },
                ]}
                placeholder="Select type"
                onChange={(val) => { setFromType(val); setFromId(""); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Location</label>
              <Select
                options={fromOptions}
                placeholder={fromType ? "Select location" : "Select type first"}
                onChange={setFromId}
              />
            </div>
          </div>
        )}

        {loadType === "transfer" ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Type</label>
              <Select
                options={[
                  { value: "factory", label: "Factory" },
                  { value: "depot", label: "Depot" },
                  { value: "truck", label: "Truck" },
                ]}
                placeholder="Select type"
                onChange={(val) => { setToType(val); setToId(""); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Location</label>
              <Select
                options={toOptions}
                placeholder={toType ? "Select location" : "Select type first"}
                onChange={setToId}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer <span className="text-gray-400 font-normal">(optional — leave empty for walk-in sale)</span></label>
            <Select
              options={[
                { value: "", label: "Outside Sale / Walk-in" },
                ...customers,
              ]}
              placeholder="Select customer"
              onChange={setCustomerId}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
            <Select options={products} placeholder="Select product" onChange={setProductId} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
            <div className="relative">
              <InputField type="number" id="quantity" name="quantity" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              {availableStock !== null && fromId && productId && (
                <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  availableStock > 0
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${availableStock > 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                  {availableStock.toLocaleString()} avail.
                </div>
              )}
              {stockLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">loading...</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Truck</label>
            <Select options={trucks} placeholder="Select truck" onChange={setTruckId} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <DatePicker id="date" placeholder="Select date" defaultDate={date || undefined} maxDate={null} onChange={(_dates, dateStr) => setDate(dateStr)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <TextArea placeholder="Optional notes" value={notes} onChange={setNotes} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : loadType === "dispatch" ? "Dispatch Truck" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/transfers")}>
            Cancel
          </Button>
        </div>
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title={loadType === "dispatch" ? "Dispatch Truck" : "Create Transfer"}
        message={
          loadType === "dispatch" ? (
            <>
              You are about to dispatch a truck for direct sale. Stock will be loaded onto the truck immediately.
              <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                <li><strong>From:</strong> {locationName(fromId, fromType)} ({fromType})</li>
                <li><strong>Quantity:</strong> {quantity}</li>
                <li><strong>Customer:</strong> {customerId ? (customers.find(c => c.value === customerId)?.label ?? "Selected") : "Walk-in / Outside Sale"}</li>
              </ul>
              <p className="mt-2">Are you sure?</p>
            </>
          ) : (
            <>
              You are about to create a new stock transfer. This will affect stock levels at both locations.
              <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                <li><strong>From:</strong> {locationName(fromId, fromType)} ({fromType})</li>
                <li><strong>To:</strong> {locationName(toId, toType)} ({toType})</li>
                <li><strong>Quantity:</strong> {quantity}</li>
              </ul>
              <p className="mt-2">Once created, this transfer can be dispatched and confirmed. Are you sure?</p>
            </>
          )
        }
        confirmLabel={loadType === "dispatch" ? "Dispatch Truck" : "Create Transfer"}
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
