"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { UserIcon, DollarLineIcon, PencilIcon, CalenderIcon, ListIcon, BoltIcon } from "@/icons";
import { FactoryIcon, DepotIcon } from "@/components/icons/EntityIcons";
import { LightbulbIcon, CheckCircleIcon, TrendingUpIcon, UserPlusIcon } from "lucide-react";

interface StaffMember {
  _id: string; name: string; phone: string; email: string;
  role: string; department: string;
  locationType: "factory" | "depot"; locationId: string;
  salary: number; employmentType: string;
  startDate: string; isActive: boolean;
  emergencyContact: string; notes: string; createdAt: string;
}

interface Location { _id: string; name?: string; location?: string; }
interface Insights {
  salary: number; department: string; tenureMonths: number;
  attendanceCount: number; approvedLeaveCount: number; hasUserAccount: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  supervisor: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  operator: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  driver: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  loader: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  security: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  cleaner: "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
};

const EMPLOYMENT_COLORS: Record<string, string> = {
  "full-time": "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  "part-time": "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  contract: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessRole, setAccessRole] = useState("admin");
  const [accessFactoryId, setAccessFactoryId] = useState("");
  const [accessDepotId, setAccessDepotId] = useState("");
  const [accessTruckId, setAccessTruckId] = useState("");
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  const [factoriesList, setFactoriesList] = useState<{ value: string; label: string }[]>([]);
  const [depotsList, setDepotsList] = useState<{ value: string; label: string }[]>([]);
  const [trucksList, setTrucksList] = useState<{ value: string; label: string }[]>([]);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", role: "operator", department: "production",
    salary: 0, employmentType: "full-time", isActive: true, emergencyContact: "", notes: "",
  });

  const fetchAll = async () => {
    try {
      const res = await fetch(`/api/staff/${id}`);
      const data = await res.json();
      setStaff(data);
      if (data?.locationType && data?.locationId) {
        const locRes = await fetch(`/api/${data.locationType === "factory" ? "factories" : `${data.locationType}s`}/${data.locationId}`);
        if (locRes.ok) {
          const locData = await locRes.json();
          setLocation(locData);
        }
      }
      const insRes = await fetch(`/api/staff/${id}/insights`);
      if (insRes.ok) setInsights(await insRes.json());
    } catch (e: unknown) { console.error("Failed to load staff:", e); } finally { setLoading(false); }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
    fetch("/api/factories").then(r => { if (!r.ok) throw new Error(`factories ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setFactoriesList((data as { _id: string; name: string }[]).map(f => ({ value: f._id, label: f.name }))); }).catch((e) => console.error("Failed to load factories:", e));
    fetch("/api/depots").then(r => { if (!r.ok) throw new Error(`depots ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setDepotsList((data as { _id: string; name: string }[]).map(d => ({ value: d._id, label: d.name }))); }).catch((e) => console.error("Failed to load depots:", e));
    fetch("/api/trucks").then(r => { if (!r.ok) throw new Error(`trucks ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setTrucksList((data as { _id: string; plateNumber: string }[]).map(t => ({ value: t._id, label: t.plateNumber }))); }).catch((e) => console.error("Failed to load trucks:", e));
  }, [id]);

  const openEdit = () => {
    if (!staff) return;
    setForm({
      name: staff.name, phone: staff.phone ?? "", email: staff.email ?? "",
      role: staff.role ?? "operator", department: staff.department ?? "production",
      salary: staff.salary, employmentType: staff.employmentType,
      isActive: staff.isActive, emergencyContact: staff.emergencyContact ?? "",
      notes: staff.notes ?? "",
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { showError("Failed to update staff"); return; }
      showSuccess("Staff updated");
      setShowEditModal(false);
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  const openAccessForm = () => {
    setAccessEmail(staff?.email ?? "");
    setAccessRole("factory-manager");
    setShowAccessForm(true);
    if (factoriesList.length === 0) {
      fetch("/api/factories").then(r => { if (!r.ok) throw new Error(`factories ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setFactoriesList((data as { _id: string; name: string }[]).map(f => ({ value: f._id, label: f.name }))); }).catch((e) => console.error("Failed to load factories:", e));
    }
    if (depotsList.length === 0) {
      fetch("/api/depots").then(r => { if (!r.ok) throw new Error(`depots ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setDepotsList((data as { _id: string; name: string }[]).map(d => ({ value: d._id, label: d.name }))); }).catch((e) => console.error("Failed to load depots:", e));
    }
    if (trucksList.length === 0) {
      fetch("/api/trucks").then(r => { if (!r.ok) throw new Error(`trucks ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setTrucksList((data as { _id: string; plateNumber: string }[]).map(t => ({ value: t._id, label: t.plateNumber }))); }).catch((e) => console.error("Failed to load trucks:", e));
    }
  };

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessEmail) { showError("Email is required"); return; }
    setAccessSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: staff!.name, email: accessEmail, password: "temporary",
        role: accessRole, staffId: staff!._id,
      };
      if (accessRole === "factory-manager") body.factoryId = accessFactoryId;
      if (accessRole === "depot-manager") body.depotId = accessDepotId;
      if (accessRole === "driver") body.truckId = accessTruckId;
      const res = await fetch("/api/auth/invite", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { showError(data.error || "Failed"); return; }
      if (data.emailSent === false) {
        showSuccess("User created but email failed — check SMTP or resend later");
      } else {
        showSuccess("Invitation sent!");
      }
      setShowAccessForm(false);
      fetchAll();
    } catch { showError("Network error"); }
    finally { setAccessSubmitting(false); }
  };

  if (loading || !staff) return (
    <div>
      <PageBreadcrumb pageTitle="Staff" />
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading staff details...</div>
    </div>
  );

  const locName = location?.name ?? location?.location ?? staff.locationId?.slice(-6) ?? "—";
  const startDate = staff.startDate ? new Date(staff.startDate) : null;
  const tenure = startDate ? Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0; // eslint-disable-line react-hooks/purity

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={`Staff: ${staff.name}`} />
        <div className="flex gap-2">
          {insights?.hasUserAccount === false && user?.role === "admin" && (
            <Button size="sm" startIcon={<UserPlusIcon className="w-4 h-4" />} onClick={openAccessForm}>
              Create User Access
            </Button>
          )}
          <Button size="sm" startIcon={<PencilIcon />} onClick={openEdit}>Edit Staff</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-500/10">
            <UserIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{staff.name}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${staff.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
                {staff.isActive ? "Active" : "Inactive"}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${ROLE_COLORS[staff.role] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>{staff.role}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{staff.department} · {staff.employmentType}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>Phone: <strong>{staff.phone || "—"}</strong></span>
              <span>Email: <strong>{staff.email || "—"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-2">
            <DollarLineIcon className="text-emerald-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Salary (Monthly)</p>
          <AutoAmount value={`₦${(staff.salary ?? 0).toLocaleString()}`} className="text-gray-800 dark:text-white !text-xs" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-2">
            <CalenderIcon className="text-blue-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Joined</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{startDate ? formatDate(staff.startDate) : "—"}</p>
          {tenure > 0 && <p className="text-xs text-gray-400">{tenure} months ago</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-cyan-100 rounded-lg dark:bg-cyan-500/10 mb-2">
            {staff.locationType === "factory" ? <FactoryIcon className="text-cyan-600 size-4" /> : <DepotIcon className="text-cyan-600 size-4" />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{staff.locationType}</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{locName}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <ListIcon className="text-red-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Emergency Contact</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{staff.emergencyContact || "—"}</p>
        </div>
      </div>

      {insights && (() => {
        const advice: { type: "positive" | "warning" | "insight"; icon: React.ReactNode; title: string; message: string; href: string }[] = [];

        if (insights.tenureMonths > 12) {
          advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "Long-Term Employee", href: "/staff", message: `${insights.tenureMonths} months of service. Valuable experience and institutional knowledge.` });
        } else if (insights.tenureMonths < 3 && insights.tenureMonths > 0) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "New Hire", href: "/staff", message: `Joined ${insights.tenureMonths} month(s) ago. Consider assigning a mentor for onboarding.` });
        }

        if (insights.hasUserAccount) {
          advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "Has System Access", href: "/users", message: "This staff member has a user account and can log into the system." });
        }

        if (insights.approvedLeaveCount > 5) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-amber-500" />, title: "Frequent Leave", href: "/staff", message: `${insights.approvedLeaveCount} approved leave(s) on record. Monitor for patterns.` });
        }

        if (insights.attendanceCount > 0) {
          advice.push({ type: "insight", icon: <TrendingUpIcon className="w-5 h-5 text-blue-500" />, title: "Attendance Record", href: "/staff", message: `${insights.attendanceCount} attendance record(s). ${insights.attendanceCount > 20 ? "Consistent attendance history." : "Attendance tracking in progress."}` });
        }

        return (
          <>
            {advice.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <LightbulbIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Staff Advisory</h3>
                </div>
                <div className="space-y-3">
                  {advice.map((a, i) => (
                    <Link key={i} href={a.href} className={`flex gap-3 p-3 rounded-lg hover:shadow-theme-sm transition-shadow ${a.type === "warning" ? "bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10" : a.type === "positive" ? "bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10" : "bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10"}`}>
                      <div className="flex-shrink-0 mt-0.5">{a.icon}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{a.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{a.message}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BoltIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Staff Stats</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Link href="/costs" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Salary</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{(insights.salary ?? 0).toLocaleString()}/mo</p>
                </Link>
                <Link href="/staff" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Tenure</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{insights.tenureMonths} months</p>
                </Link>
                <Link href="/staff" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Attendance</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{insights.attendanceCount} records</p>
                </Link>
                <Link href="/staff" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Approved Leaves</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{insights.approvedLeaveCount}</p>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">Department</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white capitalize">{insights.department || "—"}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">System Access</p>
                  {insights.hasUserAccount ? (
                    <p className="text-sm font-bold text-success-700 dark:text-success-400">Active</p>
                  ) : user?.role === "admin" ? (
                    <button onClick={openAccessForm} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                      + Create Access
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400">None</p>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {staff.locationType && staff.locationId && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href={`/${staff.locationType === "factory" ? "factories" : staff.locationType === "depot" ? "depots" : "trucks"}/${staff.locationId}`}>
            <Button size="sm" startIcon={staff.locationType === "factory" ? <FactoryIcon className="w-4 h-4" /> : <DepotIcon className="w-4 h-4" />}>
              View {staff.locationType === "factory" ? "Factory" : "Depot"}
            </Button>
          </Link>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Staff Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500 dark:text-gray-400">Name</span><p className="font-medium text-gray-800 dark:text-white/90">{staff.name}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Phone</span><p className="font-medium text-gray-800 dark:text-white/90">{staff.phone || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Email</span><p className="font-medium text-gray-800 dark:text-white/90">{staff.email || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Role</span><p className="font-medium text-gray-800 dark:text-white/90 capitalize">{staff.role}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Department</span><p className="font-medium text-gray-800 dark:text-white/90 capitalize">{staff.department}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Employment Type</span><p className="font-medium text-gray-800 dark:text-white/90 capitalize">{staff.employmentType}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Salary</span><p className="font-medium text-gray-800 dark:text-white/90">₦{(staff.salary ?? 0).toLocaleString()}/mo</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Location</span><p className="font-medium text-gray-800 dark:text-white/90 capitalize">{staff.locationType}: {locName}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Start Date</span><p className="font-medium text-gray-800 dark:text-white/90">{startDate ? formatDate(staff.startDate) : "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Emergency Contact</span><p className="font-medium text-gray-800 dark:text-white/90">{staff.emergencyContact || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Status</span><p className="font-medium"><span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${staff.isActive ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>{staff.isActive ? "Active" : "Inactive"}</span></p></div>
          <div className="col-span-2"><span className="text-gray-500 dark:text-gray-400">Notes</span><p className="font-medium text-gray-800 dark:text-white/90">{staff.notes || "—"}</p></div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-gray-400">
        <button onClick={fetchAll} className="text-blue-500 hover:text-blue-600 underline mr-4">Refresh</button>
        Staff ID: {id.slice(-8)}
      </div>

      {showAccessForm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!accessSubmitting) setShowAccessForm(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Create User Access for {staff.name}</h3>
            <form onSubmit={handleCreateAccess} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                <InputField type="email" placeholder="Email for login" value={accessEmail} onChange={e => setAccessEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Role</label>
                <Select
                  options={[
                    { value: "admin", label: "Admin" },
                    { value: "factory-manager", label: "Factory Manager" },
                    { value: "depot-manager", label: "Depot Manager" },
                    { value: "driver", label: "Driver" },
                  ]}
                  value={accessRole} onChange={v => {
                    setAccessRole(v); setAccessFactoryId(""); setAccessDepotId(""); setAccessTruckId("");
                    if (v === "factory-manager" && factoriesList.length === 0) {
                      fetch("/api/factories").then(r => { if (!r.ok) throw new Error(`factories ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setFactoriesList((data as { _id: string; name: string }[]).map(f => ({ value: f._id, label: f.name }))); }).catch((e) => console.error("Failed to load factories:", e));
                    }
                    if (v === "depot-manager" && depotsList.length === 0) {
                      fetch("/api/depots").then(r => { if (!r.ok) throw new Error(`depots ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setDepotsList((data as { _id: string; name: string }[]).map(d => ({ value: d._id, label: d.name }))); }).catch((e) => console.error("Failed to load depots:", e));
                    }
                    if (v === "driver" && trucksList.length === 0) {
                      fetch("/api/trucks").then(r => { if (!r.ok) throw new Error(`trucks ${r.status}`); return r.json(); }).then((data: unknown) => { if (Array.isArray(data)) setTrucksList((data as { _id: string; plateNumber: string }[]).map(t => ({ value: t._id, label: t.plateNumber }))); }).catch((e) => console.error("Failed to load trucks:", e));
                    }
                  }}
                />
              </div>
              {accessRole === "factory-manager" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Factory</label>
                  <Select options={factoriesList} placeholder="Select factory" value={accessFactoryId} onChange={setAccessFactoryId} />
                </div>
              )}
              {accessRole === "depot-manager" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Depot</label>
                  <Select options={depotsList} placeholder="Select depot" value={accessDepotId} onChange={setAccessDepotId} />
                </div>
              )}
              {accessRole === "driver" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Truck</label>
                  <Select options={trucksList} placeholder="Select truck" value={accessTruckId} onChange={setAccessTruckId} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={accessSubmitting}>
                  {accessSubmitting ? "Creating..." : "Send Invite"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAccessForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowEditModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Edit Staff</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <InputField type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <InputField type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <InputField type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <Select options={[{ value: "manager", label: "Manager" }, { value: "supervisor", label: "Supervisor" }, { value: "operator", label: "Operator" }, { value: "driver", label: "Driver" }, { value: "loader", label: "Loader" }, { value: "security", label: "Security" }, { value: "cleaner", label: "Cleaner" }, { value: "other", label: "Other" }]} value={form.role} onChange={v => setForm({ ...form, role: v })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <Select options={[{ value: "production", label: "Production" }, { value: "logistics", label: "Logistics" }, { value: "sales", label: "Sales" }, { value: "administration", label: "Administration" }, { value: "maintenance", label: "Maintenance" }]} value={form.department} onChange={v => setForm({ ...form, department: v })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employment Type</label>
                  <Select options={[{ value: "full-time", label: "Full Time" }, { value: "part-time", label: "Part Time" }, { value: "contract", label: "Contract" }]} value={form.employmentType} onChange={v => setForm({ ...form, employmentType: v })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary (₦)</label>
                  <InputField type="number" placeholder="0" value={form.salary} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emergency Contact</label>
                  <InputField type="text" placeholder="Emergency contact" value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit-staff-active" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="edit-staff-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} rows={3} /></div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !form.name}>{submitting ? "Saving..." : "Update Staff"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
