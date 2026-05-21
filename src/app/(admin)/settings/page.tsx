"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { showSuccess, showError } from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<"idle" | "confirm" | "processing">("idle");
  const [submitting, setSubmitting] = useState(false);

  const handleReset = async () => {
    if (confirmText !== "RESET") {
      showError("Type RESET to confirm");
      return;
    }
    if (!password || !confirmPassword) {
      showError("Both password fields are required");
      return;
    }
    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setStep("processing");

    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Reset failed");
        setStep("confirm");
        return;
      }

      showSuccess("Business data cleared! Redirecting to onboarding...");
      setPassword("");
      setConfirmPassword("");
      setConfirmText("");
      setStep("idle");

      localStorage.removeItem("water-ops-onboarding-done");
      setTimeout(() => router.push("/onboarding"), 1500);
    } catch {
      showError("Network error");
      setStep("confirm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <PageBreadcrumb pageTitle="Settings" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Account</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Manage your account credentials and security settings.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <Input type="email" value={user?.email ?? ""} disabled className="max-w-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <Input value={user?.role === "admin" ? "Administrator" : user?.role === "factory-manager" ? "Factory Manager" : user?.role === "depot-manager" ? "Depot Manager" : user?.role === "driver" ? "Driver" : ""} disabled className="max-w-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-500/20 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-lg">⚠️</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Reset Business Data</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              This permanently deletes all factories, depots, trucks, products, inventory, sales, costs, transfers, production records, activity logs, POS data, and wastage records.
            </p>
          </div>
        </div>

        {step === "idle" ? (
          <div className="border-t border-red-100 dark:border-red-500/10 pt-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">
              Your admin account will be preserved. All other data will be lost.
            </p>
            <Button
              variant="outline"
              onClick={() => setStep("confirm")}
              className="!border-red-300 !text-red-600 hover:!bg-red-50 dark:!border-red-500/30 dark:!text-red-400 dark:hover:!bg-red-500/10"
            >
              Reset Business
            </Button>
          </div>
        ) : (
          <div className="border-t border-red-100 dark:border-red-500/10 pt-4 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <span className="text-red-600 dark:text-red-400 text-sm">⚠</span>
              <p className="text-sm text-red-700 dark:text-red-300">
                This action cannot be undone. All business data will be permanently deleted.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type <span className="font-bold text-red-600 dark:text-red-400">RESET</span> to confirm
              </label>
              <Input
                placeholder='Type "RESET"'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter password</label>
                <Input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm password</label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setStep("idle"); setPassword(""); setConfirmPassword(""); setConfirmText(""); }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={submitting || confirmText !== "RESET" || !password || !confirmPassword}
                className="!border-red-300 !text-red-600 hover:!bg-red-50 dark:!border-red-500/30 dark:!text-red-400 dark:hover:!bg-red-500/10"
              >
                {submitting ? "Resetting..." : "Delete Everything & Reset"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
