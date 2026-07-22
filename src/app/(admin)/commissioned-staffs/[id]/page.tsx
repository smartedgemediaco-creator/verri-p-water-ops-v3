"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { ChevronLeftIcon, PlusIcon, CloseIcon } from "@/icons";
import { showSuccess, showError } from "@/lib/toast";

interface StaffInfo {
  _id: string;
  name: string;
  phone: string;
  email: string;
  dealPrice: number;
  isActive: boolean;
}

interface PaymentEntry {
  _id?: string;
  type: "cash" | "transfer";
  amount: number;
  senderName: string;
  addAsCustomer: boolean;
  date: string;
  notes: string;
}

interface StaffRecord {
  _id: string;
  date: string;
  stockLoaded: number;
  stockReturned: number;
  dealPrice: number;
  expectedAmount: number;
  payments: PaymentEntry[];
  totalPaid: number;
  totalOwed: number;
  notes: string;
}

interface AllStaffOption {
  _id: string;
  name: string;
  totalOwed: number;
}

export default function CommissionedStaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [allStaff, setAllStaff] = useState<AllStaffOption[]>([]);
  const [selectedId, setSelectedId] = useState(id);
  const [loading, setLoading] = useState(true);

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formStockLoaded, setFormStockLoaded] = useState("");
  const [formStockReturned, setFormStockReturned] = useState("0");
  const [formNotes, setFormNotes] = useState("");

  const [payType, setPayType] = useState<"cash" | "transfer">("cash");
  const [payAmount, setPayAmount] = useState("");
  const [paySenderName, setPaySenderName] = useState("");
  const [payAddAsCustomer, setPayAddAsCustomer] = useState(false);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [editStockReturned, setEditStockReturned] = useState("");

  const fetchStaffData = useCallback(async (staffId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/commissioned-staffs/${staffId}`);
      if (!res.ok) { showError("Staff not found"); return; }
      const data = await res.json();
      setStaffInfo(data);
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch {
      showError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/commissioned-staffs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllStaff(data.map((s: StaffInfo & { totalOwed: number }) => ({ _id: s._id, name: s.name, totalOwed: s.totalOwed || 0 })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchStaffData(selectedId); }, [selectedId, fetchStaffData]);

  const createRecord = async () => {
    if (!formStockLoaded) { showError("Stock loaded is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/commissioned-staff-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedId,
          date: formDate,
          stockLoaded: Number(formStockLoaded),
          stockReturned: Number(formStockReturned) || 0,
          notes: formNotes,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Record created");
      setShowRecordModal(false);
      setFormStockLoaded("");
      setFormStockReturned("0");
      setFormNotes("");
      fetchStaffData(selectedId);
    } catch {
      showError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const addPayment = async () => {
    if (!paymentTarget) return;
    if (!payAmount || Number(payAmount) <= 0) { showError("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/commissioned-staff-records/${paymentTarget}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payType,
          amount: Number(payAmount),
          senderName: paySenderName,
          addAsCustomer: payAddAsCustomer,
          date: payDate,
        }),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed"); return; }
      showSuccess("Payment recorded");
      setShowPaymentModal(false);
      setPayAmount("");
      setPaySenderName("");
      setPayAddAsCustomer(false);
      fetchStaffData(selectedId);
    } catch {
      showError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStockReturned = async (recordId: string) => {
    try {
      const res = await fetch(`/api/commissioned-staff-records/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockReturned: Number(editStockReturned) || 0 }),
      });
      if (!res.ok) { showError("Failed to update"); return; }
      showSuccess("Record updated");
      setEditRecordId(null);
      fetchStaffData(selectedId);
    } catch {
      showError("Something went wrong");
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch(`/api/commissioned-staff-records/${recordId}`, { method: "DELETE" });
      if (!res.ok) { showError("Failed to delete"); return; }
      showSuccess("Record deleted");
      fetchStaffData(selectedId);
    } catch {
      showError("Failed to delete");
    }
  };

  const totalOwedAll = records.reduce((sum, r) => sum + (r.totalOwed || 0), 0);
  const totalPaidAll = records.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
  const totalExpectedAll = records.reduce((sum, r) => sum + (r.expectedAmount || 0), 0);
  const totalBags = records.reduce((sum, r) => sum + (r.stockLoaded || 0) - (r.stockReturned || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/commissioned-staffs" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <PageBreadcrumb pageTitle="Commissioned Staff Records" />
        </div>
        <div className="flex gap-2">
          <Select
            options={allStaff.map((s) => ({ value: s._id, label: `${s.name}${s.totalOwed > 0 ? ` (₦${s.totalOwed.toLocaleString()} owed)` : ""}` }))}
            value={selectedId}
            onChange={(val) => setSelectedId(val)}
          />
          <Button size="sm" startIcon={<PlusIcon />} onClick={() => setShowRecordModal(true)}>New Record</Button>
        </div>
      </div>

      {staffInfo && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Deal Price</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white/90">₦{(staffInfo.dealPrice ?? 0).toLocaleString()}/bag</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Bags Out</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white/90">{totalBags.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Expected</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white/90">₦{totalExpectedAll.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">₦{totalPaidAll.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Owed</p>
              <p className={`text-xl font-bold ${totalOwedAll > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                ₦{totalOwedAll.toLocaleString()}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading records...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No records yet</p>
              <p className="text-sm">Click &quot;New Record&quot; to add the first outing for {staffInfo.name}</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
              {records.map((rec) => {
                const bagsConsumed = (rec.stockLoaded || 0) - (rec.stockReturned || 0);
                const cashPaid = (rec.payments || []).filter((p) => p.type === "cash").reduce((s, p) => s + (p.amount || 0), 0);
                const transferPaid = (rec.payments || []).filter((p) => p.type === "transfer").reduce((s, p) => s + (p.amount || 0), 0);

                return (
                  <div key={rec._id} className="flex-shrink-0 w-[380px] snap-start bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white/90">{new Date(rec.date).toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                        <p className="text-xs text-gray-400 mt-0.5">₦{(rec.dealPrice ?? 0).toLocaleString()}/bag snapshotted</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setPaymentTarget(rec._id); setShowPaymentModal(true); }}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 transition-colors">
                          + Payment
                        </button>
                        <button onClick={() => deleteRecord(rec._id)}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="px-5 py-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Stock Loaded</span>
                        <span className="font-medium text-gray-800 dark:text-white/90">{(rec.stockLoaded ?? 0).toLocaleString()} bags</span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-500 dark:text-gray-400">Stock Returned</span>
                        {editRecordId === rec._id ? (
                          <div className="flex items-center gap-2">
                            <Input type="number" value={editStockReturned} onChange={(e) => setEditStockReturned(e.target.value)}
                              className="w-20 text-right text-sm" />
                            <button onClick={() => updateStockReturned(rec._id)} className="text-xs text-brand-600 font-medium">Save</button>
                            <button onClick={() => setEditRecordId(null)} className="text-xs text-gray-400">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditRecordId(rec._id); setEditStockReturned(String(rec.stockReturned ?? 0)); }}
                            className="font-medium text-gray-800 dark:text-white/90 hover:text-brand-600 transition-colors">
                            {(rec.stockReturned ?? 0).toLocaleString()} bags
                            <span className="text-[10px] text-gray-400 ml-1">(edit)</span>
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Bags Consumed</span>
                        <span className="font-medium text-gray-800 dark:text-white/90">{bagsConsumed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t border-gray-100 dark:border-gray-800 pt-2">
                        <span className="text-gray-600 dark:text-gray-300">Expected Amount</span>
                        <span className="text-gray-800 dark:text-white/90">₦{(rec.expectedAmount ?? 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Payments</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Cash</span>
                        <span className="font-medium text-green-600 dark:text-green-400">₦{cashPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Transfer</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">₦{transferPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1.5">
                        <span className="text-gray-600 dark:text-gray-300">Total Paid</span>
                        <span className="text-green-600 dark:text-green-400">₦{(rec.totalPaid ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-gray-600 dark:text-gray-300">Owed</span>
                        <span className={(rec.totalOwed ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                          ₦{(rec.totalOwed ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {(rec.payments || []).length > 0 && (
                      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Payment History</p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {rec.payments.map((p, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-500">
                                {p.type === "transfer" ? `Transfer — ${p.senderName || "Unknown"}` : "Cash"}
                                {p.addAsCustomer ? " ★" : ""}
                              </span>
                              <span className="font-medium text-gray-700 dark:text-gray-300">₦{(p.amount ?? 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">New Outing Record</h3>
              <button onClick={() => setShowRecordModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <CloseIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Loaded *</label>
                  <Input type="number" value={formStockLoaded} onChange={(e) => setFormStockLoaded(e.target.value)} placeholder="e.g. 50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Returned</label>
                  <Input type="number" value={formStockReturned} onChange={(e) => setFormStockReturned(e.target.value)} placeholder="0" />
                </div>
              </div>
              {formStockLoaded && (
                <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-600 dark:text-brand-400">Expected Amount</span>
                    <span className="font-bold text-brand-700 dark:text-brand-300">
                      ₦{((Number(formStockLoaded) - (Number(formStockReturned) || 0)) * (staffInfo?.dealPrice || 0)).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-brand-500 dark:text-brand-400 mt-1">
                    ({Number(formStockLoaded) - (Number(formStockReturned) || 0)} bags × ₦{(staffInfo?.dealPrice || 0).toLocaleString()}/bag)
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea value={formNotes} onChange={(val) => setFormNotes(val)} placeholder="Optional notes..." rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={() => setShowRecordModal(false)}>Cancel</Button>
              <Button size="sm" onClick={createRecord} disabled={submitting}>
                {submitting ? "Saving..." : "Create Record"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <CloseIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Type</label>
                <div className="flex gap-2">
                  <button onClick={() => setPayType("cash")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${payType === "cash" ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                    Cash
                  </button>
                  <button onClick={() => setPayType("transfer")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${payType === "transfer" ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>
                    Transfer
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="e.g. 5000" />
              </div>
              {payType === "transfer" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Who Sent the Transfer? *</label>
                    <Input value={paySenderName} onChange={(e) => setPaySenderName(e.target.value)} placeholder="Name of sender" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={payAddAsCustomer} onChange={(e) => setPayAddAsCustomer(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-500 dark:bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Add sender as customer</span>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button size="sm" onClick={addPayment} disabled={submitting}>
                {submitting ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
