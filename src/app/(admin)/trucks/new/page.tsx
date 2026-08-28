"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Select from "@/components/form/Select";

export default function NewTruckPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", plateNumber: "", chassisNumber: "", engineNumber: "", capacity: "" });
  const [driverId, setDriverId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [drivers, setDrivers] = useState<{ value: string; label: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetch("/api/staff").then(r=>r.json()).then((data: unknown)=>{
      if(Array.isArray(data)){
        const list = (data as { _id:string; name:string; role:string; phone:string; beneficiary?:{name:string} }[]).filter(s=>s.role==="driver");
        setDrivers(list.map(s=>({ value: s._id, label: `${s.name} — ${s.phone}${s.beneficiary?.name ? ` • Beneficiary: ${s.beneficiary.name}` : " • No beneficiary ⚠️"}` })));
      }
    }).catch(()=>{});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plateNumber.trim()) {
      showError("Plate number is required");
      return;
    }
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    const body: Record<string, unknown> = { ...form, capacity: Number(form.capacity), driverId: driverId || undefined, licenseNumber: licenseNumber || undefined };
    try {
      const res = await fetch("/api/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) {
        showError((data as {error?:string}).error || "Failed to add truck");
        setSubmitting(false);
        return;
      }
      showSuccess("Truck added");
      router.push("/trucks");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Add Truck/Tricycle</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="name" name="name" placeholder="e.g. Truck 1, Blue Van" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate Number <span className="text-red-500">*</span></label>
          <InputField id="plateNumber" name="plateNumber" placeholder="Plate number" value={form.plateNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassis Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="chassisNumber" name="chassisNumber" placeholder="Chassis number" value={form.chassisNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engine Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="engineNumber" name="engineNumber" placeholder="Engine number" value={form.engineNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="capacity" name="capacity" type="number" placeholder="Capacity" value={form.capacity} onChange={handleChange} />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Driver <span className="text-gray-400 font-normal">(optional – staff must have beneficiary)</span></label>
          <Select options={[{ value: "", label: "— No driver" }, ...drivers]} value={driverId} onChange={setDriverId} placeholder="Select driver" />
          {driverId && <p className="text-[11px] text-gray-500 mt-1">Driver will be linked via <Link href={`/staff/${driverId}`} className="text-brand-600 hover:underline">staff profile</Link> – must have beneficiary, phone & email.</p>}
        </div>
        {driverId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Number <span className="text-gray-400 font-normal">(optional)</span></label>
            <InputField id="licenseNumber" name="licenseNumber" placeholder="License number" value={licenseNumber} onChange={(e)=>setLicenseNumber(e.target.value)} />
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting || !form.plateNumber.trim()}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/trucks")}>
            Cancel
          </Button>
        </div>
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Create Delivery Vehicle"
        message={
          <>
            You are about to create a new delivery vehicle:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              {form.name && <li><strong>Name:</strong> {form.name}</li>}
              <li><strong>Plate:</strong> {form.plateNumber}</li>
              <li><strong>Chassis:</strong> {form.chassisNumber || "—"}</li>
              <li><strong>Engine:</strong> {form.engineNumber || "—"}</li>
              <li><strong>Capacity:</strong> {form.capacity}</li>
              {driverId && <li><strong>Driver:</strong> {drivers.find(d=>d.value===driverId)?.label}</li>}
            </ul>
            <p className="mt-2">This entity will be immediately available in the system. Are you sure?</p>
          </>
        }
        confirmLabel="Create Vehicle"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
