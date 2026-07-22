"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { PlusIcon, TrashBinIcon, PencilIcon, GroupIcon, CloseIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";

interface CommissionedStaff {
  _id: string;
  name: string;
  phone: string;
  email: string;
  dealPrice: number;
  isActive: boolean;
  notes: string;
  totalOwed: number;
  totalLoaded: number;
  totalReturned: number;
  totalPaid: number;
  totalExpected: number;
  totalRecords: number;
}

export default function CommissionedStaffsPage() {
  const [staff, setStaff] = useState<CommissionedStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<CommissionedStaff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dealPrice, setDealPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  const fetchStaff = () => {
    setLoading(true);
    fetch("/api/commissioned-staffs")
      .then((r) => r.json())
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setDealPrice("");
    setIsActive(true);
    setNotes("");
  };

  const openCreate = () => {
    setEditTarget(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (s: CommissionedStaff) => {
    setEditTarget(s);
    setName(s.name);
    setPhone(s.phone);
    setEmail(s.email);
    setDealPrice(String(s.dealPrice));
    setIsActive(s.isActive);
    setNotes(s.notes);
    setShowModal(true);
  };

  const submitForm = async () => {
    if (!name.trim()) { showError("Name is required"); return; }
    if (!dealPrice) { showError("Deal price is required"); return; }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        dealPrice: Number(dealPrice),
        isActive,
        notes: notes.trim(),
      };
      const url = editTarget ? `/api/commissioned-staffs/${editTarget._id}` : "/api/commissioned-staffs";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess(editTarget ? "Staff updated" : "Staff created");
      setShowModal(false);
      fetchStaff();
    } catch {
      showError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteStaff = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/commissioned-staffs/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) { showError("Failed to delete"); return; }
      showSuccess("Staff deleted");
      setDeleteTarget(null);
      fetchStaff();
    } catch {
      showError("Failed to delete");
    }
  };

  const filtered = staff.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Commissioned Staffs" />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchStaff}>Refresh</Button>
          <Button size="sm" startIcon={<PlusIcon />} onClick={openCreate}>Add Staff</Button>
        </div>
      </div>

      <div className="mb-4">
        <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Name</TableCell>
                <TableCell isHeader>Phone</TableCell>
                <TableCell isHeader>Deal Price</TableCell>
                <TableCell isHeader>Total Loaded</TableCell>
                <TableCell isHeader>Total Paid</TableCell>
                <TableCell isHeader>Total Owed</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <GroupIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    <p>No commissioned staff found</p>
                  </div>
                </TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>
                    <Link href={`/commissioned-staffs/${s._id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>{s.phone || "—"}</TableCell>
                  <TableCell>₦{(s.dealPrice ?? 0).toLocaleString()}/bag</TableCell>
                  <TableCell>{(s.totalLoaded ?? 0).toLocaleString()} bags</TableCell>
                  <TableCell>₦{(s.totalPaid ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={(s.totalOwed ?? 0) > 0 ? "text-red-600 dark:text-red-400 font-semibold" : "text-green-600 dark:text-green-400"}>
                      ₦{(s.totalOwed ?? 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-500/15 dark:text-gray-400"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <PencilIcon className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => setDeleteTarget(s._id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-500/15 rounded-lg transition-colors">
                        <TrashBinIcon className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editTarget ? "Edit Commissioned Staff" : "Add Commissioned Staff"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <CloseIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tunde" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tunde@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deal Price (₦/bag) *</label>
                  <Input type="number" value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} placeholder="300" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea value={notes} onChange={(val) => setNotes(val)} placeholder="Any notes about this dealer..." rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button size="sm" onClick={submitForm} disabled={submitting}>
                {submitting ? "Saving..." : editTarget ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteStaff}
        title="Delete Commissioned Staff"
        message="This will permanently delete this staff member and ALL their records. Are you sure?"
      />
    </div>
  );
}
