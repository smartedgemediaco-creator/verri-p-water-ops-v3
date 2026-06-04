"use client";
import { useState } from "react";
import { EyeIcon, EyeCloseIcon } from "@/icons";

interface Props {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  className = "",
  disabled,
  required,
  minLength,
  autoFocus,
}: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        minLength={minLength}
        autoFocus={autoFocus}
        className={`h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${className}`}
      />
      <span
        onClick={() => setShow(!show)}
        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
      >
        {show ? (
          <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
        ) : (
          <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
        )}
      </span>
    </div>
  );
}
