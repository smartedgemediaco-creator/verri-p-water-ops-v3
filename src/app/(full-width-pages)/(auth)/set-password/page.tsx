"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeftIcon } from "@/icons";
import Button from "@/components/ui/button/Button";
import { showSuccess, showError } from "@/lib/toast";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      showSuccess("Password set! You can now log in.");
      setDone(true);
      setTimeout(() => router.push("/signin"), 2000);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Back to sign in
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-brand-500">
                <path d="M12 2C8 8 5 12 5 15.5a7 7 0 0014 0C19 12 16 8 12 2z" fill="currentColor" opacity="0.3" />
                <path d="M10 15.5a3 3 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-lg font-bold text-gray-800 dark:text-white">Verri P Water Inc</span>
            </div>
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Set Your Password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose a password to activate your account</p>
          </div>

          {done ? (
            <div className="text-center py-6">
              <span className="text-4xl block mb-3">✅</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">Redirecting to sign in...</p>
            </div>
          ) : !token ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-500 mb-4">Invalid or missing invitation link.</p>
              <Link href="/signin" className="text-sm text-brand-600 hover:underline">Go to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white/90 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                    placeholder="Repeat your password"
                    required
                  />
                </div>
                <Button className="w-full" size="sm" type="submit" disabled={submitting}>
                  {submitting ? "Setting password..." : "Set Password & Activate"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
