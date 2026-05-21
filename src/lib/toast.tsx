"use client";

import toast from "react-hot-toast";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";

interface ToastOptions {
  duration?: number;
}

function ToastCard({
  t,
  message,
  type,
}: {
  t: { id: string; visible: boolean };
  message: string;
  type: ToastType;
}) {
  const isSuccess = type === "success";

  return (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-theme-lg p-4 min-w-[320px] max-w-[420px] border-l-4 ${
        isSuccess ? "border-l-success-500" : "border-l-error-500"
      }`}
    >
      {isSuccess ? (
        <CheckCircle className="size-5 mt-0.5 text-success-500 shrink-0" />
      ) : (
        <XCircle className="size-5 mt-0.5 text-error-500 shrink-0" />
      )}
      <p className="flex-1 text-sm font-medium text-gray-800 dark:text-white/90 leading-5">
        {message}
      </p>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function showSuccess(message: string, options?: ToastOptions) {
  toast.custom(
    (t) => <ToastCard t={t} message={message} type="success" />,
    { duration: options?.duration ?? 4000 },
  );
}

export function showError(message: string, options?: ToastOptions) {
  toast.custom(
    (t) => <ToastCard t={t} message={message} type="error" />,
    { duration: options?.duration ?? 5000 },
  );
}
