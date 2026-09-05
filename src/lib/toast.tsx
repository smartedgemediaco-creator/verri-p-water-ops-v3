"use client";

import toast from "react-hot-toast";
import { CheckCircle, XCircle, X, NotebookPen, Sparkles } from "lucide-react";

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

function NoteCard({
  t,
  message,
}: {
  t: { id: string; visible: boolean };
  message: string;
}) {
  return (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } flex items-start gap-3 bg-amber-50 dark:bg-gray-800 rounded-xl shadow-theme-lg p-4 min-w-[320px] max-w-[440px] border-l-4 border-l-amber-400`}
    >
      <NotebookPen className="size-5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
          How to do this
        </p>
        <p className="text-sm font-medium text-gray-800 dark:text-white/90 leading-5 whitespace-pre-line">
          {message}
        </p>
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-amber-500 hover:text-amber-700 dark:text-amber-400 transition-colors shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Friendly explainer toast — a note to yourself (or someone else) on what a control does. */
export function showNote(message: string, options?: ToastOptions) {
  toast.custom(
    (t) => <NoteCard t={t} message={message} />,
    { duration: options?.duration ?? 6000 },
  );
}

interface AiToastOptions extends ToastOptions {
  title?: string;
  href?: string;
}

function AiToastCard({
  t,
  title,
  message,
  href,
}: {
  t: { id: string; visible: boolean };
  title?: string;
  message: string;
  href?: string;
}) {
  return (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-theme-lg p-4 min-w-[320px] max-w-[420px] border-l-4 border-l-brand-500`}
    >
      <div className="size-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
        <Sparkles className="size-4 text-brand-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-1">
          {title || "Verri Assistant"}
        </p>
        <p className="text-sm font-medium text-gray-800 dark:text-white/90 leading-5 whitespace-pre-line">
          {message}
        </p>
        {href && (
          <div className="mt-2">
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
              ↗ {href.replace("/", "").replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        )}
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/**
 * Subtle AI assistant toast — a friendly, non-intrusive reminder or tip.
 * Used by the AiAssistant provider to nudge users toward features they've not used.
 */
export function showAiToast(message: string, options?: AiToastOptions) {
  toast.custom(
    (t) => (
      <AiToastCard t={t} title={options?.title} message={message} href={options?.href} />
    ),
    { duration: options?.duration ?? 9000 },
  );
}
