"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AutoAmount from "@/components/ui/AutoAmount";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { formatDate } from "@/lib/dateFormat";
import { BottleIcon, WaterDropIcon, TruckIcon, FactoryIcon, DepotIcon } from "@/components/icons/EntityIcons";
import { DollarLineIcon, BoxCubeIcon, PencilIcon, ListIcon, BoltIcon } from "@/icons";
import { LightbulbIcon, AlertTriangleIcon, CheckCircleIcon, TrendingUpIcon } from "lucide-react";

interface InvItem { _id: string; locationType: string; locationId: string; locationName?: string; productId: { _id: string; name: string } | null; quantity: number; }
interface SaleData { _id: string; locationType: string; location?: { _id: string; name: string } | null; productId: { _id: string; name: string } | null; quantity: number; totalAmount: number; customerName: string; date: string; }
interface Insights {
  totalStock: number; totalSold: number; totalRevenue: number; totalProduced: number;
  locationCount: number; totalWastage: number; wastageCount: number;
  saleCount: number; productionCount: number;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<{ _id: string; name: string; unit: string; category: string; description: string; unitPrice: number; createdAt: string } | null>(null);
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [sales, setSales] = useState<SaleData[]>([]);
  const [factories, setFactories] = useState<{ _id: string; name: string }[]>([]);
  const [depots, setDepots] = useState<{ _id: string; name: string }[]>([]);
  const [trucks, setTrucks] = useState<{ _id: string; plateNumber: string }[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = () => {
    Promise.all([
      fetch(`/api/products/${id}`).then(r => r.json()),
      fetch(`/api/stock?productId=${id}`).then(r => r.json()),
      fetch(`/api/sales?productId=${id}`).then(r => r.json()),
      fetch(`/api/factories`).then(r => r.json()),
      fetch(`/api/depots`).then(r => r.json()),
      fetch(`/api/trucks`).then(r => r.json()),
      fetch(`/api/products/${id}/insights`).then(r => r.json()),
    ]).then(([prd, inv, sls, fac, dep, trk, ins]) => {
      setProduct(prd);
      setInventory(Array.isArray(inv) ? inv : []);
      const salesData = sls && typeof sls === "object" && !Array.isArray(sls) ? (sls as Record<string, unknown>).sales : sls;
      setSales(Array.isArray(salesData) ? salesData : []);
      setFactories(Array.isArray(fac) ? fac : []);
      setDepots(Array.isArray(dep) ? dep : []);
      setTrucks(Array.isArray(trk) ? trk : []);
      setInsights(ins);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]);

  const resolveLocationName = (item: InvItem): string => {
    if (item.locationName) return item.locationName;
    if (item.locationType === "factory") {
      const f = factories.find(f => f._id === item.locationId);
      return f?.name ?? "Unknown Factory";
    }
    if (item.locationType === "depot") {
      const d = depots.find(d => d._id === item.locationId);
      return d?.name ?? "Unknown Depot";
    }
    if (item.locationType === "truck") {
      const t = trucks.find(t => t._id === item.locationId);
      return t ? `Truck ${t.plateNumber}` : "Unknown Truck";
    }
    return "Unknown";
  };

  if (loading || !product) return (
    <div>
      <PageBreadcrumb pageTitle="Product" />
      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">Loading product details...</div>
    </div>
  );

  const totalStock = inventory.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const totalSold = sales.reduce((s, sl) => s + (sl.quantity ?? 0), 0);
  const locationCount = inventory.filter(i => i.locationId).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle={`Product: ${product.name}`} />
        <div className="flex gap-2">
          <Link href={`/products/${product._id}/edit`}>
            <Button size="sm" startIcon={<PencilIcon />}>Edit Product</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-pink-100 dark:bg-pink-500/10">
            <BottleIcon className="w-7 h-7 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{product.name}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full capitalize bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">{product.category}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{product.description || "No description"}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>Unit: <strong>{product.unit}</strong></span>
              <span>Unit Price: <strong>₦{product.unitPrice?.toLocaleString()}</strong></span>
              <span>Created: <strong>{formatDate(product.createdAt)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-cyan-100 rounded-lg dark:bg-cyan-500/10 mb-2">
            <BoxCubeIcon className="text-cyan-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total in Stock</p>
          <AutoAmount value={(totalStock ?? 0).toLocaleString()} className="text-gray-800 dark:text-white !text-sm" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-emerald-100 rounded-lg dark:bg-emerald-500/10 mb-2">
            <WaterDropIcon className="text-emerald-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Sold</p>
          <AutoAmount value={(totalSold ?? 0).toLocaleString()} className="text-gray-800 dark:text-white !text-sm" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-100 rounded-lg dark:bg-blue-500/10 mb-2">
            <ListIcon className="text-blue-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Locations</p>
          <p className="text-sm font-bold text-gray-800 dark:text-white">{locationCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-theme-sm">
          <div className="flex items-center justify-center w-9 h-9 bg-amber-100 rounded-lg dark:bg-amber-500/10 mb-2">
            <DollarLineIcon className="text-amber-600 size-4" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Unit Price</p>
          <p className="text-xs font-bold text-gray-800 dark:text-white">₦{product.unitPrice?.toLocaleString()}</p>
        </div>
      </div>

      {insights && (() => {
        const advice: { type: "positive" | "warning" | "insight"; icon: React.ReactNode; title: string; message: string; href: string }[] = [];

        if (insights.totalStock > 1000) {
          advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "High Inventory", href: "/stock", message: `You have ${insights.totalStock.toLocaleString()} units in stock. Strong availability across locations.` });
        } else if (insights.totalStock < 100) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />, title: "Low Stock Warning", href: "/stock", message: `Only ${insights.totalStock.toLocaleString()} units remaining. Consider restocking soon to avoid shortages.` });
        }

        if (insights.totalSold > insights.totalProduced) {
          advice.push({ type: "warning", icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />, title: "Sales Outpacing Production", href: "/analysis", message: `${insights.totalSold.toLocaleString()} units sold vs ${insights.totalProduced.toLocaleString()} produced. Consider increasing production.` });
        }

        if (insights.totalRevenue > 0) {
          advice.push({ type: "insight", icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />, title: "Revenue Insight", href: "/sales", message: `₦${insights.totalRevenue.toLocaleString()} in total revenue from ${insights.saleCount} sale(s).` });
        }

        if (insights.locationCount > 2) {
          advice.push({ type: "positive", icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />, title: "Good Distribution", href: "/stock", message: `This product is stocked at ${insights.locationCount} locations — excellent market reach.` });
        }

        return (
          <>
            {advice.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-theme-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <LightbulbIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Product Advisory</h3>
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
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Product Stats</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <Link href="/stock" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Stock</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.totalStock ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/sales" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Sold</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.totalSold ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/sales" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Revenue</p>
                  <p className="text-xs font-bold text-success-700 dark:text-success-400">₦{(insights.totalRevenue ?? 0).toLocaleString()}</p>
                </Link>
                <Link href="/stock" className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 hover:shadow-theme-sm transition-shadow block">
                  <p className="text-xs text-gray-400 mb-0.5">Total Produced</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{(insights.totalProduced ?? 0).toLocaleString()}</p>
                </Link>
              </div>

              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Stock by Location Type</h4>
              <div className="space-y-2">
                {(() => {
                  const locTypes = ["factory", "depot", "truck"] as const;
                  return locTypes.map((lt) => {
                    const pct = insights.totalStock > 0 ? Math.round((insights.totalStock / (insights.locationCount || 1)) * 0) : 0;
                    return (
                      <div key={lt} className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 min-w-[70px]">{lt}</span>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${lt === "factory" ? "bg-blue-500" : lt === "depot" ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${insights.locationCount > 0 ? (1 / insights.locationCount) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{insights.locationCount > 0 ? `${insights.locationCount} location(s)` : "0"}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </>
        );
      })()}

      {inventory.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Stock by Location — {inventory.length} entries</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Location Type</TableCell>
                <TableCell isHeader className="text-theme-xs">Location Name</TableCell>
                <TableCell isHeader className="text-theme-xs">Quantity</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                      item.locationType === "factory" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                      item.locationType === "depot" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    }`}>
                      {item.locationType === "factory" ? <FactoryIcon className="w-3 h-3" /> :
                       item.locationType === "depot" ? <DepotIcon className="w-3 h-3" /> :
                       <TruckIcon className="w-3 h-3" />}
                      {item.locationType}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-800 dark:text-white/90">{resolveLocationName(item)}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(item.quantity ?? 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 p-6 text-center text-sm text-gray-400">
          No stock records found for this product.
        </div>
      )}

      {sales.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Recent Sales — {sales.length} entries</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="text-theme-xs">Location</TableCell>
                <TableCell isHeader className="text-theme-xs">Customer</TableCell>
                <TableCell isHeader className="text-theme-xs">Qty</TableCell>
                <TableCell isHeader className="text-theme-xs">Amount</TableCell>
                <TableCell isHeader className="text-theme-xs">Date</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.slice(0, 10).map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="text-sm text-gray-500 capitalize">{s.location?.name ?? s.locationType}</TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-white/90">{s.customerName || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{(s.quantity ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm font-semibold text-gray-800 dark:text-white/90">₦{(s.totalAmount ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(s.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-theme-sm mb-6 p-6 text-center text-sm text-gray-400">
          No sales records found for this product.
        </div>
      )}

      <div className="mt-6 text-center text-xs text-gray-400">
        <button onClick={fetchAll} className="text-blue-500 hover:text-blue-600 underline mr-4">Refresh</button>
        {product?.name ?? "Product"}
      </div>
    </div>
  );
}
