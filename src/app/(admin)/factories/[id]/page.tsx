"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import Badge from "@/components/ui/badge/Badge";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { formatDate } from "@/lib/dateFormat";
import { showSuccess, showError } from "@/lib/toast";
import { FactoryIcon, TruckIcon, WaterDropIcon, BottleIcon } from "@/components/icons/EntityIcons";
import { DollarLineIcon, ListIcon, PieChartIcon, AlertIcon, GroupIcon, PlusIcon, BoltIcon } from "@/icons";
import { LightbulbIcon, AlertTriangleIcon, CheckCircleIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";

interface Production { _id: string; productId: { _id: string; name: string } | null; quantity: number; date: string; }
interface InvItem { _id: string; productId: { _id: string; name: string } | null; quantity: number; }
interface TruckLoad { _id: string; toType: string; toName?: string; productId: { _id: string; name: string } | null; quantity: number; truckId: { _id: string; plateNumber: string } | null; status: string; date: string; }
interface CostRec { _id: string; category: string; amount: number; description: string; date: string; }
interface StaffMember { _id: string; name: string; role: string; department: string; salary: number; isActive: boolean; }
interface TruckOpt { _id: string; plateNumber: string; capacity: number; isActive?: boolean; }
interface ProductOpt { _id: string; name: string; }

export default function FactoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [factory, setFactory] = useState<{ _id: string; name: string; location: string; capacity: number; isActive: boolean } | null>(null);
  const [productions, setProductions] = useState<Production[]>([]);
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [loads, setLoads] = useState<TruckLoad[]>([]);
  const [costs, setCosts] = useState<CostRec[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [trucks, setTrucks] = useState<TruckOpt[]>([]);
  const [depots, setDepots] = useState<{ _id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([]);
  const [insights, setInsights] = useState<{
    totalProduction: number; totalSales: number; totalCosts: number; profit: number;
    totalStock: number; productCount: number; totalWastage: number; wastageCount: number;
    activeTransfers: number; saleCount: number;
    costBreakdown: { category: string; total: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showProdModal, setShowProdModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [loadForm, setLoadForm] = useState({ productId: "", quantity: "", truckId: "", toType: "depot", toId: "" });
  const [prodForm, setProdForm] = useState({ productId: "", quantity: "" });
  const [costForm, setCostForm] = useState({ category: "production", amount: "", description: "", date: "" });
  const [staffForm, setStaffForm] = useState({ name: "", phone: "", role: "operator", department: "production", salary: "", employmentType: "full-time" });
  const [saleForm, setSaleForm] = useState({ productId: "", quantity: "", unitPrice: "", customerName: "", paymentMethod: "cash" });

  const fetchAll = () => {
    Promise.all([
      fetch(`/api/factories/${id}`).then(r => r.json()),
      fetch(`/api/stock?locationType=factory&locationId=${id}`).then(r => r.json()),
      fetch(`/api/truck-loads`).then(r => r.json()),
      fetch(`/api/costs?locationType=factory&locationId=${id}`).then(r => r.json()),
      fetch(`/api/staff?locationType=factory&locationId=${id}`).then(r => r.json()),
      fetch(`/api/products`).then(r => r.json()),
      fetch(`/api/trucks`).then(r => r.json()),
      fetch(`/api/depots`).then(r => r.json()),
      fetch(`/api/factories/${id}/insights`).then(r => r.json()),
      fetch(`/api/customers`).then(r => r.json()),
    ]).then(([fac, inv, ld, cst, stf, prd, trk, dep, ins, cust]) => {
      setFactory(fac);
      setInventory(Array.isArray(inv) ? inv : []);
      const allLoads = Array.isArray(ld) ? ld : [];
      setLoads(allLoads.filter((l: TruckLoad) => {
        const lid = (l as unknown as Record<string, string>).fromId?.toString();
        return lid === id;
      }));
      setCosts(Array.isArray(cst) ? cst : []);
      setStaff(Array.isArray(stf) ? stf : []);
      setProducts(Array.isArray(prd) ? prd.map((p: ProductOpt) => p) : []);
      setTrucks(Array.isArray(trk) ? trk : []);
      setDepots(Array.isArray(dep) ? dep : []);
      setInsights(ins);
      setCustomers(Array.isArray(cust) ? cust.map((c: { _id: string; name: string }) => ({ value: c._id, label: c.name })) : []);
      // Build productions from inventory activity
      if (Array.isArray(inv)) {
        Promise.all(inv.map((item: InvItem) => fetch(`/api/stock/${item._id}/activity`).then(r => r.json()).catch(() => null)))
          .then(results => {
            const allProds: Production[] = [];
            for (const r of results) {
              if (r?.productions) allProds.push(...r.productions);
            }
            setProductions(allProds.sort((a: Production, b: Production) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20));
          }).catch(() => {});
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]);

  const [inventoryProducts, setInventoryProducts] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    if (inventory.length > 0 && products.length > 0) {
      setInventoryProducts(inventory // eslint-disable-line react-hooks/set-state-in-effect
        .filter(item => item.productId)
        .map(item => ({
          value: item.productId!._id,
          label: item.productId!.name,
        }))
      );
    }
  }, [inventory, products]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (saleForm.productId) { const found = products.find(p => p._id === saleForm.productId); if (found) setSaleForm(prev => ({ ...prev, unitPrice: String((found as unknown as Record<string, number>).unitPrice ?? 0) })); } }, [saleForm.productId, products]);

  const handleProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factoryId: id, productId: prodForm.productId, quantity: Number(prodForm.quantity) }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed to record production" })); showError(err.error); return; }
      showSuccess("Production recorded");
      setShowProdModal(false);
      setProdForm({ productId: "", quantity: "" });
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleLoadTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const truck = trucks.find(t => t._id === loadForm.truckId);
      const capacityUsed = truck ? Math.round((Number(loadForm.quantity) / truck.capacity) * 100) : 0;
      const res = await fetch("/api/truck-loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromType: "factory", fromId: id,
          toType: loadForm.toType, toId: loadForm.toId,
          productId: loadForm.productId, quantity: Number(loadForm.quantity),
          truckId: loadForm.truckId, capacityUsed,
          loadedBy: "Factory dispatch",
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed to load truck" })); showError(err.error); return; }
      showSuccess("Vehicle loaded successfully");
      setShowLoadModal(false);
      setLoadForm({ productId: "", quantity: "", truckId: "", toType: "depot", toId: "" });
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...costForm, amount: Number(costForm.amount), locationType: "factory", locationId: id }),
      });
      if (!res.ok) { showError("Failed to record cost"); return; }
      showSuccess("Cost recorded");
      setShowCostModal(false);
      setCostForm({ category: "production", amount: "", description: "", date: "" });
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...staffForm, salary: Number(staffForm.salary), locationType: "factory", locationId: id }),
      });
      if (!res.ok) { showError("Failed to add staff"); return; }
      showSuccess("Staff added");
      setShowStaffModal(false);
      setStaffForm({ name: "", phone: "", role: "operator", department: "production", salary: "", employmentType: "full-time" });
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const totalAmount = Number(saleForm.quantity) * Number(saleForm.unitPrice);
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: saleForm.productId,
          quantity: Number(saleForm.quantity),
          unitPrice: Number(saleForm.unitPrice),
          totalAmount,
          customerName: saleForm.customerName,
          paymentMethod: saleForm.paymentMethod,
          locationType: "factory",
          locationId: id,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Failed to record sale" })); showError(err.error); return; }
      showSuccess("Sale recorded");
      setShowSaleModal(false);
      setSaleForm({ productId: "", quantity: "", unitPrice: "", customerName: "", paymentMethod: "cash" });
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  if (loading || !factory) return (
    <div>
      <PageBreadcrumb pageTitle="Factory" />
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading factory details...</div>
    </div>
  );

  const totalProduced = productions.reduce((s, p) => s + (p.quantity ?? 0), 0);
  const totalSales = 0;
  const totalCosts = costs.reduce((s, c) => s + (c.amount ?? 0), 0);
  const totalStock = inventory.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const catCosts = [...new Set(costs.map(c => c.category))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={`Factory: ${factory.name}`} />
        <div className="flex gap-2">
          <Link href={`/factories/${factory._id}/edit`}>
            <Button variant="outline" size="sm">Edit Factory</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-500/10">
            <FactoryIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{factory.name}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${factory.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
                {factory.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{factory.location}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>Capacity: <strong>{(factory.capacity ?? 0).toLocaleString()} units</strong></span>
              <span>Staff: <strong>{staff.length}</strong></span>
              <span>Products: <strong>{inventory.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Link href="/stock" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow block">
          <div className="flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-2">
            <BottleIcon className="text-emerald-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Produced</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{totalProduced.toLocaleString()}</p>
        </Link>
        <Link href="/stock" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow block">
          <div className="flex items-center justify-center w-9 h-9 bg-cyan-100 rounded-lg dark:bg-cyan-500/10 mb-2">
            <WaterDropIcon className="text-cyan-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">In Stock</p>
          <AutoAmount value={totalStock.toLocaleString()} className="text-gray-800 dark:text-white !text-sm" />
        </Link>
        <Link href="/costs" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow block">
          <div className="flex items-center justify-center w-9 h-9 bg-red-100 rounded-lg dark:bg-red-500/10 mb-2">
            <ListIcon className="text-red-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Costs (₦)</p>
          <AutoAmount value={`₦${totalCosts.toLocaleString()}`} className="text-gray-800 dark:text-white !text-xs" />
        </Link>
        <Link href="/staff" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow block">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-2">
            <GroupIcon className="text-blue-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Staff</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{staff.length}</p>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" startIcon={<PlusIcon />} onClick={() => setShowProdModal(true)}>Record Production</Button>
        <Button size="sm" startIcon={<TruckIcon className="w-4 h-4" />} onClick={() => setShowLoadModal(true)}>Load Truck/Tricycle</Button>
        <Button size="sm" startIcon={<DollarLineIcon />} onClick={() => setShowCostModal(true)}>Record Cost</Button>
        <Button size="sm" startIcon={<GroupIcon />} onClick={() => setShowStaffModal(true)}>Add Staff</Button>
        <Button size="sm" startIcon={<BottleIcon className="w-4 h-4" />} onClick={() => setShowSaleModal(true)}>Record Sale</Button>
      </div>

      {insights && (() => {
        const profitPct = insights.totalSales > 0 ? ((insights.profit / insights.totalSales) * 100).toFixed(1) : "0";
        const advice: { type: "positive" | "warning" | "insight"; icon: React.ReactNode; title: string; message: string; href: string }[] = [];

        if (insights.profit < 0) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "Loss Warning", href: "/analysis", message: `Costs (₦${insights.totalCosts.toLocaleString()}) exceed revenue (₦${insights.totalSales.toLocaleString()}). Review production expenses and pricing.` });
        } else if (insights.profit > 0 && Number(profitPct) < 15) {
          advice.push({ type: "warning", icon: <TrendingUpIcon className="w-5 h-5 text-amber-500" />, title: "Thin Margins", href: "/analysis", message: `Profit margin is ${profitPct}%. Optimize production costs or adjust product pricing to improve profitability.` });
        } else if (insights.profit > 0) {
          advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "Healthy Profit", href: "/analysis", message: `Profit margin is ${profitPct}%. Operations are running efficiently. Keep up the momentum.` });
        }

        if (insights.totalProduction > 0) {
          advice.push({ type: "insight", icon: <TrendingUpIcon className="w-5 h-5 text-blue-500" />, title: "Production Running", href: "/stock", message: `${insights.totalProduction.toLocaleString()} units produced total. Ensure raw materials are stocked to maintain output.` });
        }

        if (insights.totalWastage > 0) {
          const wastePct = insights.totalProduction > 0 ? ((insights.totalWastage / insights.totalProduction) * 100).toFixed(1) : "0";
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />, title: "Wastage Detected", href: "/wastage", message: `${insights.totalWastage.toLocaleString()} units wasted (${wastePct}% of production). Investigate sources to reduce losses.` });
        }

        if (insights.activeTransfers > 0) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "Active Transfers", href: "/transfers", message: `${insights.activeTransfers} transfer(s) are in progress. Monitor delivery status to ensure timely arrival at destinations.` });
        }

        return (
          <>
            {advice.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <LightbulbIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Factory Advisory</h3>
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
                <BoltIcon className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Factory Stats</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Link href="/stock" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Produced</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.totalProduction ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/sales" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Sales</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{(insights.totalSales ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/costs" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Costs</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{(insights.totalCosts ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/analysis" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Profit</p>
                  <p className={`text-xs font-bold ${(insights.profit ?? 0) >= 0 ? "text-success-700 dark:text-success-400" : "text-error-700 dark:text-error-400"}`}>
                    ₦{(insights.profit ?? 0).toLocaleString()}
                  </p>
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Link href="/stock" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">In Stock</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.totalStock ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/products" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Products</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{insights.productCount}</p>
                </Link>
                <Link href="/wastage" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Wastage</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{(insights.totalWastage ?? 0).toLocaleString()} ({insights.wastageCount} record{insights.wastageCount === 1 ? "" : "s"})</p>
                </Link>
                <Link href="/transfers" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Active Transfers</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{insights.activeTransfers}</p>
                </Link>
              </div>

              {insights.costBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cost Breakdown</h4>
                  <div className="space-y-2">
                    {insights.costBreakdown.map((c) => {
                      const pct = insights.totalCosts > 0 ? ((c.total / insights.totalCosts) * 100).toFixed(1) : "0";
                      return (
                        <div key={c.category} className="flex items-center gap-3">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{c.category}</span>
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-800 dark:text-white/90 w-24 text-right">₦{c.total.toLocaleString()}</span>
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

      {productions.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Production History</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Product</TableCell>
                <TableCell isHeader className="text-theme-xs">Quantity</TableCell>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productions.slice(0, 10).map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="text-sm text-gray-800 dark:text-white/90">{p.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(p.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(p.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {inventory.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Current Stock</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Product</TableCell>
                <TableCell isHeader className="text-theme-xs">Quantity</TableCell>
                <TableCell isHeader className="text-theme-xs">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{item.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(item.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => {
                      setLoadForm({ ...loadForm, productId: item.productId?._id ?? "", quantity: String(item.quantity) });
                      setShowLoadModal(true);
                    }}>
                      Load to Truck
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {loads.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Outgoing Delivery Loads</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">To</TableCell>
                <TableCell isHeader className="text-theme-xs">Product</TableCell>
                <TableCell isHeader className="text-theme-xs">Qty</TableCell>
                <TableCell isHeader className="text-theme-xs">Truck</TableCell>
                <TableCell isHeader className="text-theme-xs">Status</TableCell>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.slice(0, 10).map((l) => (
                <TableRow key={l._id}>
                  <TableCell className="text-sm text-gray-500 capitalize">{l.toName ?? l.toType}</TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-white/90">{l.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(l.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-gray-500">{l.truckId?.plateNumber ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="light" color={l.status === "delivered" ? "success" : l.status === "in-transit" ? "info" : l.status === "cancelled" ? "error" : "warning"}>
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(l.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {costs.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Cost Records — {costs.length} entries</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Category</TableCell>
                <TableCell isHeader className="text-theme-xs">Amount</TableCell>
                <TableCell isHeader className="text-theme-xs">Description</TableCell>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.slice(0, 10).map((c) => (
                <TableRow key={c._id}>
                  <TableCell><span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400">{c.category}</span></TableCell>
                  <TableCell className="text-sm font-semibold text-gray-800 dark:text-white/90">₦{c.amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">{c.description}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(c.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {staff.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Staff — {staff.length} workers</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Name</TableCell>
                <TableCell isHeader className="text-theme-xs">Role</TableCell>
                <TableCell isHeader className="text-theme-xs">Department</TableCell>
                <TableCell isHeader className="text-theme-xs">Salary</TableCell>
                <TableCell isHeader className="text-theme-xs">Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{s.name}</TableCell>
                  <TableCell><span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{s.role}</span></TableCell>
                  <TableCell className="text-sm text-gray-500 capitalize">{s.department}</TableCell>
                  <TableCell className="text-sm text-gray-500">₦{s.salary?.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${s.isActive ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <div className="mt-6 text-center text-xs text-gray-400">
        <button onClick={fetchAll} className="text-blue-500 hover:text-blue-600 underline mr-4">Refresh</button>
        {factory?.name ?? "Factory"}
      </div>

      {/* Production Modal */}
      {showProdModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowProdModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Record Production</h3>
            <form onSubmit={handleProduction} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <Select options={products.map(p => ({ value: p._id, label: p.name }))} placeholder="Select product" onChange={v => setProdForm({ ...prodForm, productId: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <InputField type="number" placeholder="Units produced" value={prodForm.quantity} onChange={e => setProdForm({ ...prodForm, quantity: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !prodForm.productId || !prodForm.quantity}>{submitting ? "Saving..." : "Record Production"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowProdModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Load Truck/Tricycle Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowLoadModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Load Truck/Tricycle from {factory.name}</h3>
            <form onSubmit={handleLoadTruck} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <Select options={inventoryProducts.length > 0 ? inventoryProducts : products.map(p => ({ value: p._id, label: p.name }))} placeholder="Select product" value={loadForm.productId} onChange={v => setLoadForm({ ...loadForm, productId: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <InputField type="number" placeholder="Units to load" value={loadForm.quantity} onChange={e => setLoadForm({ ...loadForm, quantity: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Truck</label>
                <Select options={trucks.filter(t => t.isActive !== false).map(t => ({ value: t._id, label: `${t.plateNumber} (cap: ${(t.capacity ?? 0).toLocaleString()})` }))} placeholder="Select truck" value={loadForm.truckId} onChange={v => setLoadForm({ ...loadForm, truckId: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination Type</label>
                <Select options={[{ value: "depot", label: "Depot" }, { value: "factory", label: "Factory" }, { value: "customer", label: "Customer (Direct Sale)" }]} value={loadForm.toType} onChange={v => setLoadForm({ ...loadForm, toType: v, toId: "" })} />
              </div>
              {loadForm.toType === "customer" ? (
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer (optional)</label>
                  <Select options={[{ value: "", label: "Outside Sale / Walk-in" }, ...customers]} placeholder="Select customer" value={loadForm.toId} onChange={v => setLoadForm({ ...loadForm, toId: v })} />
                </div>
              ) : loadForm.toType ? (
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
                  <Select options={(loadForm.toType === "depot" ? depots : []).map(d => ({ value: d._id || "", label: d.name || "Unknown" }))} placeholder="Select destination" value={loadForm.toId} onChange={v => setLoadForm({ ...loadForm, toId: v })} />
                </div>
              ) : null}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !loadForm.productId || !loadForm.quantity || !loadForm.truckId || (loadForm.toType !== "customer" && !loadForm.toId)}>{submitting ? "Loading..." : "Load Truck/Tricycle"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowLoadModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cost Modal */}
      {showCostModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowCostModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Record Cost at {factory.name}</h3>
            <form onSubmit={handleCost} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <Select options={[{ value: "production", label: "Production" }, { value: "transport", label: "Transport" }, { value: "maintenance", label: "Maintenance" }, { value: "salary", label: "Salary" }, { value: "utility", label: "Utility" }, { value: "other", label: "Other" }]} value={costForm.category} onChange={v => setCostForm({ ...costForm, category: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₦)</label>
                <InputField type="number" placeholder="Amount" value={costForm.amount} onChange={e => setCostForm({ ...costForm, amount: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <TextArea placeholder="What for?" value={costForm.description} onChange={v => setCostForm({ ...costForm, description: v })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !costForm.amount}>{submitting ? "Saving..." : "Record Cost"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowCostModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowSaleModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Record Sale at {factory.name}</h3>
            <form onSubmit={handleSale} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <Select options={products.map(p => ({ value: p._id, label: p.name }))} placeholder="Select product" value={saleForm.productId} onChange={v => setSaleForm({ ...saleForm, productId: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                <InputField type="number" placeholder="Units sold" value={saleForm.quantity} onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₦)</label>
                <InputField type="number" placeholder="Price per unit" value={saleForm.unitPrice} disabled />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                <InputField type="text" placeholder="Customer name" value={saleForm.customerName} onChange={e => setSaleForm({ ...saleForm, customerName: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                <Select options={[{ value: "cash", label: "Cash" }, { value: "credit", label: "Credit" }, { value: "transfer", label: "Transfer" }, { value: "pos", label: "POS" }]} value={saleForm.paymentMethod} onChange={v => setSaleForm({ ...saleForm, paymentMethod: v })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !saleForm.productId || !saleForm.quantity || !saleForm.unitPrice}>{submitting ? "Saving..." : "Record Sale"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowSaleModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowStaffModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Add Staff to {factory.name}</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <InputField type="text" placeholder="Staff name" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <InputField type="text" placeholder="Phone number" value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <Select options={[{ value: "manager", label: "Manager" }, { value: "supervisor", label: "Supervisor" }, { value: "operator", label: "Operator" }, { value: "loader", label: "Loader" }, { value: "security", label: "Security" }, { value: "cleaner", label: "Cleaner" }, { value: "other", label: "Other" }]} value={staffForm.role} onChange={v => setStaffForm({ ...staffForm, role: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <Select options={[{ value: "production", label: "Production" }, { value: "logistics", label: "Logistics" }, { value: "sales", label: "Sales" }, { value: "administration", label: "Administration" }, { value: "maintenance", label: "Maintenance" }]} value={staffForm.department} onChange={v => setStaffForm({ ...staffForm, department: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary (₦)</label>
                <InputField type="number" placeholder="Monthly salary" value={staffForm.salary} onChange={e => setStaffForm({ ...staffForm, salary: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting || !staffForm.name}>{submitting ? "Saving..." : "Add Staff"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowStaffModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
