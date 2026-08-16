"use client";

import { use, useEffect, useState } from "react";
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
import { TruckIcon, WaterDropIcon } from "@/components/icons/EntityIcons";
import { ListIcon, PlusIcon, CalenderIcon, ArrowRightIcon, DollarLineIcon, BoltIcon } from "@/icons";
import { LightbulbIcon, AlertTriangleIcon, CheckCircleIcon, TrendingUpIcon } from "lucide-react";

interface InvItem { _id: string; productId: { _id: string; name: string } | null; quantity: number; }
interface ServiceRec { _id: string; truckId: string; serviceType: string; description: string; date: string; cost: number; mileage: number; serviceCenter: string; nextServiceDate?: string; }
interface TruckLoad { _id: string; fromType: string; fromName?: string; toType: string; toName?: string; productId: { _id: string; name: string } | null; quantity: number; truckId: { _id: string; plateNumber: string } | null; status: string; date: string; }
interface ProductOpt { _id: string; name: string; }
interface Transfer { _id: string; fromType: string; fromName?: string; toType: string; toName?: string; productId: { _id: string; name: string } | null; quantity: number; status: string; date: string; }
interface Option { value: string; label: string; }

const COST_LABELS: Record<string, string> = {
  production: "Production",
  transport: "Transport",
  maintenance: "Maintenance",
  salary: "Salary",
  utility: "Utility",
  other: "Other",
};

const COST_COLORS: Record<string, string> = {
  production: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  transport: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  maintenance: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  salary: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  utility: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  other: "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

export default function TruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [truck, setTruck] = useState<{ _id: string; plateNumber: string; chassisNumber?: string; engineNumber?: string; capacity: number; isActive: boolean; createdAt: string } | null>(null);
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRec[]>([]);
  const [loads, setLoads] = useState<TruckLoad[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [insights, setInsights] = useState<{
    serviceCount: number;
    totalServiceCost: number;
    lastService: { date: string; serviceType: string; cost: number; mileage: number; serviceCenter: string } | null;
    nextServiceDate: string | null;
    totalFuelCost: number;
    totalFuelLiters: number;
    fuelLogCount: number;
    tripCount: number;
    completedTrips: number;
    totalTripMileage: number;
    totalCosts: number;
    costBreakdown: { category: string; total: number }[];
    driver: { name: string; phone: string; licenseNumber: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadSubmitting, setLoadSubmitting] = useState(false);

  const [serviceForm, setServiceForm] = useState({ serviceType: "routine", description: "", cost: "", mileage: "", serviceCenter: "", nextServiceDate: "", date: "" });

  const [factories, setFactories] = useState<Option[]>([]);
  const [depots, setDepots] = useState<Option[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [loadForm, setLoadForm] = useState({
    fromType: "", fromId: "", productId: "", quantity: "",
    loadType: "dispatch" as "dispatch" | "transfer",
    toType: "", toId: "", customerId: "", date: "", notes: "", loadAmount: "",
  });

  const fetchAll = () => {
    Promise.all([
      fetch(`/api/trucks/${id}`).then(r => r.json()),
      fetch(`/api/stock?locationType=truck&locationId=${id}`).then(r => r.json()),
      fetch(`/api/service-records?truckId=${id}`).then(r => r.json()),
      fetch(`/api/truck-loads?truckId=${id}`).then(r => r.json()),
      fetch(`/api/transfers?truckId=${id}`).then(r => r.json()),
      fetch(`/api/products`).then(r => r.json()),
      fetch(`/api/trucks/${id}/insights`).then(r => r.json()),
      fetch(`/api/factories`).then(r => r.json()),
      fetch(`/api/depots`).then(r => r.json()),
      fetch(`/api/customers`).then(r => r.json()),
    ]).then(([trk, inv, sr, ld, trn, prd, ins, f, d, c]) => {
      setTruck(trk);
      setInventory(Array.isArray(inv) ? inv : []);
      setServiceRecords(Array.isArray(sr) ? sr : []);
      setLoads(Array.isArray(ld) ? ld : []);
      const allTransfers = Array.isArray(trn) ? trn : [];
      setTransfers(allTransfers);
      setProducts(Array.isArray(prd) ? prd : []);
      setInsights(ins);
      setFactories((Array.isArray(f) ? f : []).map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      setDepots((Array.isArray(d) ? d : []).map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      setCustomers((Array.isArray(c) ? c : []).map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/service-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckId: id,
          serviceType: serviceForm.serviceType,
          description: serviceForm.description,
          cost: Number(serviceForm.cost),
          mileage: Number(serviceForm.mileage),
          serviceCenter: serviceForm.serviceCenter,
          nextServiceDate: serviceForm.nextServiceDate || undefined,
          date: serviceForm.date || undefined,
        }),
      });
      if (!res.ok) { showError("Failed to log service"); return; }
      showSuccess("Service record logged");
      setShowServiceModal(false);
      setServiceForm({ serviceType: "routine", description: "", cost: "", mileage: "", serviceCenter: "", nextServiceDate: "", date: "" });
      fetchAll();
    } catch { showError("Network error"); }
    finally { setSubmitting(false); }
  };

  const resetLoadForm = () => {
    setLoadForm({
      fromType: "", fromId: "", productId: "", quantity: "",
      loadType: "dispatch", toType: "", toId: "", customerId: "",
      date: new Date().toISOString().slice(0, 10), notes: "", loadAmount: "",
    });
  };

  const handleCreateLoad = async () => {
    if (!loadForm.fromType || !loadForm.fromId || !loadForm.productId || !loadForm.quantity || !truck) {
      showError("Please fill in all required fields"); return;
    }
    if (loadForm.loadType === "transfer" && (!loadForm.toType || !loadForm.toId)) {
      showError("Please select a destination for transfer"); return;
    }
    setLoadSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        fromType: loadForm.fromType,
        fromId: loadForm.fromId,
        productId: loadForm.productId,
        quantity: Number(loadForm.quantity),
        truckId: truck._id,
        date: loadForm.date,
        notes: loadForm.notes,
        loadAmount: loadForm.loadAmount ? Number(loadForm.loadAmount) : 0,
      };
      if (loadForm.loadType === "transfer") {
        body.toType = loadForm.toType;
        body.toId = loadForm.toId;
      } else {
        body.toType = "customer";
        if (loadForm.customerId) body.toId = loadForm.customerId;
      }
      const res = await fetch("/api/truck-loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); showError(err.error || "Failed to create load"); return; }
      showSuccess(loadForm.loadType === "dispatch" ? "Truck dispatched for direct sale" : "Truck loaded for transfer");
      setShowLoadModal(false);
      resetLoadForm();
      fetchAll();
    } catch { showError("Network error"); }
    finally { setLoadSubmitting(false); }
  };

  if (loading || !truck) return (
    <div>
      <PageBreadcrumb pageTitle="Delivery Vehicle" />
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading vehicle details...</div>
    </div>
  );

  const currentLoad = inventory.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const activeTransfers = transfers.filter(t => t.status === "pending" || t.status === "in-transit").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={`${truck.plateNumber}`} />
        <div className="flex gap-2">
          <Link href={`/trucks/${truck._id}/edit`}>
            <Button variant="outline" size="sm">Edit Vehicle</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-500/10">
            <TruckIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{truck.plateNumber}</h2>
              <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${truck.isActive ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400"}`}>
                {truck.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {truck.chassisNumber ? `Chassis: ${truck.chassisNumber}` : ""}
              {truck.chassisNumber && truck.engineNumber ? " | " : ""}
              {truck.engineNumber ? `Engine: ${truck.engineNumber}` : ""}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>Capacity: <strong>{(truck.capacity ?? 0).toLocaleString()} units</strong></span>
              <span>Trips: <strong>{insights?.tripCount ?? 0}</strong></span>
              <span>Total Costs: <strong>₦{((insights?.totalCosts ?? 0)).toLocaleString()}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Link href="/stock" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow block">
          <div className="flex items-center justify-center w-9 h-9 bg-cyan-100 rounded-lg dark:bg-cyan-500/10 mb-2">
            <WaterDropIcon className="text-cyan-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Load</p>
          <AutoAmount value={(currentLoad ?? 0).toLocaleString()} className="text-blue-600 dark:text-blue-400 !text-sm" />
        </Link>
        <Link href="/scheduled-operations" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow block">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-2">
            <ListIcon className="text-blue-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Service Records</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{serviceRecords.length}</p>
        </Link>
        <Link href="/transfers" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow block">
          <div className="flex items-center justify-center w-9 h-9 bg-purple-100 rounded-lg dark:bg-purple-500/10 mb-2">
            <ArrowRightIcon className="text-purple-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Transfers</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{activeTransfers}</p>
        </Link>
        <Link href="/scheduled-operations" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm hover:shadow-theme-md transition-shadow block">
          <div className="flex items-center justify-center w-9 h-9 bg-orange-100 rounded-lg dark:bg-orange-500/10 mb-2">
            <CalenderIcon className="text-orange-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Last Service</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{insights?.lastService ? formatDate(insights.lastService.date) : "—"}</p>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" startIcon={<PlusIcon />} onClick={() => setShowServiceModal(true)}>Log Service</Button>
        <Button size="sm" startIcon={<ListIcon />} variant="outline" onClick={() => { resetLoadForm(); setShowLoadModal(true); }}>Load Truck/Tricycle</Button>
        <Link href={`/transfers?truckId=${id}`}>
          <Button size="sm" startIcon={<ArrowRightIcon />} variant="outline">View Transfers</Button>
        </Link>
      </div>

      {insights && (() => {
        const advice: { type: "positive" | "warning" | "insight"; icon: React.ReactNode; title: string; message: string; href: string }[] = [];

        if (!insights.lastService) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "No Service Records", message: "This truck has no service records. Schedule first maintenance to prevent breakdowns and extend vehicle life.", href: "/scheduled-operations" });
        }

        if (insights.nextServiceDate) {
          const daysUntil = Math.ceil((new Date(insights.nextServiceDate).getTime() - Date.now()) / 86400000); // eslint-disable-line react-hooks/purity
          if (daysUntil <= 7 && daysUntil >= 0) {
            advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />, title: "Service Due Soon", message: `Next service is due in ${daysUntil === 0 ? "today" : `${daysUntil} days`} (${formatDate(insights.nextServiceDate)}). Book maintenance to avoid penalties.`, href: "/scheduled-operations" });
          } else if (daysUntil < 0) {
            advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "Service Overdue", message: `Service was due ${Math.abs(daysUntil)} days ago (${formatDate(insights.nextServiceDate)}). Schedule immediately to avoid mechanical issues.`, href: "/scheduled-operations" });
          } else {
            advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "Service Scheduled", message: `Next maintenance is scheduled for ${formatDate(insights.nextServiceDate)} (${daysUntil} days away). Plan ahead.`, href: "/scheduled-operations" });
          }
        } else if (insights.lastService) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "No Upcoming Service", message: "Last service was logged but no next service date was set. Consider adding a reminder.", href: "/scheduled-operations" });
        }

        if (!insights.driver) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "No Driver Assigned", message: "This truck has no active driver. Assign a driver to enable trip planning and accountability.", href: "/staff" });
        } else {
          advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "Driver Assigned", message: `${insights.driver.name} is the assigned driver${insights.driver.phone ? ` (${insights.driver.phone})` : ""}.`, href: "/staff" });
        }

        if (insights.totalFuelCost > 0 && insights.totalCosts > 0) {
          const fuelPct = ((insights.totalFuelCost / insights.totalCosts) * 100).toFixed(1);
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-amber-500" />, title: "Fuel Cost Breakdown", message: `Fuel accounts for ${fuelPct}% of total truck costs (₦${insights.totalFuelCost.toLocaleString()}). Monitor fuel efficiency to reduce expenses.`, href: "/costs" });
        }

        if (insights.tripCount > 0 && insights.completedTrips < insights.tripCount) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "Incomplete Trips", message: `${insights.completedTrips} of ${insights.tripCount} trips completed. ${insights.tripCount - insights.completedTrips} still in progress or cancelled. Review for bottlenecks.`, href: "/transfers" });
        }

        if (currentLoad > 0 && truck.capacity > 0) {
          const loadPct = ((currentLoad / truck.capacity) * 100).toFixed(0);
          if (Number(loadPct) > 80) {
            advice.push({ type: "insight", icon: <TrendingUpIcon className="w-5 h-5 text-amber-500" />, title: "Near Capacity", message: `Truck is at ${loadPct}% capacity (${currentLoad.toLocaleString()} / ${truck.capacity.toLocaleString()} units). Consider dispatching soon.`, href: "/transfers" });
          } else if (currentLoad > 0) {
            advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "Underutilized", message: `Truck is at ${loadPct}% capacity. Consolidate loads to improve delivery efficiency.`, href: "/transfers" });
          }
        }

        return (
          <>
            {advice.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <LightbulbIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Vehicle Advisory</h3>
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
                <BoltIcon className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Vehicle Stats</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <Link href="/costs" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Service Cost</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{(insights.totalServiceCost ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/costs" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Fuel Cost</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">₦{(insights.totalFuelCost ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/transfers" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Trips</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{insights.tripCount} total · {insights.completedTrips} completed</p>
                </Link>
                <Link href="/transfers" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Distance</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.totalTripMileage ?? 0).toLocaleString()} km</p>
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
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize ${COST_COLORS[c.category] ?? "bg-gray-50 text-gray-700"}`}>
                            {COST_LABELS[c.category] ?? c.category}
                          </span>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{item.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(item.quantity ?? 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {serviceRecords.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Service Records — {serviceRecords.length} entries</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
                <TableCell isHeader className="text-theme-xs">Type</TableCell>
                <TableCell isHeader className="text-theme-xs">Description</TableCell>
                <TableCell isHeader className="text-theme-xs">Cost</TableCell>
                <TableCell isHeader className="text-theme-xs">Mileage</TableCell>
                <TableCell isHeader className="text-theme-xs">Service Center</TableCell>
                <TableCell isHeader className="text-theme-xs">Next Service</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceRecords.slice(0, 10).map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="text-sm text-gray-500">{formatDate(r.date)}</TableCell>
                  <TableCell><span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{r.serviceType}</span></TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">{r.description || "—"}</TableCell>
                  <TableCell className="text-sm font-semibold text-gray-800 dark:text-white/90">₦{(r.cost ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(r.mileage ?? 0).toLocaleString()} km</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.serviceCenter || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.nextServiceDate ? formatDate(r.nextServiceDate) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {loads.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Delivery Load History</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">From</TableCell>
                <TableCell isHeader className="text-theme-xs">To</TableCell>
                <TableCell isHeader className="text-theme-xs">Product</TableCell>
                <TableCell isHeader className="text-theme-xs">Qty</TableCell>
                <TableCell isHeader className="text-theme-xs">Status</TableCell>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.slice(0, 10).map((l) => (
                <TableRow key={l._id}>
                  <TableCell className="text-sm text-gray-500 capitalize">{l.fromName ?? l.fromType}</TableCell>
                  <TableCell className="text-sm text-gray-500 capitalize">{l.toName ?? l.toType}</TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-white/90">{l.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(l.quantity ?? 0).toLocaleString()}</TableCell>
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

      {transfers.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Transfer History — {transfers.length} entries</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">From</TableCell>
                <TableCell isHeader className="text-theme-xs">To</TableCell>
                <TableCell isHeader className="text-theme-xs">Product</TableCell>
                <TableCell isHeader className="text-theme-xs">Qty</TableCell>
                <TableCell isHeader className="text-theme-xs">Status</TableCell>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.slice(0, 10).map((t) => (
                <TableRow key={t._id}>
                  <TableCell className="text-sm text-gray-500 capitalize">{t.fromName ?? t.fromType}</TableCell>
                  <TableCell className="text-sm text-gray-500 capitalize">{t.toName ?? t.toType}</TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-white/90">{t.productId?.name ?? "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(t.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="light" color={t.status === "delivered" ? "success" : t.status === "in-transit" ? "info" : t.status === "cancelled" ? "error" : "warning"}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(t.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <div className="mt-6 text-center text-xs text-gray-400">
        <button onClick={fetchAll} className="text-blue-500 hover:text-blue-600 underline mr-4">Refresh</button>
        {truck?.plateNumber ?? "Truck"}
      </div>

      {/* Load Truck/Tricycle Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => { setShowLoadModal(false); resetLoadForm(); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-theme-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Load Truck/Tricycle — {truck.plateNumber}</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Load Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLoadForm({ ...loadForm, loadType: "dispatch" })}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                    loadForm.loadType === "dispatch"
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  Dispatch (Direct Sale)
                </button>
                <button
                  type="button"
                  onClick={() => setLoadForm({ ...loadForm, loadType: "transfer" })}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                    loadForm.loadType === "transfer"
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  Transfer
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <Select
                    options={[
                      { value: "factory", label: "Factory" },
                      { value: "depot", label: "Depot" },
                      { value: "truck", label: "This Truck" },
                    ]}
                    placeholder="Type"
                    value={loadForm.fromType}
                    onChange={(val) => setLoadForm({ ...loadForm, fromType: val, fromId: val === "truck" ? truck._id : "" })}
                  />
                </div>
                <div className="flex-1">
                  <Select
                    options={loadForm.fromType === "factory" ? factories : loadForm.fromType === "depot" ? depots : loadForm.fromType === "truck" ? [{ value: truck._id, label: truck.plateNumber }] : []}
                    placeholder="Location"
                    value={loadForm.fromId}
                    onChange={(val) => setLoadForm({ ...loadForm, fromId: val })}
                  />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
              <Select
                options={products.map((p) => ({ value: p._id, label: p.name }))}
                placeholder="Select product"
                value={loadForm.productId}
                onChange={(val) => setLoadForm({ ...loadForm, productId: val })}
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <InputField type="number" placeholder="Units" value={loadForm.quantity} onChange={(e) => setLoadForm({ ...loadForm, quantity: e.target.value })} />
            </div>

            {loadForm.loadType === "transfer" ? (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
                <div className="flex gap-2">
                  <div className="w-1/3">
                    <Select
                      options={[
                        { value: "factory", label: "Factory" },
                        { value: "depot", label: "Depot" },
                      ]}
                      placeholder="Type"
                      value={loadForm.toType}
                      onChange={(val) => setLoadForm({ ...loadForm, toType: val, toId: "" })}
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      options={loadForm.toType === "factory" ? factories : loadForm.toType === "depot" ? depots : []}
                      placeholder="Location"
                      value={loadForm.toId}
                      onChange={(val) => setLoadForm({ ...loadForm, toId: val })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer <span className="text-gray-400 font-normal">(optional — empty for walk-in)</span></label>
                <Select
                  options={[
                    { value: "", label: "Outside Sale / Walk-in" },
                    ...customers,
                  ]}
                  placeholder="Select customer"
                  value={loadForm.customerId}
                  onChange={(val) => setLoadForm({ ...loadForm, customerId: val })}
                />
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <InputField type="date" value={loadForm.date} onChange={(e) => setLoadForm({ ...loadForm, date: e.target.value })} />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Load Amount (₦) <span className="text-gray-400 font-normal">optional</span></label>
              <InputField type="number" placeholder="0" value={loadForm.loadAmount} onChange={(e) => setLoadForm({ ...loadForm, loadAmount: e.target.value })} />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 font-normal">optional</span></label>
              <input type="text" placeholder="Any notes..." value={loadForm.notes} onChange={(e) => setLoadForm({ ...loadForm, notes: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10" />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowLoadModal(false); resetLoadForm(); }}>Cancel</Button>
              <Button size="sm" onClick={handleCreateLoad} disabled={loadSubmitting}>
                {loadSubmitting ? "Loading..." : loadForm.loadType === "dispatch" ? "Dispatch Vehicle" : "Load Truck/Tricycle"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowServiceModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-theme-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Log Service — {truck.plateNumber}</h3>
            <form onSubmit={handleService} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Type</label>
                <Select options={[
                  { value: "routine", label: "Routine" },
                  { value: "repair", label: "Repair" },
                  { value: "inspection", label: "Inspection" },
                  { value: "tyre", label: "Tyre" },
                  { value: "oil", label: "Oil Change" },
                  { value: "other", label: "Other" },
                ]} value={serviceForm.serviceType} onChange={v => setServiceForm({ ...serviceForm, serviceType: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <TextArea placeholder="Service description" value={serviceForm.description} onChange={v => setServiceForm({ ...serviceForm, description: v })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost (₦)</label>
                <InputField type="number" placeholder="Service cost" value={serviceForm.cost} onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mileage (km)</label>
                <InputField type="number" placeholder="Current mileage" value={serviceForm.mileage} onChange={e => setServiceForm({ ...serviceForm, mileage: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Center</label>
                <InputField type="text" placeholder="Service center name" value={serviceForm.serviceCenter} onChange={e => setServiceForm({ ...serviceForm, serviceCenter: e.target.value })} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Service Date</label>
                <InputField type="date" value={serviceForm.nextServiceDate} onChange={e => setServiceForm({ ...serviceForm, nextServiceDate: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Log Service"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowServiceModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
