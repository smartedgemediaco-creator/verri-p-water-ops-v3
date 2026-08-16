"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BoxCubeIcon, FolderIcon, BoxIconLine,
  DollarLineIcon, ListIcon, PieChartIcon,
  UserIcon, GroupIcon, BoxIcon, AlertIcon,
} from "@/icons";

interface EntityRow {
  _id: string;
  name?: string;
  location?: string;
  plateNumber?: string;
  driverName?: string;
  sales: number;
  costs: number;
  profit: number;
  stock: number;
  wastage: number;
  wastageCount: number;
  activeTransfers?: number;
}

interface AnalysisData {
  factories: EntityRow[];
  depots: EntityRow[];
  trucks: EntityRow[];
}

interface CustomerItem { _id: string; name: string; phone: string; businessName: string; customerType: string; creditLimit: number; outstandingBalance: number; isActive: boolean; }
interface StaffItem { _id: string; name: string; role: string; department: string; locationType: string; salary: number; isActive: boolean; }
interface SupplierItem { _id: string; name: string; supplyType: string; materialProvided: string; isActive: boolean; }
interface RawMatItem { _id: string; name: string; unit: string; category: string; currentStock: number; minimumStock: number; unitCost: number; }

export default function AnalysisPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<AnalysisData | null>(null);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMatItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/analysis").then(r => r.json()),
      fetch("/api/customers").then(r => r.json()),
      fetch("/api/staff").then(r => r.json()),
      fetch("/api/suppliers").then(r => r.json()),
      fetch("/api/raw-materials").then(r => r.json()),
    ])
      .then(([analysis, cust, stf, supp, raw]) => {
        setData(analysis);
        setCustomers(Array.isArray(cust) ? cust : []);
        setStaff(Array.isArray(stf) ? stf : []);
        setSuppliers(Array.isArray(supp) ? supp : []);
        setRawMaterials(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setFetchError(true))
      .finally(() => setPageLoading(false));
  }, [user]);

  if (pageLoading) {
    return (
      <div>
        <div className="mb-6"><PageBreadcrumb pageTitle="Analysis" /></div>
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading analysis...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <div className="mb-6"><PageBreadcrumb pageTitle="Analysis" /></div>
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Failed to load analysis data.</p>
          <button onClick={() => { setPageLoading(true); setFetchError(false); setData(null); Promise.all([fetch("/api/analysis").then(r => r.json()), fetch("/api/customers").then(r => r.json()), fetch("/api/staff").then(r => r.json()), fetch("/api/suppliers").then(r => r.json()), fetch("/api/raw-materials").then(r => r.json())]).then(([a, c, s, sp, r]) => { setData(a); setCustomers(Array.isArray(c) ? c : []); setStaff(Array.isArray(s) ? s : []); setSuppliers(Array.isArray(sp) ? sp : []); setRawMaterials(Array.isArray(r) ? r : []); }).catch(() => setFetchError(true)).finally(() => setPageLoading(false)); }} className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const f = data.factories ?? [];
  const d = data.depots ?? [];
  const t = data.trucks ?? [];
  const totalFactories = f.length;
  const totalDepots = d.length;
  const totalTrucks = t.length;
  const totalSales = [...f, ...d, ...t].reduce((s: number, r: EntityRow) => s + (r.sales ?? 0), 0);
  const totalCosts = [...f, ...d, ...t].reduce((s: number, r: EntityRow) => s + (r.costs ?? 0), 0);
  const totalProfit = totalSales - totalCosts;
  const totalInv = [...f, ...d, ...t].reduce((s: number, r: EntityRow) => s + (r.stock ?? 0), 0);
  const totalWastage = [...f, ...d, ...t].reduce((s: number, r: EntityRow) => s + (r.wastage ?? 0), 0);
  const totalTransfers = t.reduce((s: number, r: EntityRow) => s + (r.activeTransfers ?? 0), 0);

  const isDriver = user?.role === "driver";
  const resourceCards = [
    { label: "Factories", value: totalFactories, href: "/factories", icon: <BoxCubeIcon className="text-blue-600 size-5 dark:text-blue-400" />, bg: "bg-blue-100 dark:bg-blue-500/10" },
    { label: "Depots", value: totalDepots, href: "/depots", icon: <FolderIcon className="text-green-600 size-5 dark:text-green-400" />, bg: "bg-green-100 dark:bg-green-500/10" },
    { label: "Vehicles", value: totalTrucks, href: "/trucks", icon: <BoxIconLine className="text-purple-600 size-5 dark:text-purple-400" />, bg: "bg-purple-100 dark:bg-purple-500/10" },
    { label: "Active Loads", value: totalTransfers, href: "/transfers", icon: <BoxIconLine className="text-indigo-600 size-5 dark:text-indigo-400" />, bg: "bg-indigo-100 dark:bg-indigo-500/10" },
    { label: "Customers", value: customers.length, href: "/customers", icon: <UserIcon className="text-indigo-600 size-5 dark:text-indigo-400" />, bg: "bg-indigo-100 dark:bg-indigo-500/10" },
    { label: "Staff", value: staff.length, href: "/staff", icon: <GroupIcon className="text-cyan-600 size-5 dark:text-cyan-400" />, bg: "bg-cyan-100 dark:bg-cyan-500/10" },
    { label: "Suppliers", value: suppliers.length, href: "/suppliers", icon: <BoxIcon className="text-yellow-600 size-5 dark:text-yellow-400" />, bg: "bg-yellow-100 dark:bg-yellow-500/10" },
    { label: "Raw Materials", value: rawMaterials.length, href: "/raw-materials", icon: <BoxCubeIcon className="text-amber-600 size-5 dark:text-amber-400" />, bg: "bg-amber-100 dark:bg-amber-500/10" },
  ];

  const financialCards = isDriver ? [] : [
    { label: "Total Stock", value: totalInv.toLocaleString(), href: "/stock", icon: <BoxIconLine className="text-orange-600 size-5 dark:text-orange-400" />, bg: "bg-orange-100 dark:bg-orange-500/10" },
    { label: "Total Sales", value: `₦${totalSales.toLocaleString()}`, href: "/sales", icon: <DollarLineIcon className="text-emerald-600 size-5 dark:text-emerald-400" />, bg: "bg-emerald-100 dark:bg-emerald-500/10" },
    { label: "Total Costs", value: `₦${totalCosts.toLocaleString()}`, href: "/costs", icon: <ListIcon className="text-red-600 size-5 dark:text-red-400" />, bg: "bg-red-100 dark:bg-red-500/10" },
    { label: "Profit", value: `₦${totalProfit.toLocaleString()}`, href: "/analysis", icon: <PieChartIcon className={`size-5 ${totalProfit >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"}`} />, bg: totalProfit >= 0 ? "bg-teal-100 dark:bg-teal-500/10" : "bg-red-100 dark:bg-red-500/10" },
    { label: "Total Wastage", value: totalWastage.toLocaleString(), href: "/wastage", icon: <BoxIconLine className="text-amber-600 size-5 dark:text-amber-400" />, bg: "bg-amber-100 dark:bg-amber-500/10" },
  ];

  const profitBadge = (v: number) => (
    <Badge variant="light" color={v >= 0 ? "success" : "error"}>
      ₦{Math.abs(v).toLocaleString()} {v >= 0 ? "profit" : "loss"}
    </Badge>
  );

  const lowStockItems = rawMaterials.filter(m => m.currentStock < m.minimumStock);
  const deptCounts = staff.reduce((acc: Record<string, number>, s) => {
    acc[s.department] = (acc[s.department] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <PageBreadcrumb pageTitle="Analysis" />
        <span className="text-xs text-gray-400 dark:text-gray-500">{user?.name ?? user?.email ?? ""}</span>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {resourceCards.map((card) => (
              <Link key={card.label} href={card.href} className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-3`}>{card.icon}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-white">{card.value}</p>
              </Link>
            ))}
            {financialCards.map((card) => (
              <Link key={card.label} href={card.href} className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm hover:shadow-theme-md transition-shadow min-w-0">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-3`}>{card.icon}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                <AutoAmount value={card.value} className="text-blue-600 dark:text-blue-400 !text-sm" />
              </Link>
            ))}
          </div>
        </div>

        {lowStockItems.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-4">⚠ Low Stock Raw Materials — {lowStockItems.length}</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="text-theme-xs">Material</TableCell>
                    <TableCell isHeader className="text-theme-xs">Category</TableCell>
                    <TableCell isHeader className="text-theme-xs">Current</TableCell>
                    <TableCell isHeader className="text-theme-xs">Minimum</TableCell>
                    <TableCell isHeader className="text-theme-xs">Shortage</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map(m => (
                    <TableRow key={m._id}>
                      <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{m.name}</TableCell>
                      <TableCell className="text-sm text-gray-500 capitalize">{m.category}</TableCell>
                      <TableCell className="text-sm text-red-600 font-semibold">{m.currentStock}</TableCell>
                      <TableCell className="text-sm text-gray-500">{m.minimumStock}</TableCell>
                      <TableCell><Badge variant="light" color="error">{(m.minimumStock - m.currentStock).toLocaleString()} {m.unit}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {customers.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Customers — {customers.length}</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="text-theme-xs">Name</TableCell>
                    <TableCell isHeader className="text-theme-xs">Business</TableCell>
                    <TableCell isHeader className="text-theme-xs">Type</TableCell>
                    <TableCell isHeader className="text-theme-xs">Credit Limit</TableCell>
                    <TableCell isHeader className="text-theme-xs">Outstanding</TableCell>
                    <TableCell isHeader className="text-theme-xs">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map(c => (
                    <TableRow key={c._id}>
                      <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{c.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{c.businessName || "—"}</TableCell>
                      <TableCell><span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">{c.customerType}</span></TableCell>
                      <TableCell className="text-sm text-gray-500">₦{(c.creditLimit ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm"><AutoAmount value={`₦${(c.outstandingBalance ?? 0).toLocaleString()}`} className={c.outstandingBalance > 0 ? "text-red-600" : "text-gray-500"} /></TableCell>
                      <TableCell><span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${c.isActive ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>{c.isActive ? "Active" : "Inactive"}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {staff.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Staff — {staff.length}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(deptCounts).map(([dept, count]) => (
                <span key={dept} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {dept}: {count}
                </span>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="text-theme-xs">Name</TableCell>
                    <TableCell isHeader className="text-theme-xs">Role</TableCell>
                    <TableCell isHeader className="text-theme-xs">Department</TableCell>
                    <TableCell isHeader className="text-theme-xs">Location</TableCell>
                    <TableCell isHeader className="text-theme-xs">Salary</TableCell>
                    <TableCell isHeader className="text-theme-xs">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(s => (
                    <TableRow key={s._id}>
                      <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{s.name}</TableCell>
                      <TableCell><span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{s.role}</span></TableCell>
                      <TableCell className="text-sm text-gray-500 capitalize">{s.department}</TableCell>
                      <TableCell className="text-sm text-gray-500 capitalize">{s.locationType}</TableCell>
                      <TableCell className="text-sm text-gray-500">₦{s.salary?.toLocaleString()}</TableCell>
                      <TableCell><span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${s.isActive ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>{s.isActive ? "Active" : "Inactive"}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {suppliers.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Suppliers — {suppliers.length}</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="text-theme-xs">Name</TableCell>
                    <TableCell isHeader className="text-theme-xs">Supply Type</TableCell>
                    <TableCell isHeader className="text-theme-xs">Material</TableCell>
                    <TableCell isHeader className="text-theme-xs">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map(s => (
                    <TableRow key={s._id}>
                      <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{s.name}</TableCell>
                      <TableCell><span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">{s.supplyType}</span></TableCell>
                      <TableCell className="text-sm text-gray-500">{s.materialProvided || "—"}</TableCell>
                      <TableCell><span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${s.isActive ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>{s.isActive ? "Active" : "Inactive"}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {rawMaterials.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Raw Materials — {rawMaterials.length}</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="text-theme-xs">Name</TableCell>
                    <TableCell isHeader className="text-theme-xs">Category</TableCell>
                    <TableCell isHeader className="text-theme-xs">Stock</TableCell>
                    <TableCell isHeader className="text-theme-xs">Min</TableCell>
                    <TableCell isHeader className="text-theme-xs">Unit Cost</TableCell>
                    <TableCell isHeader className="text-theme-xs">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawMaterials.map(m => {
                    const isLow = m.currentStock < m.minimumStock;
                    return (
                      <TableRow key={m._id}>
                        <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{m.name}</TableCell>
                        <TableCell className="text-sm text-gray-500 capitalize">{m.category}</TableCell>
                        <TableCell className={`text-sm font-semibold ${isLow ? "text-red-600" : "text-gray-800 dark:text-white/90"}`}>{m.currentStock.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-gray-500">{m.minimumStock.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-gray-500">₦{m.unitCost?.toLocaleString()}</TableCell>
                        <TableCell>{isLow ? <Badge variant="light" color="error">Low Stock</Badge> : <Badge variant="light" color="success">OK</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {f.length === 0 && d.length === 0 && t.length === 0 && customers.length === 0 && staff.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm">
            <BoxCubeIcon className="mx-auto mb-3 text-gray-300 dark:text-gray-600 size-10" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No data yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start by adding factories, depots, products, customers, staff, and suppliers.</p>
          </div>
        )}

        {f.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Per Factory</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Factory</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Sales</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Costs</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Profit</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Stock</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Wastage</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {f.map((fac) => (
                      <TableRow key={fac._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/factories/${fac._id}`)}>
                        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{fac.name}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{fac.location}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${fac.sales.toLocaleString()}`} className="!text-sm" /></TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${fac.costs.toLocaleString()}`} className="!text-sm" /></TableCell>
                        <TableCell className="py-3">{profitBadge(fac.profit)}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{fac.stock.toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{fac.wastage.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {d.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Per Depot</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Depot</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Sales</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Costs</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Profit</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Stock</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Wastage</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.map((dep) => (
                      <TableRow key={dep._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/depots/${dep._id}`)}>
                        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{dep.name}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{dep.location}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${dep.sales.toLocaleString()}`} className="!text-sm" /></TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${dep.costs.toLocaleString()}`} className="!text-sm" /></TableCell>
                        <TableCell className="py-3">{profitBadge(dep.profit)}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{dep.stock.toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{dep.wastage.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {t.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Per Vehicle</h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Plate Number</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Driver</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Sales</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Costs</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Profit</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Stock</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Wastage</TableCell>
                      <TableCell isHeader className="font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Active Loads</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.map((trk) => (
                      <TableRow key={trk._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/trucks/${trk._id}`)}>
                        <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">{trk.plateNumber}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{trk.driverName || "—"}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${trk.sales.toLocaleString()}`} className="!text-sm" /></TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400 min-w-0"><AutoAmount value={`₦${trk.costs.toLocaleString()}`} className="!text-sm" /></TableCell>
                        <TableCell className="py-3">{profitBadge(trk.profit)}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{trk.stock.toLocaleString()}</TableCell>
                        <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">{trk.wastage.toLocaleString()}</TableCell>
                        <TableCell className="py-3"><Badge variant="light" color="info">{trk.activeTransfers} active</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
