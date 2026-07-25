"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import AutoAmount from "@/components/ui/AutoAmount";
import { formatDate } from "@/lib/dateFormat";

interface Supplier {
  _id: string; name: string; phone: string; phone2: string; email: string; whatsapp: string;
  contactPerson: string; address: string; supplyType: string; materialProvided: string;
  isActive: boolean; notes: string;
}

interface SupplierPO {
  _id: string; orderNumber: string; status: string; paymentStatus: string;
  totalAmount: number; amountPaid: number; orderDate: string; items: { quantity: number }[];
}

interface SupplierStats {
  totalOrders: number; totalSpent: number; pendingOrders: number; unpaidOrders: number;
}

const statusColor: Record<string, "light" | "info" | "warning" | "success" | "error"> = {
  draft: "light", sent: "info", confirmed: "warning", "partially-received": "info", received: "success", cancelled: "error",
};

export default function SupplierDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orders, setOrders] = useState<SupplierPO[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/suppliers/${id}`).then((r) => r.json()),
      fetch(`/api/purchase-orders?supplierId=${id}`).then((r) => r.json()),
      fetch(`/api/suppliers/${id}/insights`).then((r) => r.json()).catch(() => null),
    ]).then(([sup, poData, insights]) => {
      setSupplier(sup);
      setOrders(Array.isArray(poData) ? poData : []);
      if (insights?.poStats) {
        setStats({
          totalOrders: insights.poStats.totalOrders ?? 0,
          totalSpent: insights.poStats.totalSpent ?? 0,
          pendingOrders: insights.poStats.pendingOrders ?? 0,
          unpaidOrders: insights.poStats.unpaidOrders ?? 0,
        });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!supplier) return <div className="p-8 text-center text-gray-500">Supplier not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={supplier.name} />
        <div className="flex gap-3">
          {supplier.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${supplier.phone}`, "_self")}>📞 Call</Button>}
          {supplier.whatsapp && <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${supplier.whatsapp.replace(/[^0-9]/g, "")}`, "_blank")}>💬 WhatsApp</Button>}
          {supplier.email && <Button variant="outline" size="sm" onClick={() => window.open(`mailto:${supplier.email}`, "_self")}>✉️ Email</Button>}
          <Button variant="primary" size="sm" onClick={() => window.open(`/purchase-orders`, "_self")}>New Order</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.totalOrders ?? orders.length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
          <AutoAmount value={`₦${(stats?.totalSpent ?? 0).toLocaleString()}`} />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Orders</p>
          <h4 className="mt-1 font-bold text-gray-800 text-title-sm dark:text-white/90">{stats?.pendingOrders ?? orders.filter((o) => o.status === "sent" || o.status === "confirmed").length}</h4>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
          <h4 className="mt-1 font-bold text-red-600 dark:text-red-400 text-title-sm">
            ₦{(orders.filter((o) => o.paymentStatus !== "paid").reduce((s, o) => s + o.totalAmount - o.amountPaid, 0)).toLocaleString()}
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Supplier Info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Type</dt><dd className="text-gray-800 dark:text-white/90 capitalize">{supplier.supplyType}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Status</dt><dd><Badge variant="light" color={supplier.isActive ? "success" : "error"}>{supplier.isActive ? "Active" : "Inactive"}</Badge></dd></div>
            {supplier.contactPerson && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Contact Person</dt><dd className="text-gray-800 dark:text-white/90">{supplier.contactPerson}</dd></div>}
            {supplier.phone && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone</dt><dd className="text-gray-800 dark:text-white/90">{supplier.phone}</dd></div>}
            {supplier.phone2 && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Phone 2</dt><dd className="text-gray-800 dark:text-white/90">{supplier.phone2}</dd></div>}
            {supplier.whatsapp && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">WhatsApp</dt><dd className="text-gray-800 dark:text-white/90">{supplier.whatsapp}</dd></div>}
            {supplier.email && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Email</dt><dd className="text-gray-800 dark:text-white/90">{supplier.email}</dd></div>}
            {supplier.address && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Address</dt><dd className="text-gray-800 dark:text-white/90 text-right max-w-[60%]">{supplier.address}</dd></div>}
            {supplier.materialProvided && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Material</dt><dd className="text-gray-800 dark:text-white/90">{supplier.materialProvided}</dd></div>}
            {supplier.notes && <><div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" /><div><dt className="text-gray-500 dark:text-gray-400 mb-1">Notes</dt><dd className="text-gray-600 dark:text-gray-300">{supplier.notes}</dd></div></>}
          </dl>
          <div className="mt-4 flex gap-2 flex-wrap">
            {supplier.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${supplier.phone}`, "_self")}>📞 Call</Button>}
            {supplier.whatsapp && <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${supplier.whatsapp.replace(/[^0-9]/g, "")}`, "_blank")}>💬 WhatsApp</Button>}
            {supplier.email && <Button variant="outline" size="sm" onClick={() => window.open(`mailto:${supplier.email}`, "_self")}>✉️ Email</Button>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Purchase Orders ({orders.length})</h3>
          </div>
          {orders.length === 0 ? (
            <p className="p-5 text-sm text-gray-500 text-center">No purchase orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Order #</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Items</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Paid</TableCell>
                  <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o._id}>
                    <TableCell className="py-2 text-theme-sm">
                      <Link href={`/purchase-orders/${o._id}`} className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline">{o.orderNumber}</Link>
                    </TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{formatDate(o.orderDate)}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">{(o.items?.length ?? 0)}</TableCell>
                    <TableCell className="py-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">₦{o.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="py-2 text-theme-sm text-gray-500 dark:text-gray-400">₦{o.amountPaid.toLocaleString()}</TableCell>
                    <TableCell className="py-2"><Badge variant="light" color={statusColor[o.status] ?? "light"}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
