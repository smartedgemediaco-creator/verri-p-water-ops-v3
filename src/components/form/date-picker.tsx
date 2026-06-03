"use client";
import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";

type PropsType = {
  id: string;
  mode?: "single";
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
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(
    () => toDate(defaultDate)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (date: Date | undefined) => {
    setSelected(date);
    if (onChange) {
      onChange(date ? [date] : [], date ? format(date, "dd/MM/yyyy") : "");
    }
    setIsOpen(false);
  };

  const displayValue = selected ? format(selected, "dd/MM/yyyy") : "";

  return (
    <div ref={containerRef} className="relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <input
          id={id}
          type="text"
          readOnly
          placeholder={placeholder}
          value={displayValue}
          onClick={() => setIsOpen(!isOpen)}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 cursor-pointer"
        />
        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={maxDate === null ? undefined : maxDate ? { after: maxDate } : { after: new Date() }}
            defaultMonth={selected}
          />
        </div>
      )}
    </div>
  );
}
