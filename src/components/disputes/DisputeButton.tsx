"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";
import { showSuccess, showError } from "@/lib/toast";

interface Props {
  entity: string;
  entityId: string;
  entityLabel?: string;
  variant?: "outline" | "primary";
  size?: "sm" | "md";
  className?: string;
}

export default function DisputeButton({ entity, entityId, entityLabel, variant = "outline", size = "sm", className }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) { showError("Please enter a reason"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, entityId, entityLabel, reason, description }),
      });
      if (!res.ok) { showError("Failed to submit dispute"); return; }
      showSuccess("Dispute submitted");
      setOpen(false);
      setReason("");
      setDescription("");
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </Button>

      {open && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">File a Dispute</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {entityLabel || `${entity} #${entityId.slice(-6)}`}
            </p>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              >
                <option value="" className="dark:bg-gray-800 dark:text-white/90">Select a reason...</option>
                <option value="wrong-quantity" className="dark:bg-gray-800 dark:text-white/90">Wrong quantity</option>
                <option value="wrong-amount" className="dark:bg-gray-800 dark:text-white/90">Wrong amount/price</option>
                <option value="wrong-location" className="dark:bg-gray-800 dark:text-white/90">Wrong location</option>
                <option value="wrong-product" className="dark:bg-gray-800 dark:text-white/90">Wrong product</option>
                <option value="duplicate" className="dark:bg-gray-800 dark:text-white/90">Duplicate entry</option>
                <option value="unauthorized" className="dark:bg-gray-800 dark:text-white/90">Unauthorized action</option>
                <option value="other" className="dark:bg-gray-800 dark:text-white/90">Other</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what's wrong..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={submitting} onClick={submit}>{submitting ? "Submitting..." : "Submit Dispute"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
