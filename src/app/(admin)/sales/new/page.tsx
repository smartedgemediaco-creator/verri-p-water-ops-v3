"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";

const LOCATION_TYPES = [
  { value: "depot", label: "Depot" },
  { value: "factory", label: "Factory" },
  { value: "truck", label: "Truck" },
];

export default function NewSalePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

  const [locationType, setLocationType] = useState("");
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { _id: string; name: string }[]) =>
        setProducts(data.map((p) => ({ value: p._id, label: p.name })))
      );
  }, []);

  useEffect(() => {
    if (!locationType) {
      setLocations([]); // eslint-disable-line react-hooks/set-state-in-effect
      setLocationId(""); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    const endpoint = locationType === "truck" ? "/api/trucks" : `/api/${locationType}s`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: { _id: string; name?: string; plateNumber?: string }[]) => {
        if (Array.isArray(data)) {
          setLocations(
            data.map((d) => ({
              value: d._id,
              label: d.name ?? `Truck: ${d.plateNumber ?? d._id.slice(-6)}`,
            }))
          );
        }
      });
    setLocationId("");
  }, [locationType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationType,
        locationId,
        productId,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        totalAmount: Number(quantity) * Number(unitPrice),
        customerName,
        date: date || undefined,
        notes,
      }),
    });
    router.push("/sales");
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Record Sale</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sale From</label>
            <Select options={LOCATION_TYPES} placeholder="Select origin" onChange={setLocationType} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <Select
              options={locations}
              placeholder={locationType ? `Select ${locationType}` : "Select origin first"}
              value={locationId}
              onChange={setLocationId}
              className={!locationType ? "opacity-50" : ""}
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
            <InputField type="number" id="quantity" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦)</label>
            <InputField type="number" id="unitPrice" placeholder="Unit price" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
            <InputField id="customerName" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
        </div>

        {quantity && unitPrice && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: <strong>₦{(Number(quantity) * Number(unitPrice)).toLocaleString()}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
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
            {submitting ? "Saving..." : "Record Sale"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/sales")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
