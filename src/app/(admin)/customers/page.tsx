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
import AutoAmount from "@/components/ui/AutoAmount";
import LocationPicker from "@/components/location/LocationPicker";
import type { LocationValue } from "@/components/location/LocationPicker";
import { PlusIcon, TrashBinIcon, PencilIcon, GroupIcon, CloseIcon, UserIcon, DollarLineIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";
import { usePdfDownload } from "@/hooks/usePdfDownload";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  coordinates: { lat: number; lng: number };
  placeId: string;
  businessName: string;
  customerType: "regular" | "wholesale" | "retailer" | "distributor";
  creditLimit: number;
  outstandingBalance: number;
  isActive: boolean;
  notes: string;
}

const CUSTOMER_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "wholesale", label: "Wholesale" },
  { value: "retailer", label: "Retailer" },
  { value: "distributor", label: "Distributor" },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [locationData, setLocationData] = useState<LocationValue>({ address: "", lat: 0, lng: 0, placeId: "" });
  const [businessName, setBusinessName] = useState("");
  const [customerType, setCustomerType] = useState("regular");
  const [creditLimit, setCreditLimit] = useState(0);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const { ref, loading: pdfLoading, download } = usePdfDownload("customers-list", { title: "Customers Report" });

  const fetchCustomers = () => {
    setLoading(true);
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, []);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setLocationData({ address: "", lat: 0, lng: 0, placeId: "" });
    setBusinessName("");
    setCustomerType("regular");
    setCreditLimit(0);
    setOutstandingBalance(0);
    setIsActive(true);
    setNotes("");
  };

  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setLocationData({ address: c.address, lat: c.coordinates?.lat ?? 0, lng: c.coordinates?.lng ?? 0, placeId: c.placeId ?? "" });
    setBusinessName(c.businessName);
    setCustomerType(c.customerType);
    setCreditLimit(c.creditLimit);
    setOutstandingBalance(c.outstandingBalance);
    setIsActive(c.isActive);
    setNotes(c.notes);
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
      const url = editTarget ? `/api/customers/${editTarget._id}` : "/api/customers";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone, email, address: locationData.address, coordinates: { lat: locationData.lat, lng: locationData.lng }, placeId: locationData.placeId, businessName, customerType, creditLimit, outstandingBalance, isActive, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        showError(err.error || "Operation failed");
        return;
      }
      showSuccess(editTarget ? "Customer updated" : "Customer added");
      setShowModal(false);
      setEditTarget(null);
      resetForm();
      fetchCustomers();
    } catch {
      showError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/customers/${deleteTarget}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    showSuccess("Customer deleted");
    setDeleteTarget(null);
    fetchCustomers();
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = customers.filter((c) => c.isActive).length;
  const totalOutstanding = customers.reduce((s, c) => s + (c.outstandingBalance ?? 0), 0);
  const totalCreditLimit = customers.reduce((s, c) => s + (c.creditLimit ?? 0), 0);

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      regular: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      wholesale: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      retailer: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
      distributor: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    };
    return `inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${colors[type] ?? colors.regular}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Customers" />
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={fetchCustomers}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={download} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
          <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
            Add Customer
          </Button>
        </div>
      </div>

      <div ref={ref} className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6 mb-6">
        <Link href="/customers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-3">
            <UserIcon className="text-blue-600 size-5 dark:text-blue-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{customers.length}</h4>
        </Link>
        <Link href="/customers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/10 mb-3">
            <GroupIcon className="text-green-600 size-5 dark:text-green-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{totalActive}</h4>
        </Link>
        <Link href="/customers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg dark:bg-red-500/10 mb-3">
            <GroupIcon className="text-red-600 size-5 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
          <AutoAmount value={`₦${totalOutstanding.toLocaleString()}`} className="text-blue-600 dark:text-blue-400" />
        </Link>
        <Link href="/customers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-cyan-100 rounded-lg dark:bg-cyan-500/10 mb-3">
            <DollarLineIcon className="text-cyan-600 size-5 dark:text-cyan-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Credit Limit</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">₦{totalCreditLimit.toLocaleString()}</h4>
        </Link>
        <Link href="/customers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg dark:bg-gray-800 mb-3">
            <GroupIcon className="text-gray-600 size-5 dark:text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactive</p>
          <h4 className="mt-1 font-bold text-blue-600 text-title-sm dark:text-blue-400">{customers.length - totalActive}</h4>
        </Link>
      </div>

      <div className="mb-4">
        <Input placeholder="Search customers by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) { setShowModal(false); setEditTarget(null); resetForm(); } }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                {editTarget ? "Edit Customer" : "Add Customer"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditTarget(null); resetForm(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon className="size-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <Input placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                  <Input placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <LocationPicker value={locationData.address} onChange={setLocationData} placeholder="Search for address…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Type</label>
                  <Select options={CUSTOMER_TYPES} value={customerType} onChange={setCustomerType} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credit Limit (₦)</label>
                  <Input type="number" placeholder="0" value={creditLimit} onChange={(e) => setCreditLimit(Number(e.target.value))} />
                </div>
              </div>
              {editTarget && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outstanding Balance (₦)</label>
                    <Input type="number" placeholder="0" value={outstandingBalance} onChange={(e) => setOutstandingBalance(Number(e.target.value))} />
                  </div>
                  <div className="flex items-center gap-2 pt-7">
                    <input type="checkbox" id="customer-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    <label htmlFor="customer-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Optional notes..." value={notes} onChange={setNotes} rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowModal(false); setEditTarget(null); resetForm(); }} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Saving..." : editTarget ? "Update Customer" : "Add Customer"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Phone</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Business Name</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Credit Limit</TableCell>
              <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Balance</TableCell>
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
                <TableCell className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm" colSpan={9}>{search ? "No customers match your search." : 'No customers found. Click "Add Customer" to create one.'}</TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90"><Link href={`/customers/${c._id}`} className="text-theme-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{c.name}</Link></TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{c.phone || <span className="text-gray-400">&mdash;</span>}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{c.email || <span className="text-gray-400">&mdash;</span>}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{c.businessName || <span className="text-gray-400">&mdash;</span>}</TableCell>
                  <TableCell className="py-3"><span className={typeBadge(c.customerType)}>{c.customerType}</span></TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">₦{(c.creditLimit ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">₦{(c.outstandingBalance ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${c.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors">
                        <PencilIcon className="w-3.5 h-3.5 mr-1" /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget(c._id)} className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                        <TrashBinIcon className="w-3.5 h-3.5 mr-1" /> Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="This will permanently delete this customer and all associated data. This action cannot be undone."
        confirmLabel="Delete Customer"
        variant="danger"
      />
    </div>
  );
}
