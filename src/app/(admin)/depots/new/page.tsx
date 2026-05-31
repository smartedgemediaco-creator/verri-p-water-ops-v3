"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";
import InputField from "@/components/form/input/InputField";
import LocationPicker from "@/components/location/LocationPicker";
import type { LocationValue } from "@/components/location/LocationPicker";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function NewDepotPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "" });
  const [locationData, setLocationData] = useState<LocationValue>({ address: "", lat: 0, lng: 0, placeId: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      const res = await fetch("/api/depots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          location: locationData.address,
          coordinates: { lat: locationData.lat, lng: locationData.lng },
          placeId: locationData.placeId,
        }),
      });
      if (!res.ok) {
        showError("Failed to add depot");
        setSubmitting(false);
        throw new Error("Failed to add depot");
      }
      showSuccess("Depot added");
      router.push("/depots");
    } catch (e) {
      if (!(e instanceof Error) || !e.message) showError("Network error");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Add Depot</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <InputField id="name" name="name" placeholder="Depot name" value={form.name} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <LocationPicker value={locationData.address} onChange={handleLocationChange} placeholder="Search for depot location…" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/depots")}>
            Cancel
          </Button>
        </div>
      </form>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Create Depot"
        message={
          <>
            You are about to create a new depot:
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li><strong>Name:</strong> {form.name}</li>
              <li><strong>Location:</strong> {locationData.address}</li>
            </ul>
            <p className="mt-2">This entity will be immediately available in the system. Are you sure?</p>
          </>
        }
        confirmLabel="Create Depot"
        variant="warning"
        loading={submitting}
      />
    </div>
  );
}
