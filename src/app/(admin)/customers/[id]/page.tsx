"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import LocationPicker from "@/components/location/LocationPicker";
import type { LocationValue } from "@/components/location/LocationPicker";
import { UserIcon, GroupIcon, DollarLineIcon, PlusIcon, PencilIcon, ListIcon, BoltIcon } from "@/icons";
import { LightbulbIcon, AlertTriangleIcon, CheckCircleIcon, TrendingUpIcon } from "lucide-react";

interface Customer {
  _id: string; name: string; phone: string; email: string; address: string;
  coordinates: { lat: number; lng: number }; placeId: string;
  businessName: string; customerType: string; creditLimit: number;
  outstandingBalance: number; isActive: boolean; notes: string; createdAt: string;
}

interface Sale {
  _id: string; productId: { _id: string; name: string } | null;
  quantity: number; totalAmount: number; paymentMethod: string;
  date: string; customerName: string; isPaid: boolean;
}

interface Insight {
  totalSpent: number; purchaseCount: number; totalQuantity: number;
  totalInvoiced: number; totalPaid: number; invoiceCount: number;
  overdueInvoices: number; averagePurchaseValue: number;
  outstandingBalance: number; creditLimit: number;
  paymentMethodBreakdown: { method: string; total: number; count: number }[];
  recentSales: { _id: string; productName: string; quantity: number; totalAmount: number; date: string; paymentMethod: string }[];
}

const CUSTOMER_TYPES: Record<string, string> = {
  regular: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  wholesale: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  retailer: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  distributor: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<{ value: string; label: string; unitPrice: number }[]>([]);
  const [insights, setInsights] = useState<Insight | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", coordinates: { lat: 0, lng: 0 }, placeId: "", businessName: "", customerType: "regular", creditLimit: 0, outstandingBalance: 0, isActive: true, notes: "" });
  const [saleForm, setSaleForm] = useState({ productId: "", quantity: "", unitPrice: "", totalAmount: "", paymentMethod: "cash", date: "", notes: "" });

  const fetchAll = () => {
    Promise.all([
      fetch(`/api/customers/${id}`).then(r => r.json()),
      fetch(`/api/products`).then(r => r.json()),
      fetch(`/api/customers/${id}/insights`).then(r => r.json()),
    ]).then(([cust, prods, ins]) => {
      setCustomer(cust);
      setProducts(Array.isArray(prods) ? prods.map((p: { _id: string; name: string; unitPrice?: number }) => ({ value: p._id, label: p.name, unitPrice: p.unitPrice ?? 0 })) : []);
      setInsights(ins);
      if (cust?.name) {
        fetch(`/api/sales?customerName=${encodeURIComponent(cust.name)}`)
          .then(r => r.json())
          .then(data => {
            const list = Array.isArray(data) ? data : data?.sales ?? [];
            setSales(list);
          }).catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    if (!saleForm.productId) return;
    const found = products.find((p) => p.value === saleForm.productId);
    if (found) {
      const total = Number(saleForm.quantity) * found.unitPrice;
      setSaleForm((prev) => ({ ...prev, unitPrice: String(found.unitPrice), totalAmount: total > 0 ? String(total) : "" })); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [saleForm.productId, products]);

  useEffect(() => {
    if (saleForm.quantity && saleForm.unitPrice) {
      const total = Number(saleForm.quantity) * Number(saleForm.unitPrice);
      setSaleForm((prev) => ({ ...prev, totalAmount: total > 0 ? String(total) : "" })); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [saleForm.quantity, saleForm.unitPrice]);

  const openEdit = () => {
    if (!customer) return;
    setForm({
      name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "",
      address: customer.address ?? "", coordinates: customer.coordinates ?? { lat: 0, lng: 0 }, placeId: customer.placeId ?? "", businessName: customer.businessName ?? "",
      customerType: customer.customerType, creditLimit: customer.creditLimit,
      outstandingBalance: customer.outstandingBalance, isActive: customer.isActive,
      notes: customer.notes ?? "",
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { showError("Failed to update customer"); return; }
      showSuccess("Customer updated");
      setShowEditModal(false);
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const qty = Number(saleForm.quantity);
      const price = Number(saleForm.unitPrice);
      const total = qty * price;
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: saleForm.productId,
          quantity: qty,
          unitPrice: price,
          totalAmount: total,
          customerName: customer?.name ?? "",
          paymentMethod: saleForm.paymentMethod,
          date: saleForm.date || undefined,
          notes: saleForm.notes,
          locationType: "depot",
          locationId: "000000000000000000000000",
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed to record sale" })); showError(err.error); return; }
      showSuccess("Sale recorded");
      setShowSaleModal(false);
      setSaleForm({ productId: "", quantity: "", unitPrice: "", totalAmount: "", paymentMethod: "cash", date: "", notes: "" });
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  if (loading || !customer) return (
    <div>
      <PageBreadcrumb pageTitle="Customer" />
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading customer details...</div>
    </div>
  );

  const creditUsedPct = customer.creditLimit > 0 ? Math.round((customer.outstandingBalance / customer.creditLimit) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={`Customer: ${customer.name}`} />
        <div className="flex gap-2">
          <Button size="sm" startIcon={<PencilIcon />} onClick={openEdit}>Edit Customer</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-500/10">
            <UserIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{customer.name}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${customer.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
                {customer.isActive ? "Active" : "Inactive"}
              </span>
              <span className={CUSTOMER_TYPES[customer.customerType] ?? CUSTOMER_TYPES.regular}>{customer.customerType}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{customer.businessName || "—"}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
              <span>Phone: <strong>{customer.phone || "—"}</strong></span>
              <span>Email: <strong>{customer.email || "—"}</strong></span>
              <span>Address: <strong>{customer.address || "—"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-2">
            <DollarLineIcon className="text-blue-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Credit Limit</p>
          <AutoAmount value={`₦${(customer.creditLimit ?? 0).toLocaleString()}`} className="text-gray-800 dark:text-white !text-xs" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <DollarLineIcon className="text-red-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding Balance</p>
          <AutoAmount value={`₦${(customer.outstandingBalance ?? 0).toLocaleString()}`} className="text-gray-800 dark:text-white !text-xs" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-2">
            <ListIcon className="text-amber-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Credit Used</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{creditUsedPct}%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-2">
            <GroupIcon className="text-emerald-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Purchases</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{sales.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" startIcon={<PlusIcon />} onClick={() => { setSaleForm({ ...saleForm, date: new Date().toISOString().split("T")[0] }); setShowSaleModal(true); }}>Record Sale</Button>
      </div>

      {insights && (() => {
        const creditPct = insights.creditLimit > 0 ? Math.round((insights.outstandingBalance / insights.creditLimit) * 100) : 0;
        const advice: { type: "positive" | "warning" | "insight"; icon: React.ReactNode; title: string; message: string; href: string }[] = [];

        if (insights.purchaseCount === 0) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />, title: "No Purchases Yet", href: "/sales", message: "This customer has no recorded sales. Consider reaching out or running a promotion." });
        } else if (insights.purchaseCount > 10) {
          advice.push({ type: "positive", icon: <TrendingUpIcon className="w-5 h-5 text-emerald-500" />, title: "Loyal Customer", href: "/sales", message: `${insights.purchaseCount} purchases totaling ₦${insights.totalSpent.toLocaleString()}. Consider a loyalty program or special discount.` });
        } else {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "Moderate Activity", href: "/sales", message: `${insights.purchaseCount} purchase(s) totaling ₦${insights.totalSpent.toLocaleString()}. Encourage repeat business with follow-up.` });
        }

        if (insights.creditLimit > 0 && creditPct >= 80) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "Near Credit Limit", href: "/sales", message: `${creditPct}% of credit limit used (₦${insights.outstandingBalance.toLocaleString()} / ₦${insights.creditLimit.toLocaleString()}). Consider requesting payment before extending more credit.` });
        } else if (insights.outstandingBalance > 0 && insights.creditLimit > 0) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-amber-500" />, title: "Credit Used", href: "/sales", message: `${creditPct}% of credit limit used. Outstanding balance: ₦${insights.outstandingBalance.toLocaleString()}.` });
        }

        if (insights.overdueInvoices > 0) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "Overdue Invoices", href: "/sales", message: `${insights.overdueInvoices} overdue invoice(s). Follow up on payments to avoid bad debt.` });
        }

        if (insights.paymentMethodBreakdown.length > 0) {
          const topMethod = insights.paymentMethodBreakdown.sort((a, b) => b.total - a.total)[0];
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "Payment Preference", href: "/sales", message: `Prefers ${topMethod.method} (₦${topMethod.total.toLocaleString()} via ${topMethod.count} payment(s)).` });
        }

        if (insights.averagePurchaseValue > 0) {
          advice.push({ type: "insight", icon: <TrendingUpIcon className="w-5 h-5 text-emerald-500" />, title: "Avg Purchase Value", href: "/sales", message: `Average spend of ₦${insights.averagePurchaseValue.toLocaleString()} per transaction across ${insights.purchaseCount} purchase(s).` });
        }

        return (
          <>
            {advice.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <LightbulbIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Customer Advisory</h3>
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
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Customer Stats</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Link href="/sales" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Spent</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{(insights.totalSpent ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/sales" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Purchases</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{insights.purchaseCount}</p>
                </Link>
                <Link href="/sales" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Avg. Purchase</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{(insights.averagePurchaseValue ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/sales" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Qty</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.totalQuantity ?? 0).toLocaleString()}</p>
                </Link>
              </div>

              {insights.paymentMethodBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Payment Method Breakdown</h4>
                  <div className="space-y-2">
                    {insights.paymentMethodBreakdown.map((p) => {
                      const pct = insights.totalSpent > 0 ? ((p.total / insights.totalSpent) * 100).toFixed(1) : "0";
                      return (
                        <div key={p.method} className="flex items-center gap-3">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{p.method}</span>
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-800 dark:text-white/90 w-24 text-right">₦{p.total.toLocaleString()}</span>
                          <span className="text-xs text-gray-400 w-12 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Customer Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500 dark:text-gray-400">Name</span><p className="font-medium text-gray-800 dark:text-white/90">{customer.name}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Business Name</span><p className="font-medium text-gray-800 dark:text-white/90">{customer.businessName || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Phone</span><p className="font-medium text-gray-800 dark:text-white/90">{customer.phone || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Email</span><p className="font-medium text-gray-800 dark:text-white/90">{customer.email || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Address</span><p className="font-medium text-gray-800 dark:text-white/90">{customer.address || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Customer Type</span><p className="font-medium text-gray-800 dark:text-white/90 capitalize">{customer.customerType}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Credit Limit</span><p className="font-medium text-gray-800 dark:text-white/90">₦{(customer.creditLimit ?? 0).toLocaleString()}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Outstanding Balance</span><p className="font-medium text-gray-800 dark:text-white/90">₦{(customer.outstandingBalance ?? 0).toLocaleString()}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Status</span><p className="font-medium"><span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${customer.isActive ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>{customer.isActive ? "Active" : "Inactive"}</span></p></div>
          <div className="col-span-2"><span className="text-gray-500 dark:text-gray-400">Notes</span><p className="font-medium text-gray-800 dark:text-white/90">{customer.notes || "—"}</p></div>
          <div><span className="text-gray-500 dark:text-gray-400">Created</span><p className="font-medium text-gray-800 dark:text-white/90">{customer.createdAt ? formatDate(customer.createdAt) : "—"}</p></div>
        </div>
      </div>

      {sales.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Sales History — {sales.length} entries</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
                <TableCell isHeader className="text-theme-xs">Product</TableCell>
                <TableCell isHeader className="text-theme-xs">Quantity</TableCell>
                <TableCell isHeader className="text-theme-xs">Amount</TableCell>
                <TableCell isHeader className="text-theme-xs">Payment</TableCell>
                <TableCell isHeader className="text-theme-xs">Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.slice(0, 20).map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="text-sm text-gray-500">{formatDate(s.date)}</TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-white/90">{s.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(s.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm font-semibold text-gray-800 dark:text-white/90">₦{(s.totalAmount ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm capitalize text-gray-500">{s.paymentMethod}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${s.isPaid ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>
                      {s.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm">
          No sales recorded for this customer yet.
        </div>
      )}

      <div className="mt-6 text-center text-xs text-gray-400">
        <button onClick={fetchAll} className="text-blue-500 hover:text-blue-600 underline mr-4">Refresh</button>
        {customer?.name ?? "Customer"}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowEditModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Edit Customer</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <InputField type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                  <InputField type="text" placeholder="Business name" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <InputField type="text" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <InputField type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <LocationPicker value={form.address} latValue={form.coordinates.lat} lngValue={form.coordinates.lng} onChange={(loc) => setForm({ ...form, address: loc.address, coordinates: { lat: loc.lat, lng: loc.lng }, placeId: loc.placeId })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Type</label>
                  <Select options={[{ value: "regular", label: "Regular" }, { value: "wholesale", label: "Wholesale" }, { value: "retailer", label: "Retailer" }, { value: "distributor", label: "Distributor" }]} value={form.customerType} onChange={v => setForm({ ...form, customerType: v })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credit Limit (₦)</label>
                  <InputField type="number" placeholder="0" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Outstanding Balance (₦)</label>
                  <InputField type="number" placeholder="0" value={form.outstandingBalance} onChange={e => setForm({ ...form, outstandingBalance: Number(e.target.value) })} /></div>
                <div className="flex items-center gap-2 pt-7">
                  <input type="checkbox" id="edit-customer-active" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <label htmlFor="edit-customer-active" className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <TextArea placeholder="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} rows={3} /></div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !form.name}>{submitting ? "Saving..." : "Update Customer"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSaleModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { if (!submitting) setShowSaleModal(false); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Record Sale — {customer.name}</h3>
            <form onSubmit={handleSale} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <Select options={products} placeholder="Select product" value={saleForm.productId} onChange={v => setSaleForm({ ...saleForm, productId: v })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <InputField type="number" placeholder="Qty" value={saleForm.quantity} onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦)</label>
                  <InputField type="number" placeholder="Unit price" value={saleForm.unitPrice} disabled /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Amount (₦)</label>
                  <InputField type="number" placeholder="Auto-calculated" value={saleForm.totalAmount} disabled /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                  <Select options={[{ value: "cash", label: "Cash" }, { value: "pos", label: "POS" }, { value: "transfer", label: "Transfer" }, { value: "credit", label: "Credit" }]} value={saleForm.paymentMethod} onChange={v => setSaleForm({ ...saleForm, paymentMethod: v })} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !saleForm.productId || !saleForm.quantity}>{submitting ? "Saving..." : "Record Sale"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowSaleModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
