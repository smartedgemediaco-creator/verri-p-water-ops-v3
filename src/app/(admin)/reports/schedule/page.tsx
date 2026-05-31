"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import { showSuccess, showError } from "@/lib/toast";
import { TrashBinIcon, PaperPlaneIcon } from "@/icons";

interface Schedule {
  _id: string;
  email: string;
  frequency: "weekly" | "monthly" | "yearly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  month?: number;
  scopeType?: string;
  scopeId?: string;
  isActive: boolean;
  lastSentAt?: string;
  nextScheduledAt?: string;
}

const frequencyOpts = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const dayOpts = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const weekdayOpts = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];
const monthOpts = [
  { value: "1", label: "January" }, { value: "2", label: "February" },
  { value: "3", label: "March" }, { value: "4", label: "April" },
  { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" },
  { value: "9", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

export default function ScheduledReportsPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [month, setMonth] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = () => {
    fetch("/api/reports/schedule")
      .then(r => r.json())
      .then(data => { setSchedules(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSchedules(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !frequency) {
      showError("Email and frequency are required");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { email, frequency };
      if (frequency === "weekly") body.dayOfWeek = Number(dayOfWeek);
      if (frequency === "monthly") body.dayOfMonth = Number(dayOfMonth);
      if (frequency === "yearly") { body.dayOfMonth = Number(dayOfMonth); body.month = Number(month); }

      const res = await fetch("/api/reports/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      showSuccess("Report schedule created");
      setEmail("");
      setFrequency("");
      setDayOfWeek("");
      setDayOfMonth("");
      setMonth("");
      fetchSchedules();
    } catch {
      showError("Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (s: Schedule) => {
    try {
      await fetch("/api/reports/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: s._id, isActive: !s.isActive }),
      });
      fetchSchedules();
    } catch {
      showError("Failed to update");
    }
  };

  const [generating, setGenerating] = useState<string | null>(null);

  const generateNow = async (s: Schedule) => {
    setGenerating(s._id);
    try {
      const now = new Date();
      let startDate: Date;
      let period: string;
      if (s.frequency === "weekly") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        period = "Weekly";
      } else if (s.frequency === "monthly") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        period = "Monthly";
      } else {
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        period = "Yearly";
      }
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: s.email, startDate: startDate.toISOString(), endDate: now.toISOString(), period }),
      });
      if (!res.ok) throw new Error("Failed");
      showSuccess(`Report sent to ${s.email}`);
    } catch {
      showError("Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch("/api/reports/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id }),
      });
      showSuccess("Schedule removed");
      fetchSchedules();
    } catch {
      showError("Failed to remove");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <PageBreadcrumb pageTitle="Scheduled Reports" />

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Add Report Schedule</h3>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              placeholder="admin@verrip.com.ng"
              required
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
              <Select options={frequencyOpts} placeholder="Select" value={frequency} onChange={setFrequency} />
            </div>
            {frequency === "weekly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day of Week</label>
                <Select options={weekdayOpts} placeholder="Select" value={dayOfWeek} onChange={setDayOfWeek} />
              </div>
            )}
            {(frequency === "monthly" || frequency === "yearly") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day of Month</label>
                <Select options={dayOpts} placeholder="Select" value={dayOfMonth} onChange={setDayOfMonth} />
              </div>
            )}
            {frequency === "yearly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                <Select options={monthOpts} placeholder="Select" value={month} onChange={setMonth} />
              </div>
            )}
          </div>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Adding..." : "Add Schedule"}
          </Button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-4">Active Schedules</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-gray-400">No schedules yet.</p>
        ) : (
          <div className="space-y-3">
            {schedules.map(s => (
              <div key={s._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{s.email}</p>
                  <p className="text-xs text-gray-400 capitalize">{s.frequency} report{s.lastSentAt ? ` · Last sent: ${new Date(s.lastSentAt).toLocaleDateString()}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => generateNow(s)}
                    disabled={generating === s._id}
                    className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors disabled:opacity-40"
                    title="Generate and email report now"
                  >
                    <PaperPlaneIcon className="size-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(s)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md ${s.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
                  >
                    {s.isActive ? "Active" : "Paused"}
                  </button>
                  <button onClick={() => remove(s._id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <TrashBinIcon className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
