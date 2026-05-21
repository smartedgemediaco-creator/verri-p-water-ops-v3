"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import Button from "./button/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "warning" | "danger" | "password";
  loading?: boolean;
  successMessage?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "warning",
  loading: externalLoading,
  successMessage = "Action completed successfully!",
}: ConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const loading = externalLoading ?? internalLoading;
  const requirePassword = variant === "password";

  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
      setPassword("");
      setPasswordError("");
      setInternalLoading(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (requirePassword) {
      if (!password.trim()) {
        setPasswordError("Password is required");
        return;
      }
      setInternalLoading(true);
      setPasswordError("");
      try {
        const res = await fetch("/api/auth/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const data = await res.json();
          setPasswordError(data.error || "Incorrect password");
          setInternalLoading(false);
          return;
        }
      } catch {
        setPasswordError("Network error verifying password");
        setInternalLoading(false);
        return;
      }
    }
    setInternalLoading(true);
    try {
      await onConfirm();
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setPassword("");
        setPasswordError("");
        onClose();
      }, 1500);
    } catch {
      setInternalLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setPassword("");
    setPasswordError("");
    onClose();
  };

  if (!isOpen) return null;
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-theme-xl w-full max-w-xs mx-4 p-8 flex flex-col items-center gap-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="animate-[scaleIn_0.3s_ease-out]">
            <circle
              cx="32" cy="32" r="30"
              stroke="#22c55e" strokeWidth="4"
              fill="none"
              strokeDasharray="188.5"
              strokeDashoffset="188.5"
              className="animate-[circleDraw_0.6s_ease-out_forwards]"
            />
            <path
              d="M20 32l8 8 16-16"
              stroke="#22c55e" strokeWidth="4"
              strokeLinecap="round" strokeLinejoin="round"
              fill="none"
              strokeDasharray="34"
              strokeDashoffset="34"
              className="animate-[checkDraw_0.4s_0.5s_ease-out_forwards]"
            />
          </svg>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
            {successMessage}
          </p>
        </div>
        <style>{`
          @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes circleDraw { to { stroke-dashoffset: 0; } }
          @keyframes checkDraw { to { stroke-dashoffset: 0; } }
        `}</style>
      </div>
    );
  }

  const borderColor =
    variant === "danger"
      ? "border-red-200 dark:border-red-500/20"
      : variant === "password"
      ? "border-purple-200 dark:border-purple-500/20"
      : "border-amber-200 dark:border-amber-500/20";

  const headerBg =
    variant === "danger"
      ? "bg-red-50 dark:bg-red-500/5"
      : variant === "password"
      ? "bg-purple-50 dark:bg-purple-500/5"
      : "bg-amber-50 dark:bg-amber-500/5";

  const headerIcon =
    variant === "danger" ? "text-red-500" : variant === "password" ? "text-purple-500" : "text-amber-500";

  const buttonVariant: "primary" | "outline" = "primary";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div
        className={`bg-white dark:bg-gray-900 rounded-xl border ${borderColor} shadow-theme-xl w-full max-w-sm mx-4 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-5 py-4 ${headerBg}`}>
          <div className="flex items-center gap-3">
            <span className={headerIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {variant === "danger" ? (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" />
                ) : (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                )}
              </svg>
            </span>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h3>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">{message}</div>

          {requirePassword && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Enter your password to confirm
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                placeholder="Your password"
                autoFocus
                className="w-full rounded-lg border border-gray-300 bg-transparent px-3.5 py-2 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 placeholder-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 outline-none"
              />
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-500">{passwordError}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={buttonVariant} size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
