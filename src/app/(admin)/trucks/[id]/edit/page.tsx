"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Select from "@/components/form/Select";

export default function EditTruckPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ name: "", plateNumber: "", chassisNumber: "", engineNumber: "", capacity: "" });
  const [driverId, setDriverId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [drivers, setDrivers] = useState<{ value: string; label: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/trucks/${id}`).then(r => r.json()).then((truck) => {
      setForm({ name: truck.name ?? "", plateNumber: truck.plateNumber, chassisNumber: truck.chassisNumber ?? "", engineNumber: truck.engineNumber ?? "", capacity: String(truck.capacity) });
      if (truck.driver?._id) setDriverId(truck.driver._id);
      if (truck.driverAssignment?.licenseNumber) setLicenseNumber(truck.driverAssignment.licenseNumber);
    }).finally(() => setLoading(false));
    fetch("/api/staff").then(r=>r.json()).then((data: unknown)=>{
      if(Array.isArray(data)){
        const list = (data as { _id:string; name:string; role:string; phone:string; beneficiary?:{name:string} }[]).filter(s=>s.role==="driver");
        setDrivers(list.map(s=>({ value: s._id, label: `${s.name} — ${s.phone}${s.beneficiary?.name ? ` • Beneficiary: ${s.beneficiary.name}` : " • No beneficiary ⚠️"}` })));
      }
    }).catch(()=>{});
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const doSubmit = async () => {
    setSubmitting(true);
    const body: Record<string, unknown> = { ...form, capacity: Number(form.capacity), driverId: driverId || null, licenseNumber };
    try {
      const res = await fetch(`/api/trucks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) {
        showError((data as {error?:string}).error || "Failed to update truck");
        setSubmitting(false);
        return;
      }
      showSuccess("Truck updated");
      router.push(`/trucks/${id}`);
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plateNumber.trim()) {
      showError("Plate number is required");
      return;
    }
    setConfirmOpen(true);
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Edit Truck/Tricycle</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="name" name="name" placeholder="e.g. Truck 1, Blue Van" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plate Number <span className="text-red-500">*</span></label>
          <InputField id="plateNumber" name="plateNumber" value={form.plateNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassis Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="chassisNumber" name="chassisNumber" value={form.chassisNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engine Number <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="engineNumber" name="engineNumber" value={form.engineNumber} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity <span className="text-gray-400 font-normal">(optional)</span></label>
          <InputField id="capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Driver <span className="text-gray-400 font-normal">(optional)</span></label>
          <Select options={[{ value: "", label: "— No driver" }, ...drivers]} value={driverId} onChange={setDriverId} placeholder="Select driver" />
          {driverId ? <p className="text-[11px] text-gray-500 mt-1">Linked to <Link href={`/staff/${driverId}`} className="text-brand-600 hover:underline">staff</Link> – must have beneficiary.</p> : <p className="text-[11px] text-gray-400 mt-1">Leave empty for unassigned.</p>}
        </div>
        {driverId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Number</label>
            <InputField id="licenseNumber" name="licenseNumber" placeholder="License number" value={licenseNumber} onChange={(e)=>setLicenseNumber(e.target.value)} />
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting || !form.plateNumber.trim()}>
            {submitting ? "Saving..." : "Update"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/trucks/${id}`)}>
            Cancel
          </Button>
        </div>
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Confirm Vehicle Update"
        message={
          <>
            You are about to update this delivery vehicle:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              {form.name && <li><strong>Name:</strong> {form.name}</li>}
              <li><strong>Plate:</strong> {form.plateNumber}</li>
              <li><strong>Chassis:</strong> {form.chassisNumber || "—"}</li>
              <li><strong>Engine:</strong> {form.engineNumber || "—"}</li>
              <li><strong>Capacity:</strong> {form.capacity}</li>
              {driverId && <li><strong>Driver:</strong> {drivers.find(d=>d.value===driverId)?.label}</li>}
            </ul>
            <p className="mt-2">Changes will be applied immediately. Are you sure?</p>
          </>
        }
        confirmLabel="Update Vehicle"
        variant="warning"
      />
    </div>
  );
}
