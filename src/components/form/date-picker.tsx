"use client";
import { useState, useCallback } from "react";
import Label from "./Label";
import { CalenderIcon } from "../../icons";

type PropsType = {
  id: string;
  onChange?: (selectedDates: Date[], dateStr: string) => void;
  defaultDate?: Date | Date[] | string;
  label?: string;
  placeholder?: string;
  maxDate?: Date | null;
};

function toDate(val: Date | Date[] | string | undefined): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (Array.isArray(val)) return val[0] instanceof Date ? val[0] : undefined;
  return undefined;
}

export default function DatePicker({
  id,
  onChange,
  label,
  defaultDate,
  placeholder,
  maxDate,
}: PropsType) {
  const [selected, setSelected] = useState<Date | undefined>(
    () => toDate(defaultDate)
  );

  const value = selected ? toISOLocal(selected) : "";

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) {
      setSelected(undefined);
      onChange?.([], "");
      return;
    }
    const d = new Date(raw + "T00:00:00");
    if (isNaN(d.getTime())) return;
    setSelected(d);
    onChange?.([d], formatDDMMYYYY(d));
  }, [onChange]);

  return (
    <div className="relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <input
          id={id}
          type="date"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          max={maxDate ? toISOLocal(maxDate) : undefined}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden"
        />
        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-white">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}

function toISOLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}
