"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PlusIcon, TrashBinIcon, PencilIcon, GroupIcon, CloseIcon, UserIcon, ChevronDownIcon, ChevronUpIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import { usePdfDownload } from "@/hooks/usePdfDownload";


interface StaffMember {
  _id: string;
  name: string;
  phone: string;
  email: string;
  role: "manager" | "supervisor" | "operator" | "driver" | "loader" | "security" | "cleaner" | "other";
  department: "production" | "logistics" | "sales" | "administration" | "maintenance";
  locationType: "factory" | "depot" | "truck";
  locationId: string;
  locationName: string;
  salary: number;
  employmentType: "full-time" | "part-time" | "contract";
  startDate: string;
  isActive: boolean;
  emergencyContact: string;
  notes: string;
  avatar?: string;
  addresses?: { label: string; street: string; city: string; state: string; country: string }[];
  emergencyContacts?: { name: string; phone: string; relationship: string; photo?: string }[];
}

const ROLES = [
  { value: "manager", label: "Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operator", label: "Operator" },
  { value: "driver", label: "Driver" },
  { value: "loader", label: "Loader" },
  { value: "security", label: "Security" },
  { value: "cleaner", label: "Cleaner" },
  { value: "other", label: "Other" },
];

const DEPARTMENTS = [
  { value: "production", label: "Production" },
  { value: "logistics", label: "Logistics" },
  { value: "sales", label: "Sales" },
  { value: "administration", label: "Administration" },
  { value: "maintenance", label: "Maintenance" },
];

const LOCATION_TYPES = [
  { value: "factory", label: "Factory" },
  { value: "depot", label: "Depot" },
  { value: "truck", label: "Truck" },
];

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full Time" },
  { value: "part-time", label: "Part Time" },
  { value: "contract", label: "Contract" },
];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterLocationType, setFilterLocationType] = useState("");
  const [filterLocationId, setFilterLocationId] = useState("");
  const [filterLocations, setFilterLocations] = useState<{ value: string; label: string }[]>([]);
  const [formLocations, setFormLocations] = useState<{ value: string; label: string }[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [department, setDepartment] = useState("production");
  const [locationType, setLocationType] = useState("");
  const [locationId, setLocationId] = useState("");
  const [salary, setSalary] = useState(0);
  const [employmentType, setEmploymentType] = useState("full-time");
  const [startDate, setStartDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [emergencyContact, setEmergencyContact] = useState("");
  const [notes, setNotes] = useState("");
  const [formAddresses, setFormAddresses] = useState<{ label: string; street: string; city: string; state: string; country: string }[]>([]);
  const [formContacts, setFormContacts] = useState<{ name: string; phone: string; relationship: string; photo?: string }[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingContactIdx, setUploadingContactIdx] = useState<number | null>(null);
  const { ref, loading: pdfLoading, download } = usePdfDownload("staff-list");

  const fetchStaff = () => {
    setLoading(true);
    fetch("/api/staff")
      .then((r) => r.json())
      .then((data) => setStaff(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const labelFor = (type: string, d: { _id: string; name?: string; plateNumber?: string }): string => {
    if (type === "truck") return d.plateNumber ?? "Truck";
    return d.name ?? "Unknown";
  };

  useEffect(() => {
    if (!filterLocationType) { setFilterLocations([]); setFilterLocationId(""); return; }
    const endpoint = filterLocationType === "factory" ? "/api/factories" : `/api/${filterLocationType}s`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: { _id: string; name?: string; plateNumber?: string }[]) => {
        if (Array.isArray(data)) {
          setFilterLocations(data.map((d) => ({ value: d._id, label: labelFor(filterLocationType, d) })));
        }
      });
    setFilterLocationId("");
  }, [filterLocationType]);

  useEffect(() => {
    if (!locationType) { setFormLocations([]); return; }
    const endpoint = locationType === "factory" ? "/api/factories" : `/api/${locationType}s`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((data: { _id: string; name?: string; plateNumber?: string }[]) => {
        if (Array.isArray(data)) {
          setFormLocations(data.map((d) => ({ value: d._id, label: labelFor(locationType, d) })));
        }
      });
    setLocationId("");
  }, [locationType]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setRole("operator");
    setDepartment("production");
    setLocationType("");
    setLocationId("");
    setSalary(0);
    setEmploymentType("full-time");
    setStartDate("");
    setIsActive(true);
    setEmergencyContact("");
    setNotes("");
    setFormAddresses([]);
    setFormContacts([]);
  };

  const openEdit = (s: StaffMember) => {
    setEditTarget(s);
    setName(s.name);
    setPhone(s.phone);
    setEmail(s.email);
    setRole(s.role);
    setDepartment(s.department);
    setLocationType(s.locationType);
    setLocationId(s.locationId);
    setSalary(s.salary);
    setEmploymentType(s.employmentType);
    setStartDate(s.startDate ? new Date(s.startDate).toISOString().split("T")[0] : "");
    setIsActive(s.isActive);
    setEmergencyContact(s.emergencyContact);
    setNotes(s.notes);
    setFormAddresses(s.addresses?.length ? [...s.addresses] : []);
    setFormContacts(s.emergencyContacts?.length ? [...s.emergencyContacts] : []);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditTarget(null);
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showError("Name is required"); return; }
    setSubmitting(true);
    try {
      const url = editTarget ? `/api/staff/${editTarget._id}` : "/api/staff";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), phone, email, role, department, locationType, locationId, salary, employmentType,
          startDate: startDate ? new Date(startDate).toISOString() : undefined, isActive, emergencyContact, notes,
          addresses: formAddresses, emergencyContacts: formContacts,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Operation failed");
        return;
      }
      showSuccess(editTarget ? "Staff updated" : "Staff added");
      setShowModal(false);
      setEditTarget(null);
      resetForm();
      fetchStaff();
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/staff/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    showSuccess("Staff deleted");
    setDeleteTarget(null);
    fetchStaff();
  };

  const handleAvatarUpload = async (staffId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `staff/${staffId}`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { showError("Upload failed"); return; }
      const { url } = await res.json();
      await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      showSuccess("Avatar updated");
      fetchStaff();
    } catch { showError("Upload failed"); }
    finally { setUploadingAvatar(false); e.target.value = ""; }
  };

  const handleContactPhotoUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingContactIdx(idx);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "staff/contacts");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { showError("Upload failed"); return; }
      const { url } = await res.json();
      const updated = [...formContacts];
      updated[idx] = { ...updated[idx], photo: url };
      setFormContacts(updated);
      showSuccess("Photo uploaded");
    } catch { showError("Upload failed"); }
    finally { setUploadingContactIdx(null); e.target.value = ""; }
  };

  const filtered = staff.filter((s) => {
    if (filterLocationType && s.locationType !== filterLocationType) return false;
    if (filterLocationId && s.locationId !== filterLocationId) return false;
    return true;
  });

  const departmentCounts = staff.reduce<Record<string, number>>((acc, s) => {
    acc[s.department] = (acc[s.department] ?? 0) + 1;
    return acc;
  }, {});

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      manager: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
      supervisor: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      operator: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
      driver: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      loader: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
      security: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      cleaner: "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
    };
    return `inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${colors[role] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Staff" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={fetchStaff}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
            Add Staff
          </Button>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/staff" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <UserIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{staff.length}</h4>
        </Link>
        <Link href="/staff" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-3">
            <GroupIcon className="text-emerald-600 size-5 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Departments</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{Object.keys(departmentCounts).length}</h4>
        </Link>
        <Link href="/staff" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <UserIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{staff.filter((s) => s.isActive).length}</h4>
        </Link>
      </div>

      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="w-48">
          <Select options={LOCATION_TYPES} placeholder="Filter by location" value={filterLocationType} onChange={(v) => setFilterLocationType(v)} />
        </div>
        {filterLocationType && (
          <div className="w-48">
            <Select options={filterLocations} placeholder={`Select ${filterLocationType}`} value={filterLocationId} onChange={setFilterLocationId} />
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowModal(false); setEditTarget(null); resetForm(); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                {editTarget ? "Edit Staff Member" : "Add Staff Member"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditTarget(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <Select options={ROLES} value={role} onChange={setRole} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <Select options={DEPARTMENTS} value={department} onChange={setDepartment} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employment Type</label>
                  <Select options={EMPLOYMENT_TYPES} value={employmentType} onChange={setEmploymentType} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location Type</label>
                  <Select options={LOCATION_TYPES} value={locationType} placeholder="Select type" onChange={(v) => { setLocationType(v); setLocationId(""); }} />
                </div>
                {locationType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                    <Select options={formLocations} placeholder={`Select ${locationType}`} value={locationId} onChange={setLocationId} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary (₦)</label>
                  <Input type="number" placeholder="0" value={salary} onChange={(e) => setSalary(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emergency Contact</label>
                <Input placeholder="Emergency contact info" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
              </div>
              {editTarget && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="staff-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <label htmlFor="staff-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={notes} onChange={setNotes} rows={3} />
              </div>

              {/* Addresses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Addresses</label>
                  <button type="button" onClick={() => setFormAddresses([...formAddresses, { label: "Home", street: "", city: "", state: "", country: "Nigeria" }])}
                    className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700">+ Add Address</button>
                </div>
                {formAddresses.map((addr, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-2 space-y-2">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Label (e.g. Home, Office)" value={addr.label} onChange={e => { const u = [...formAddresses]; u[i] = { ...u[i], label: e.target.value }; setFormAddresses(u); }}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 outline-none" />
                      <button type="button" onClick={() => setFormAddresses(formAddresses.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-600">Remove</button>
                    </div>
                    <input type="text" placeholder="Street address" value={addr.street} onChange={e => { const u = [...formAddresses]; u[i] = { ...u[i], street: e.target.value }; setFormAddresses(u); }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 outline-none" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" placeholder="City" value={addr.city} onChange={e => { const u = [...formAddresses]; u[i] = { ...u[i], city: e.target.value }; setFormAddresses(u); }}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 outline-none" />
                      <input type="text" placeholder="State" value={addr.state} onChange={e => { const u = [...formAddresses]; u[i] = { ...u[i], state: e.target.value }; setFormAddresses(u); }}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 outline-none" />
                      <input type="text" placeholder="Country" value={addr.country} onChange={e => { const u = [...formAddresses]; u[i] = { ...u[i], country: e.target.value }; setFormAddresses(u); }}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 outline-none" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Emergency Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contacts</label>
                  <button type="button" onClick={() => setFormContacts([...formContacts, { name: "", phone: "", relationship: "" }])}
                    className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700">+ Add Contact</button>
                </div>
                {formContacts.map((ec, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-2">
                    <div className="flex items-start gap-3">
                      <label className="relative group cursor-pointer flex-shrink-0">
                        {ec.photo ? (
                          <img src={ec.photo} alt={ec.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-red-500" />
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleContactPhotoUpload(i, e)} className="hidden" />
                        <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-[8px] font-medium">{uploadingContactIdx === i ? "..." : "Photo"}</span>
                        </span>
                      </label>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input type="text" placeholder="Name *" value={ec.name} onChange={e => { const u = [...formContacts]; u[i] = { ...u[i], name: e.target.value }; setFormContacts(u); }}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 outline-none" />
                          <button type="button" onClick={() => setFormContacts(formContacts.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-600">Remove</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Phone" value={ec.phone} onChange={e => { const u = [...formContacts]; u[i] = { ...u[i], phone: e.target.value }; setFormContacts(u); }}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 outline-none" />
                          <input type="text" placeholder="Relationship" value={ec.relationship} onChange={e => { const u = [...formContacts]; u[i] = { ...u[i], relationship: e.target.value }; setFormContacts(u); }}
                            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowModal(false); setEditTarget(null); resetForm(); }} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update Staff" : "Add Staff"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                <span className="sr-only">Avatar</span>
              </TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Role</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Department</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Salary</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Employment Type</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>No staff found. Click &quot;Add Staff&quot; to create one.</TableCell>
              </TableRow>
            ) : (
              filtered.flatMap((s) => {
                const mainRow = (
                  <TableRow key={s._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <TableCell className="py-3 w-12">
                      <label className="relative group cursor-pointer">
                        {s.avatar ? (
                          <img src={s.avatar} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
                            <UserIcon className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(s._id, e)} className="hidden" />
                        <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-[7px] font-medium">{uploadingAvatar ? "..." : "📷"}</span>
                        </span>
                      </label>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      <button onClick={() => setExpandedId(expandedId === s._id ? null : s._id)} className="inline-flex items-center gap-1.5 text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                        {expandedId === s._id ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                        {s.name}
                      </button>
                    </TableCell>
                    <TableCell className="py-3"><span className={roleBadge(s.role)}>{s.role}</span></TableCell>
                    <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{s.department}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{s.locationName ? `${s.locationType === "truck" ? "🚛" : s.locationType === "factory" ? "🏭" : "🏬"} ${s.locationName}` : "—"}</TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">₦{(s.salary ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="py-3 text-theme-sm capitalize text-gray-500 dark:text-gray-400">{s.employmentType}</TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${s.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(s)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                          <PencilIcon className="w-3.5 h-3.5 mr-1" /> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(s._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                          <TrashBinIcon className="w-3.5 h-3.5 mr-1" /> Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );

                if (expandedId !== s._id) return [mainRow];

                return [mainRow, (
                  <TableRow key={`${s._id}-detail`} className="bg-gray-50/50 dark:bg-gray-800/20">
                    <TableCell colSpan={9} className="py-4 px-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Phone</span>
                          <span className="text-gray-800 dark:text-white/90">{s.phone || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email</span>
                          <span className="text-gray-800 dark:text-white/90">{s.email || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Emergency Contact</span>
                          <span className="text-gray-800 dark:text-white/90">{s.emergencyContact || "—"}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Start Date</span>
                          <span className="text-gray-800 dark:text-white/90">{s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"}</span>
                        </div>
                        <div className="col-span-full sm:col-span-1">
                          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Location</span>
                          <span className="text-gray-800 dark:text-white/90">{s.locationName ? `${s.locationType} — ${s.locationName}` : "—"}</span>
                        </div>
                        {s.notes && (
                          <div className="col-span-full">
                            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notes</span>
                            <span className="text-gray-800 dark:text-white/90">{s.notes}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )];
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Staff Member"
        message="This will permanently delete this staff member and all associated data. This action cannot be undone."
        confirmLabel="Delete Staff"
        variant="danger"
      />
    </div>
  );
}
