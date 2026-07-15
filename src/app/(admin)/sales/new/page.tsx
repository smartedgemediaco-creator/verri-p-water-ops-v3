"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/dateFormat";
import { CloseIcon } from "@/icons";

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
  const [productsList, setProductsList] = useState<{ value: string; label: string; unitPrice: number; chilledPrice?: number }[]>([]);
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
  const [isChilled, setIsChilled] = useState(false);

  const [existingCustomer, setExistingCustomer] = useState<boolean | null>(null);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const customerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    customerName: string;
    paymentMethod: string;
    date: string;
    locationName: string;
    recordedBy: string;
  } | null>(null);
  const [receiptPdfLoading, setReceiptPdfLoading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locationType && locationId && productId) {
      fetch(`/api/stock?locationType=${locationType}&locationId=${locationId}&productId=${productId}`)
        .then((r) => r.json())
        .then((data: { quantity?: number }[]) => {
          const total = Array.isArray(data) ? data.reduce((s, item) => s + (item.quantity ?? 0), 0) : 0;
          setAvailableStock(total);
        })
        .catch(() => setAvailableStock(null))
        .finally(() => setStockLoading(false));
    }
  }, [locationType, locationId, productId]);

  const isDepotManager = user?.role === "depot-manager";
  const isFactoryManager = user?.role === "factory-manager";

  const userDisplayName = user?.name ?? user?.email ?? "User";
  const userDepotName = user?.depotName ?? (typeof user?.depotId === "object" ? user.depotId?.name : undefined) ?? "Your Depot";
  const userFactoryName = user?.factoryName ?? (typeof user?.factoryId === "object" ? user.factoryId?.name : undefined) ?? "Your Factory";

  useEffect(() => {
    if (isDepotManager && !locationType) {
      setLocationType("depot"); // eslint-disable-line react-hooks/set-state-in-effect
    }
    if (isFactoryManager && !locationType) {
      setLocationType("factory"); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [isDepotManager, isFactoryManager, locationType]);

  useEffect(() => {
    if (isDepotManager && user?.depotId && locations.length === 0) {
      const id = typeof user.depotId === "string" ? user.depotId : user.depotId._id;
      const name = user.depotName ?? (typeof user.depotId === "object" ? user.depotId.name : "My Depot");
      setLocations([{ value: id, label: name }]); // eslint-disable-line react-hooks/set-state-in-effect
      setLocationId(id); // eslint-disable-line react-hooks/set-state-in-effect
    }
    if (isFactoryManager && user?.factoryId && locations.length === 0) {
      const id = typeof user.factoryId === "string" ? user.factoryId : user.factoryId._id;
      const name = user.factoryName ?? (typeof user.factoryId === "object" ? user.factoryId.name : "My Factory");
      setLocations([{ value: id, label: name }]); // eslint-disable-line react-hooks/set-state-in-effect
      setLocationId(id); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [isDepotManager, isFactoryManager, user?.depotId, user?.factoryId, user?.depotName, user?.factoryName, locations.length]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: { _id: string; name: string; unitPrice?: number; chilledPrice?: number }[]) =>
        setProductsList(data.map((p) => ({ value: p._id, label: p.name, unitPrice: p.unitPrice ?? 0, chilledPrice: p.chilledPrice })))
      );
  }, []);

  // auto-fill unit price when product changes
  useEffect(() => {
    if (!productId) return;
    const found = productsList.find((p) => p.value === productId);
    if (found) {
      setUnitPrice(String(found.unitPrice)); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [productId, productsList]);

  useEffect(() => {
    if (!locationType) return;
    let cancelled = false;
    const endpoint = locationType === "truck" ? "/api/trucks" : locationType === "factory" ? "/api/factories" : `/api/${locationType}s`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: { _id: string; name?: string; plateNumber?: string }[]) => {
        if (!cancelled && Array.isArray(data)) {
          setLocations(
            data.map((d) => ({
              value: d._id,
              label: d.name ?? `Truck: ${d.plateNumber ?? "Unknown"}`,
            }))
          );
        }
      });
    const hasAutoLocation =
      (isDepotManager && user?.depotId) ||
      (isFactoryManager && user?.factoryId);
    if (!hasAutoLocation) {
      setLocationId(""); // eslint-disable-line react-hooks/set-state-in-effect
    }
    setPosDeviceId(""); // eslint-disable-line react-hooks/set-state-in-effect
    return () => { cancelled = true; };
  }, [locationType, isDepotManager, isFactoryManager, user?.depotId, user?.factoryId]);

  useEffect(() => {
    if (!locationType) { setPosDevices([]); return; } // eslint-disable-line react-hooks/set-state-in-effect
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

  const searchCustomer = useCallback((name: string) => {
    if (customerSearchTimer.current) clearTimeout(customerSearchTimer.current);
    if (!name.trim()) {
      setExistingCustomer(null);
      setCustomerSearching(false);
      return;
    }
    setCustomerSearching(true);
    customerSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(name.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const exactMatch = data.some(
            (c: { name: string }) => c.name.toLowerCase() === name.trim().toLowerCase()
          );
          setExistingCustomer(exactMatch);
        } else {
          setExistingCustomer(null);
        }
      } catch {
        setExistingCustomer(null);
      } finally {
        setCustomerSearching(false);
      }
    }, 500);
  }, []);

  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    searchCustomer(value);
  };

  const saveNewCustomer = async () => {
    if (!customerName.trim()) return;
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName.trim(),
          phone: newCustomerPhone.trim(),
          email: newCustomerEmail.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        showError(err.error || "Failed to save customer");
        return;
      }
      showSuccess(`Customer "${customerName.trim()}" added`);
      setExistingCustomer(true);
      setShowAddCustomer(false);
      setNewCustomerPhone("");
      setNewCustomerEmail("");
    } catch {
      showError("Network error saving customer");
    } finally {
      setSavingCustomer(false);
    }
  };

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
        condition: isChilled ? "chilled" : "ordinary",
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
      const product = productsList.find((p) => p.value === productId);
      const loc = locations.find((l) => l.value === locationId);
      setLastSale({
        productName: product?.label ?? "Product",
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        totalAmount: Number(quantity) * Number(unitPrice),
        customerName: customerName || "Walk-in Customer",
        paymentMethod,
        date: date ? formatDate(date) : formatDate(new Date().toISOString()),
        locationName: loc?.label ?? locationType,
        recordedBy: userDisplayName,
      });
      setReceiptOpen(true);
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
      throw e;
    }
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current || !lastSale) return;
    setReceiptPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        imageTimeout: 0,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, "JPEG", 10, 10, imgW, imgH);
      pdf.save(`receipt-${lastSale.productName}-${lastSale.date.replace(/\//g, "-")}.pdf`);
    } catch (err) {
      console.error("Receipt PDF failed", err);
      showError("Failed to generate PDF");
    } finally {
      setReceiptPdfLoading(false);
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
            <Select options={productsList} placeholder="Select product" value={productId} onChange={(val) => { setProductId(val); setIsChilled(false); }} />
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

        {productId && productsList.find((p) => p.value === productId)?.chilledPrice && (
          <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-500/10 rounded-lg">
            <button
              type="button"
              onClick={() => {
                const next = !isChilled;
                setIsChilled(next);
                const found = productsList.find((p) => p.value === productId);
                if (found) {
                  setUnitPrice(String(next && found.chilledPrice ? found.chilledPrice : found.unitPrice));
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isChilled ? "bg-cyan-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isChilled ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cold</span>
              {isChilled && (
                <span className="ml-2 text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                  Chilled price: ₦{productsList.find((p) => p.value === productId)?.chilledPrice?.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦)</label>
            <InputField type="number" id="unitPrice" placeholder="Unit price" value={unitPrice} disabled />
            {unitPrice && <p className="text-xs text-gray-400 mt-1">{isChilled ? "Chilled price" : "Price from product catalog"} — set on product record</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name <span className="text-gray-400 font-normal">(Optional)</span></label>
            <InputField id="customerName" placeholder="Leave blank for walk-in" value={customerName} onChange={(e) => handleCustomerNameChange(e.target.value)} />
            {customerName.trim() && existingCustomer === false && !customerSearching && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-orange-600 dark:text-orange-400">New customer</span>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(true)}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  + Save to customer list
                </button>
              </div>
            )}
            {customerSearching && customerName.trim() && (
              <p className="mt-1 text-xs text-gray-400">Searching...</p>
            )}
            {existingCustomer === true && (
              <p className="mt-1 text-xs text-success-600 dark:text-success-400">Existing customer</p>
            )}
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
            You are about to record a sale that will <strong>permanently deduct stock</strong>:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Quantity:</strong> {quantity}</li>
              <li><strong>Total:</strong> ₦{(Number(quantity) * Number(unitPrice)).toLocaleString()}</li>
              <li><strong>Payment:</strong> {paymentMethod}</li>
            </ul>
            <p className="mt-2 text-red-600 dark:text-red-400 font-medium">This action cannot be undone — stock will be reduced.</p>
          </>
        }
        confirmLabel="Record Sale"
        variant="password"
        loading={submitting}
      />

      {showAddCustomer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddCustomer(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add New Customer</h3>
              <button onClick={() => setShowAddCustomer(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <InputField id="newCustomerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone <span className="text-gray-400 font-normal">(Optional)</span></label>
                <InputField id="newCustomerPhone" placeholder="e.g. 08012345678" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
                <InputField id="newCustomerEmail" placeholder="e.g. customer@example.com" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="primary" size="sm" onClick={saveNewCustomer} disabled={savingCustomer || !customerName.trim()}>
                {savingCustomer ? "Saving..." : "Save Customer"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowAddCustomer(false); setNewCustomerPhone(""); setNewCustomerEmail(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {receiptOpen && lastSale && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 text-center shrink-0">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white">Sale Recorded!</h3>
              <p className="text-sm text-white/70 mt-0.5">Share receipt with your customer</p>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">
              <div ref={receiptRef} className="bg-white rounded-xl p-5 mb-5 border border-gray-200 shadow-sm" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                <div className="text-center mb-4 pb-3" style={{ borderBottom: "2px solid #465FFF" }}>
                  <div className="text-lg font-extrabold tracking-tight" style={{ color: "#465FFF" }}>VERRI P WATER INC</div>
                  <div className="text-xs mt-0.5" style={{ color: "#6b7280" }}>100% Pure & Safe Drinking Water</div>
                  <div className="text-xs" style={{ color: "#6b7280" }}>Nigeria</div>
                </div>
                <div className="text-center mb-3">
                  <span className="text-xs font-bold px-3 py-1 rounded" style={{ color: "#374151", background: "#f3f4f6" }}>SALES RECEIPT</span>
                </div>
                <div className="text-center text-xs mb-3" style={{ color: "#6b7280" }}>{lastSale.date}</div>
                <div className="border-t border-dashed my-2" style={{ borderColor: "#e5e7eb" }} />
                <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td className="py-1" style={{ color: "#6b7280" }}>Product</td><td className="py-1 text-right font-semibold">{lastSale.productName}</td></tr>
                    <tr><td className="py-1" style={{ color: "#6b7280" }}>Quantity</td><td className="py-1 text-right font-semibold">{lastSale.quantity.toLocaleString()}</td></tr>
                    <tr><td className="py-1" style={{ color: "#6b7280" }}>Unit Price</td><td className="py-1 text-right font-semibold">₦{lastSale.unitPrice.toLocaleString()}</td></tr>
                  </tbody>
                </table>
                <div className="my-2" style={{ borderTop: "2px solid #465FFF" }} />
                <div className="flex justify-between text-sm font-extrabold" style={{ color: "#465FFF" }}>
                  <span>TOTAL</span>
                  <span>₦{lastSale.totalAmount.toLocaleString()}</span>
                </div>
                <div className="border-t border-dashed my-2" style={{ borderColor: "#e5e7eb" }} />
                <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td className="py-0.5" style={{ color: "#6b7280" }}>Payment</td><td className="py-0.5 text-right font-semibold capitalize">{lastSale.paymentMethod}</td></tr>
                    <tr><td className="py-0.5" style={{ color: "#6b7280" }}>Customer</td><td className="py-0.5 text-right font-semibold">{lastSale.customerName}</td></tr>
                    <tr><td className="py-0.5" style={{ color: "#6b7280" }}>Location</td><td className="py-0.5 text-right font-semibold">{lastSale.locationName}</td></tr>
                    <tr><td className="py-0.5" style={{ color: "#6b7280" }}>Recorded by</td><td className="py-0.5 text-right font-semibold">{lastSale.recordedBy}</td></tr>
                  </tbody>
                </table>
                <div className="border-t border-dashed mt-3 pt-2 text-center text-xs" style={{ borderColor: "#e5e7eb", color: "#9ca3af" }}>
                  Thank you for your purchase!<br/>Verri P Water Inc &mdash; Nigeria
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={downloadReceipt}
                  disabled={receiptPdfLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  {receiptPdfLoading ? "Generating PDF..." : "Download PDF Receipt"}
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `*Verri P Water Inc - Sales Receipt*\n\n` +
                      `Date: ${lastSale.date}\n` +
                      `Product: ${lastSale.productName}\n` +
                      `Quantity: ${lastSale.quantity.toLocaleString()}\n` +
                      `Unit Price: ₦${lastSale.unitPrice.toLocaleString()}\n` +
                      `Total: ₦${lastSale.totalAmount.toLocaleString()}\n` +
                      `Payment: ${lastSale.paymentMethod}\n` +
                      `Customer: ${lastSale.customerName}\n` +
                      `Location: ${lastSale.locationName}\n\n` +
                      `Thank you for your purchase!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold text-sm transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      `Sales Receipt - Verri P Water Inc (${lastSale.date})`
                    )}&body=${encodeURIComponent(
                      `Verri P Water Inc - Sales Receipt\n` +
                      `================================\n\n` +
                      `Date: ${lastSale.date}\n` +
                      `Product: ${lastSale.productName}\n` +
                      `Quantity: ${lastSale.quantity.toLocaleString()}\n` +
                      `Unit Price: ₦${lastSale.unitPrice.toLocaleString()}\n` +
                      `Total: ₦${lastSale.totalAmount.toLocaleString()}\n` +
                      `Payment: ${lastSale.paymentMethod}\n` +
                      `Customer: ${lastSale.customerName}\n` +
                      `Location: ${lastSale.locationName}\n` +
                      `Recorded by: ${lastSale.recordedBy}\n\n` +
                      `Thank you for your purchase!`
                    )}`}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Email
                  </a>
                </div>
              </div>

              <button
                onClick={() => { setReceiptOpen(false); setLastSale(null); router.push("/sales"); }}
                className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                View All Sales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
