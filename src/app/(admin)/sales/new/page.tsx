"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "transfer", label: "Transfer" },
  { value: "credit", label: "Credit" },
];

export default function NewSalePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([]);
  const [productsList, setProductsList] = useState<{ value: string; label: string; unitPrice: number }[]>([]);
  const [posDevices, setPosDevices] = useState<{ value: string; label: string }[]>([]);

  const [locationType, setLocationType] = useState("");
  const [locationId, setLocationId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [posDeviceId, setPosDeviceId] = useState("");
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (locationType && locationId && productId) {
      setStockLoading(true);
      fetch(`/api/inventory?locationType=${locationType}&locationId=${locationId}&productId=${productId}`)
        .then((r) => r.json())
        .then((data: { quantity?: number }[]) => {
          const total = Array.isArray(data) ? data.reduce((s, item) => s + (item.quantity ?? 0), 0) : 0;
          setAvailableStock(total);
        })
        .catch(() => setAvailableStock(null))
        .finally(() => setStockLoading(false));
    } else {
      setAvailableStock(null);
    }
  }, [locationType, locationId, productId]);

  const isDepotManager = user?.role === "depot-manager";
  const isFactoryManager = user?.role === "factory-manager";
  const isAdmin = user?.role === "admin";
  const priceLocked = !isAdmin;

  const userDisplayName = user?.name ?? user?.email ?? "User";
  const userDepotName = user?.depotName ?? (typeof user?.depotId === "object" ? user.depotId?.name : undefined) ?? "Your Depot";
  const userFactoryName = user?.factoryName ?? (typeof user?.factoryId === "object" ? user.factoryId?.name : undefined) ?? "Your Factory";

  useEffect(() => {
    if (isDepotManager && !locationType) {
      setLocationType("depot");
    }
    if (isFactoryManager && !locationType) {
      setLocationType("factory");
    }
  }, [isDepotManager, isFactoryManager, locationType]);

  useEffect(() => {
    if (isDepotManager && user?.depotId && locations.length === 0) {
      const id = typeof user.depotId === "string" ? user.depotId : user.depotId._id;
      const name = user.depotName ?? (typeof user.depotId === "object" ? user.depotId.name : "My Depot");
      setLocations([{ value: id, label: name }]);
      setLocationId(id);
    }
    if (isFactoryManager && user?.factoryId && locations.length === 0) {
      const id = typeof user.factoryId === "string" ? user.factoryId : user.factoryId._id;
      const name = user.factoryName ?? (typeof user.factoryId === "object" ? user.factoryId.name : "My Factory");
      setLocations([{ value: id, label: name }]);
      setLocationId(id);
    }
  }, [isDepotManager, isFactoryManager, user?.depotId, user?.factoryId, user?.depotName, user?.factoryName, locations.length]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { _id: string; name: string; unitPrice?: number }[]) =>
        setProductsList(data.map((p) => ({ value: p._id, label: p.name, unitPrice: p.unitPrice ?? 0 })))
      );
  }, []);

  // auto-fill unit price when product changes
  useEffect(() => {
    if (!productId) return;
    const found = productsList.find((p) => p.value === productId);
    if (found) {
      setUnitPrice(String(found.unitPrice));
    }
  }, [productId, productsList]);

  useEffect(() => {
    const hasAutoLocation =
      (isDepotManager && user?.depotId) ||
      (isFactoryManager && user?.factoryId);
    if (!locationType) {
      setLocations([]);
      if (!hasAutoLocation) setLocationId("");
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
    // Don't clear locationId for role-scoped users with auto-assigned locations
    if (!hasAutoLocation) {
      setLocationId("");
    }
    setPosDeviceId("");
  }, [locationType, isDepotManager, isFactoryManager, user?.depotId, user?.factoryId]);

  useEffect(() => {
    if (!locationType) { setPosDevices([]); return; }
    fetch(`/api/pos-devices?locationType=${locationType}`)
      .then((r) => r.json())
      .then((data: { _id: string; name: string; terminalSerial: string }[]) => {
        if (Array.isArray(data)) {
          setPosDevices(
            data.map((d) => ({
              value: d._id,
              label: `${d.name} (${d.terminalSerial})`,
            }))
          );
        }
      })
      .catch(() => setPosDevices([]));
  }, [locationType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        locationType,
        locationId,
        productId,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        totalAmount: Number(quantity) * Number(unitPrice),
        customerName,
        date: date || undefined,
        notes,
        paymentMethod,
      };
      if (paymentMethod === "pos" && posDeviceId) body.posDeviceId = posDeviceId;
      if (paymentMethod === "credit") {
        body.isPaid = false;
        body.paidAmount = 0;
      }

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Failed to record sale");
        setSubmitting(false);
        throw new Error(err.error || "Failed to record sale");
      }
      showSuccess("Sale recorded");
      router.push("/sales");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
      throw e;
    }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Record Sale</h1>
        <span className="text-xs text-gray-400 dark:text-gray-500">Recorded by: {userDisplayName}</span>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl space-y-4">
        {isDepotManager || isFactoryManager ? (
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-sm text-blue-700 dark:text-blue-400 font-medium">
            Selling from: {isDepotManager ? userDepotName : userFactoryName} ({isDepotManager ? "Depot" : "Factory"})
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sale From</label>
              <Select options={[{ value: "depot", label: "Depot" }, { value: "factory", label: "Factory" }, { value: "truck", label: "Truck" }]} placeholder="Select origin" onChange={setLocationType} />
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
            <Select options={productsList} placeholder="Select product" onChange={setProductId} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
            <div className="relative">
              <InputField type="number" id="quantity" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              {availableStock !== null && locationId && productId && (
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦)</label>
            <InputField type="number" id="unitPrice" placeholder="Unit price" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} disabled={priceLocked} />
            {priceLocked && unitPrice && <p className="text-xs text-gray-400 mt-1">Price from product catalog — contact admin to change</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
            <InputField id="customerName" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
            <Select options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
          </div>
          {paymentMethod === "pos" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">POS Device</label>
              <Select
                options={posDevices}
                placeholder={locationType ? "Select POS device" : "Select origin first"}
                value={posDeviceId}
                onChange={setPosDeviceId}
                className={!locationType ? "opacity-50" : ""}
              />
            </div>
          )}
          {paymentMethod === "credit" && (
            <div className="flex items-end">
              <p className="text-sm text-orange-600 dark:text-orange-400">This sale will be marked as unpaid credit.</p>
            </div>
          )}
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

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Record Sale"
        message={
          <>
            You are about to record a sale that will <strong>permanently deduct inventory</strong>:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Quantity:</strong> {quantity}</li>
              <li><strong>Total:</strong> ₦{(Number(quantity) * Number(unitPrice)).toLocaleString()}</li>
              <li><strong>Payment:</strong> {paymentMethod}</li>
            </ul>
            <p className="mt-2 text-red-600 dark:text-red-400 font-medium">This action cannot be undone — inventory will be reduced.</p>
          </>
        }
        confirmLabel="Record Sale"
        variant="password"
        loading={submitting}
      />
    </div>
  );
}
