"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import useLocationSearch from "@/hooks/useLocationSearch";

export interface LocationValue {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface LocationPickerProps {
  value?: string;
  latValue?: number;
  lngValue?: number;
  onChange: (location: LocationValue) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export default function LocationPicker({
  value = "",
  latValue = 0,
  lngValue = 0,
  onChange,
  placeholder = "Search for a location…",
  disabled = false,
  id = "location",
  name = "location",
}: LocationPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [lat, setLat] = useState(latValue);
  const [lng, setLng] = useState(lngValue);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { suggestions, loading } = useLocationSearch(inputValue);

  const hasKey =
    typeof window !== "undefined" &&
    !!process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;

  useEffect(() => {
    if (inputValue !== value) setInputValue(value); // eslint-disable-line react-hooks/set-state-in-effect
  }, [value]);

  useEffect(() => {
    setLat(latValue); // eslint-disable-line react-hooks/set-state-in-effect
    setLng(lngValue); // eslint-disable-line react-hooks/set-state-in-effect
  }, [latValue, lngValue]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const emitChange = useCallback(
    (addr: string, lt: number, ln: number, pid: string) => {
      setInputValue(addr);
      setLat(lt);
      setLng(ln);
      onChange({ address: addr, lat: lt, lng: ln, placeId: pid });
    },
    [onChange]
  );

  const selectSuggestion = useCallback(
    (s: { address: string; lat: number; lng: number; placeId: string }) => {
      emitChange(s.address, s.lat, s.lng, s.placeId);
      setFocused(false);
      inputRef.current?.blur();
    },
    [emitChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (focused && val !== value) {
      onChange({ address: val, lat: 0, lng: 0, placeId: "" });
    }
  };

  const handleBlur = () => {
    if (inputValue !== value && inputValue.length >= 3) {
      onChange({ address: inputValue, lat: 0, lng: 0, placeId: "" });
    }
  };

  const showDropdown = focused && inputValue.length >= 3 && hasKey && !disabled;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder={
          hasKey
            ? placeholder
            : 'Add NEXT_PUBLIC_LOCATIONIQ_API_KEY to .env.local'
        }
        disabled={disabled}
        className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-800 dark:disabled:text-gray-400 dark:disabled:border-gray-700"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-[9999] top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-theme-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.placeId}-${i}`}
              type="button"
              onMouseDown={() => selectSuggestion(s)}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-800 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
            >
              <span className="block truncate">{s.address}</span>
              <span className="block text-xs text-gray-400 mt-0.5">
                {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
              </span>
            </button>
          ))}
        </div>
      )}

      {showDropdown && suggestions.length === 0 && !loading && (
        <div className="absolute z-[9999] top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-theme-lg px-4 py-3 text-sm text-gray-400">
          No results found
        </div>
      )}
    </div>
  );
}
