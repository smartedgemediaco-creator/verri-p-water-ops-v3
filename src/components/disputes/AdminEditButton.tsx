"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import { showSuccess, showError } from "@/lib/toast";
import { PencilIcon } from "@/icons";
import { useAuth } from "@/context/AuthContext";

interface Field {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface Props {
  entity: string;
  entityId: string;
  entityLabel?: string;
  apiPath: string;
  fields: Field[];
  initialValues: Record<string, unknown>;
  onSaved?: () => void;
}

export default function AdminEditButton({ entity, entityId, entityLabel, apiPath, fields, initialValues, onSaved }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [saving, setSaving] = useState(false);

  if (user?.role !== "admin") return null;

  const openModal = () => {
    setValues(initialValues);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) {
        if (values[f.key] !== initialValues[f.key]) {
          body[f.key] = values[f.key];
        }
      }
      if (Object.keys(body).length === 0) { showError("No changes made"); return; }

      if (body.amount != null) body.amount = Number(body.amount);
      if (body.quantity != null) body.quantity = Number(body.quantity);

      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showError("Failed to update"); return; }
      showSuccess(`${entity} updated`);
      setOpen(false);
      onSaved?.();
    } catch { showError("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <button onClick={openModal} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors" title={`Edit ${entity}`}>
        <PencilIcon className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Edit {entity}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{entityLabel || entity}</p>

            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      value={(values[f.key] as string) ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
                    >
                      <option value="">Select {f.label}...</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      value={(values[f.key] as string) ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 resize-none"
                    />
                  ) : (
                    <InputField
                      id={`edit-${f.key}`}
                      type={f.type}
                      placeholder={f.label}
                      value={values[f.key]?.toString() ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
