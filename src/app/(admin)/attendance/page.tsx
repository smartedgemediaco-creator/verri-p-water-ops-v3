"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { showSuccess, showError } from "@/lib/toast";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface LocationOption {
  type: string;
  id: string;
  name: string;
}

interface StaffRow {
  staffId: string;
  name: string;
  role: string;
  department: string;
  locationLabel?: string;
  attendanceId: string | null;
  status: "present" | "absent" | "late" | "half-day" | "leave";
  notes: string;
}

interface MonthSummary {
  staffId: string;
  name: string;
  salary: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  totalRecorded: number;
  workingDays: number;
  attendanceRate: number;
  locationLabel?: string;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
  { value: "late", label: "Late", color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  { value: "half-day", label: "Half-Day", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  { value: "leave", label: "Leave", color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" },
] as const;

const ALL_LOCATIONS: LocationOption = { type: "all", id: "", name: "All Locations" };

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption>(ALL_LOCATIONS);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [summaryMonth, setSummaryMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<MonthSummary[]>([]);
  const [summaryWorkingDays, setSummaryWorkingDays] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const { ref, loading: pdfLoading, download } = usePdfDownload("attendance-report");

  useEffect(() => {
    Promise.all([
      fetch("/api/factories").then((r) => r.json()),
      fetch("/api/depots").then((r) => r.json()),
    ]).then(([factories, depots]) => {
      const factoryLocs: LocationOption[] = Array.isArray(factories)
        ? factories.map((f: { _id: string; name: string }) => ({ type: "factory", id: f._id, name: f.name }))
        : [];
      const depotLocs: LocationOption[] = Array.isArray(depots)
        ? depots.map((d: { _id: string; name: string }) => ({ type: "depot", id: d._id, name: d.name }))
        : [];
      setLocations([...factoryLocs, ...depotLocs]);
    }).catch(() => setLocations([]));
  }, []);

  const buildLocationParams = useCallback((loc: LocationOption) => {
    if (loc.type === "all") return "";
    return `&locationType=${loc.type}&locationId=${loc.id}`;
  }, []);

  const fetchAttendance = useCallback(() => {
    setLoading(true);
    const params = buildLocationParams(selectedLocation);
    fetch(`/api/attendance?date=${selectedDate}${params}`)
      .then((r) => r.json())
      .then((data) => { setStaff(Array.isArray(data) ? data : []); })
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, [selectedDate, selectedLocation, buildLocationParams]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const handleStatusChange = (staffId: string, status: StaffRow["status"]) => {
    setStaff((prev) => prev.map((s) => s.staffId === staffId ? { ...s, status } : s));
  };

  const handleNotesChange = (staffId: string, notes: string) => {
    setStaff((prev) => prev.map((s) => s.staffId === staffId ? { ...s, notes } : s));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = staff.map((s) => ({ staffId: s.staffId, status: s.status, notes: s.notes }));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, records }),
      });
      if (!res.ok) { showError("Failed to save"); return; }
      showSuccess(`Attendance saved for ${staff.length} staff`);
      fetchAttendance();
    } catch { showError("Network error"); } finally { setSaving(false); }
  };

  const markAll = (status: StaffRow["status"]) => {
    setStaff((prev) => prev.map((s) => ({ ...s, status })));
  };

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const params = buildLocationParams(selectedLocation);
      const res = await fetch(`/api/attendance/summary?month=${summaryMonth}${params}`);
      const data = await res.json();
      setSummary(data.summary || []);
      setSummaryWorkingDays(data.workingDays || 0);
      setShowSummary(true);
    } catch { showError("Failed to load summary"); } finally { setLoadingSummary(false); }
  };

  const statusCounts = staff.reduce(
    (acc, s) => { acc[s.status]++; return acc; },
    { present: 0, absent: 0, late: 0, "half-day": 0, leave: 0 }
  );

  const showLocationColumn = selectedLocation.type === "all";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Attendance" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)}>
            {showSummary ? "Hide Summary" : "Monthly Summary"}
          </Button>
          <Button size="sm" disabled={saving || staff.length === 0} onClick={saveAttendance}>
            {saving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Location</label>
          <select value={`${selectedLocation.type}:${selectedLocation.id}`}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "all:") { setSelectedLocation(ALL_LOCATIONS); return; }
              const [type, id] = val.split(":");
              const loc = locations.find((l) => l.type === type && l.id === id);
              if (loc) setSelectedLocation(loc);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
            <option value="all:">All Locations</option>
            {locations.map((l) => (<option key={`${l.type}:${l.id}`} value={`${l.type}:${l.id}`}>{l.name}</option>))}
          </select>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }}>Prev Day</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }}>Next Day</Button>
        </div>
      </div>

      {/* Printable area */}
      <div ref={ref}>
        {/* Status summary cards */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 mb-6">
          {STATUS_OPTIONS.map((opt) => (
            <div key={opt.value} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-theme-sm text-center">
              <p className="text-2xl font-bold text-gray-800 dark:text-white/90">{statusCounts[opt.value]}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{opt.label}</p>
            </div>
          ))}
        </div>

        {/* Quick mark all */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Mark all:</span>
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => markAll(opt.value)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${opt.color} hover:opacity-80`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Staff roster table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Staff Name</th>
                  {showLocationColumn && (
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Location</th>
                  )}
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Role</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={showLocationColumn ? 6 : 5} className="text-center py-10 text-gray-500">Loading...</td></tr>
                ) : staff.length === 0 ? (
                  <tr><td colSpan={showLocationColumn ? 6 : 5} className="text-center py-10 text-gray-500">No staff found at this location.</td></tr>
                ) : (
                  staff.map((s, i) => (
                    <tr key={s.staffId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-white/90">{s.name}</td>
                      {showLocationColumn && (
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{s.locationLabel || "—"}</td>
                      )}
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 capitalize">{s.role}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {STATUS_OPTIONS.map((opt) => (
                            <button key={opt.value} onClick={() => handleStatusChange(s.staffId, opt.value as StaffRow["status"])}
                              className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
                                s.status === opt.value
                                  ? `${opt.color} font-semibold ring-1 ring-offset-1 ring-gray-200 dark:ring-gray-700`
                                  : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"
                              }`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={s.notes} onChange={(e) => handleNotesChange(s.staffId, e.target.value)}
                          placeholder="Optional note"
                          className="w-40 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90 focus:ring-1 focus:ring-brand-500 outline-none" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Monthly summary modal */}
      {showSummary && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowSummary(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Monthly Attendance Summary</h3>
              <div className="flex items-center gap-2">
                <input type="month" value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                <Button size="sm" onClick={fetchSummary} disabled={loadingSummary}>
                  {loadingSummary ? "Loading..." : "Load"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Working days in {summaryMonth}: <strong>{summaryWorkingDays}</strong></p>
            {summary.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Staff</th>
                    {selectedLocation.type === "all" && (
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Location</th>
                    )}
                    <th className="px-2 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Present</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Absent</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Late</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Half-Day</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Leave</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.staffId} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-2 font-medium text-gray-800 dark:text-white/90">{s.name}</td>
                      {selectedLocation.type === "all" && (
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">{s.locationLabel || "—"}</td>
                      )}
                      <td className="px-2 py-2 text-center text-emerald-600 dark:text-emerald-400">{s.present}</td>
                      <td className="px-2 py-2 text-center text-red-600 dark:text-red-400">{s.absent}</td>
                      <td className="px-2 py-2 text-center text-amber-600 dark:text-amber-400">{s.late}</td>
                      <td className="px-2 py-2 text-center text-blue-600 dark:text-blue-400">{s.halfDay}</td>
                      <td className="px-2 py-2 text-center text-purple-600 dark:text-purple-400">{s.leave}</td>
                      <td className="px-2 py-2 text-center font-medium text-gray-800 dark:text-white/90">{s.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-6 text-gray-500">No attendance data for this month yet.</p>
            )}
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowSummary(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
