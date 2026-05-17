"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";

interface Option {
  value: string;
  label: string;
}

export default function NewTransferPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [fromType, setFromType] = useState("");
  const [fromId, setFromId] = useState("");
  const [toType, setToType] = useState("");
  const [toId, setToId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [truckId, setTruckId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const [factories, setFactories] = useState<Option[]>([]);
  const [depots, setDepots] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [trucks, setTrucks] = useState<Option[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setProducts(data.map((p) => ({ value: p._id, label: p.name })))
      );
    fetch("/api/trucks")
      .then((r) => r.json())
      .then((data: { _id: string; plateNumber: string }[]) =>
        setTrucks(data.map((t) => ({ value: t._id, label: t.plateNumber })))
      );
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

  const fromOptions = fromType === "factory" ? factories : fromType === "depot" ? depots : [];
  const toOptions = toType === "factory" ? factories : toType === "depot" ? depots : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromType,
        fromId,
        toType,
        toId,
        productId,
        quantity: Number(quantity),
        truckId,
        date,
        notes,
      }),
    });
    router.push("/transfers");
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">New Transfer</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Type</label>
            <Select
              options={[
                { value: "factory", label: "Factory" },
                { value: "depot", label: "Depot" },
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Type</label>
            <Select
              options={[
                { value: "factory", label: "Factory" },
                { value: "depot", label: "Depot" },
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
            <Select options={products} placeholder="Select product" onChange={setProductId} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
            <InputField type="number" id="quantity" name="quantity" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Truck</label>
            <Select options={trucks} placeholder="Select truck" onChange={setTruckId} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <DatePicker id="date" placeholder="Select date" defaultDate={date || undefined} onChange={(_dates, dateStr) => setDate(dateStr)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <TextArea placeholder="Optional notes" value={notes} onChange={setNotes} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/transfers")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
