"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import LocationPicker from "@/components/location/LocationPicker";
import type { LocationValue } from "@/components/location/LocationPicker";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function EditFactoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ name: "", capacity: "" });
  const [locationData, setLocationData] = useState<LocationValue>({ address: "", lat: 0, lng: 0, placeId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/factories/${id}`)
      .then(r => r.json())
      .then(data => {
        setForm({ name: data.name, capacity: String(data.capacity) });
        setLocationData({
          address: data.location ?? "",
          lat: data.coordinates?.lat ?? 0,
          lng: data.coordinates?.lng ?? 0,
          placeId: data.placeId ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLocationChange = useCallback((loc: LocationValue) => {
    setLocationData(loc);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/factories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          location: locationData.address,
          coordinates: { lat: locationData.lat, lng: locationData.lng },
          placeId: locationData.placeId,
          capacity: Number(form.capacity),
        }),
      });
      if (!res.ok) {
        showError("Failed to update factory");
        setSubmitting(false);
        throw new Error("Failed to update factory");
      }
      showSuccess("Factory updated");
      router.push("/factories");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Edit Factory</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <InputField id="name" name="name" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <LocationPicker value={locationData.address} latValue={locationData.lat} lngValue={locationData.lng} onChange={handleLocationChange} placeholder="Search for factory location…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capacity</label>
          <InputField id="capacity" name="capacity" type="number" value={form.capacity} onChange={handleChange} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Update"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/factories")}>
            Cancel
          </Button>
        </div>
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Update Factory"
        message={
          <>
            You are about to update this factory:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Name:</strong> {form.name}</li>
              <li><strong>Location:</strong> {locationData.address}</li>
              <li><strong>Capacity:</strong> {form.capacity}</li>
            </ul>
            <p className="mt-2">Changes will be applied immediately. Are you sure?</p>
          </>
        }
        confirmLabel="Update Factory"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
