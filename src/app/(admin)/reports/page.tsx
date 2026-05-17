"use client";

import { useEffect, useRef, useState } from "react";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";

interface FilterOption {
  value: string;
  label: string;
}

interface Entity {
  _id: string;
  name?: string;
  location?: string;
  plateNumber?: string;
  driverName?: string;
  capacity?: number;
  isActive?: boolean;
  category?: string;
  unit?: string;
  manager?: string;
}

interface InventoryItem {
  product: string;
  productId?: string;
  locationType: string;
  locationId: string;
  quantity: number;
}

interface SaleItem {
  _id: string;
  depot: string;
  product: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName: string;
  date: string;
}

interface CostItem {
  _id: string;
  category: string;
  amount: number;
  description: string;
  locationType: string;
  locationId?: string;
  date: string;
}

interface ProductionItem {
  _id: string;
  factory: string;
  product: string;
  productId?: string;
  quantity: number;
  date: string;
}

interface TransferItem {
  _id: string;
  fromType: string;
  toType: string;
  product: string;
  productId?: string;
  quantity: number;
  truck: string;
  status: string;
  date: string;
}

interface ActivityLogItem {
  _id: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
}

interface ReportMeta {
  generatedAt: string;
  generatedBy: string;
  role: string;
  filters: Record<string, string | null>;
}

interface ReportData {
  meta: ReportMeta;
  entities: {
    factories: Entity[];
    depots: Entity[];
    trucks: Entity[];
    products: Entity[];
  };
  inventory: InventoryItem[];
  sales: SaleItem[];
  costs: CostItem[];
  production: ProductionItem[];
  transfers: TransferItem[];
  activityLogs: ActivityLogItem[];
  totals: {
    sales: number;
    costs: number;
    profit: number;
    inventory: number;
    production: number;
    transfers: number;
  };
}

export default function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);

  const [factories, setFactories] = useState<FilterOption[]>([]);
  const [depots, setDepots] = useState<FilterOption[]>([]);
  const [products, setProducts] = useState<FilterOption[]>([]);

  const [domainType, setDomainType] = useState("");
  const [domainId, setDomainId] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateKey, setDateKey] = useState(0);

  const domainOptions = domainType === "factory" ? factories : domainType === "depot" ? depots : [];

  const handleDomainTypeChange = (val: string) => {
    setDomainType(val);
    setDomainId("");
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/factories").then((r) => r.json()),
      fetch("/api/depots").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([f, d, p]) => {
      if (Array.isArray(f)) setFactories(f.map((x: Entity) => ({ value: x._id, label: `${x.name} — ${x.location}` })));
      if (Array.isArray(d)) setDepots(d.map((x: Entity) => ({ value: x._id, label: `${x.name} — ${x.location}` })));
      if (Array.isArray(p)) setProducts([{ value: "", label: "All Products" }, ...p.map((x: Entity) => ({ value: x._id, label: x.name ?? "" }))]);
    });
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setData(null);

    const params = new URLSearchParams();
    if (domainType && domainId) {
      params.set("domainType", domainType);
      params.set("domainId", domainId);
    }
    if (filterProduct) params.set("productId", filterProduct);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    try {
      const res = await fetch(`/api/reports?${params}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Report generation failed", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 190;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.height - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.height - 20;
      }

      const filename = `verri-p-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (n: number) =>
    `₦${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Reports" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Select
            options={[
              { value: "", label: "Entire Organization" },
              { value: "factory", label: "Specific Factory" },
              { value: "depot", label: "Specific Depot" },
            ]}
            placeholder="Scope"
            value={domainType}
            onChange={handleDomainTypeChange}
          />
          <Select
            options={domainOptions}
            placeholder={domainType ? `Select ${domainType}` : "Select scope first"}
            value={domainId}
            onChange={setDomainId}
          />
          <Select
            options={products}
            placeholder="All Products"
            value={filterProduct}
            onChange={setFilterProduct}
          />
          <DatePicker
            key={`start-${dateKey}`}
            id="report-start-date"
            placeholder="Start Date"
            defaultDate={startDate || undefined}
            onChange={(_dates, dateStr) => setStartDate(dateStr)}
          />
          <DatePicker
            key={`end-${dateKey}`}
            id="report-end-date"
            placeholder="End Date"
            defaultDate={endDate || undefined}
            onChange={(_dates, dateStr) => setEndDate(dateStr)}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={generateReport} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </Button>
          {data && (
            <Button variant="outline" onClick={downloadPDF} disabled={generating}>
              {generating ? "Preparing PDF..." : "Download PDF"}
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
          Generating report, please wait...
        </div>
      )}

      {data && (
        <div ref={reportRef} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-8">
          <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verri P Water Inc</h1>
            <p className="text-base text-gray-500 mt-1">Operations Report</p>
            <p className="text-sm text-gray-400 mt-1">
              Generated {formatDate(data.meta.generatedAt)} by {data.meta.generatedBy}
              {data.meta.filters.domainType && ` — ${data.meta.filters.domainType}: ${data.meta.filters.domainId?.slice(-8)}`}
              {data.meta.filters.productId && ` — Product filtered`}
              {data.meta.filters.startDate && ` — From ${data.meta.filters.startDate}`}
              {data.meta.filters.endDate && ` To ${data.meta.filters.endDate}`}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Factories", value: data.entities.factories.length, color: "blue" },
              { label: "Total Depots", value: data.entities.depots.length, color: "green" },
              { label: "Total Trucks", value: data.entities.trucks.length, color: "purple" },
              { label: "Products", value: data.entities.products.length, color: "orange" },
            ].map((c) => (
              <div key={c.label} className={`bg-${c.color}-50 dark:bg-${c.color}-500/10 rounded-lg p-4 text-center border border-${c.color}-100 dark:border-${c.color}-500/20`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total Sales", value: formatCurrency(data.totals.sales), color: "emerald" },
              { label: "Total Costs", value: formatCurrency(data.totals.costs), color: "red" },
              {
                label: "Net Profit",
                value: formatCurrency(data.totals.profit),
                color: data.totals.profit >= 0 ? "teal" : "red",
              },
              { label: "Inventory (units)", value: data.totals.inventory.toLocaleString(), color: "cyan" },
              { label: "Production Batches", value: data.totals.production.toLocaleString(), color: "indigo" },
              { label: "Transfers", value: data.totals.transfers.toLocaleString(), color: "violet" },
            ].map((c) => (
              <div key={c.label} className={`bg-${c.color}-50 dark:bg-${c.color}-500/10 rounded-lg p-4 text-center border border-${c.color}-100 dark:border-${c.color}-500/20`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</p>
                <p className={`text-xl font-bold mt-1 ${c.color === "red" ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {data.entities.factories.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Factories</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-3 text-gray-500 font-medium">Name</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Location</th>
                    <th className="py-2 px-3 text-gray-500 font-medium text-right">Capacity</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entities.factories.map((f: Entity) => (
                    <tr key={f._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 font-medium text-gray-800 dark:text-white/90">{f.name}</td>
                      <td className="py-2 px-3 text-gray-500">{f.location}</td>
                      <td className="py-2 px-3 text-gray-500 text-right">{f.capacity?.toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${f.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
                          {f.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.entities.depots.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Depots</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-3 text-gray-500 font-medium">Name</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Location</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Manager</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entities.depots.map((d: Entity) => (
                    <tr key={d._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 font-medium text-gray-800 dark:text-white/90">{d.name}</td>
                      <td className="py-2 px-3 text-gray-500">{d.location}</td>
                      <td className="py-2 px-3 text-gray-500">{d.manager || "—"}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.inventory.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Inventory <span className="text-sm font-normal text-gray-400">({data.totals.inventory.toLocaleString()} total units)</span>
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-3 text-gray-500 font-medium">Product</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Location</th>
                    <th className="py-2 px-3 text-gray-500 font-medium text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.map((i: InventoryItem, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 font-medium text-gray-800 dark:text-white/90">{i.product}</td>
                      <td className="py-2 px-3 text-gray-500 capitalize">{i.locationType}</td>
                      <td className="py-2 px-3 text-gray-500 text-right">{i.quantity.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.sales.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Sales <span className="text-sm font-normal text-gray-400">({data.sales.length} records, {formatCurrency(data.totals.sales)} total)</span>
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-3 text-gray-500 font-medium">Date</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Depot</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Product</th>
                    <th className="py-2 px-3 text-gray-500 font-medium text-right">Qty</th>
                    <th className="py-2 px-3 text-gray-500 font-medium text-right">Total</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.map((s: SaleItem) => (
                    <tr key={s._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 text-gray-500">{formatDate(s.date)}</td>
                      <td className="py-2 px-3 text-gray-500">{s.depot}</td>
                      <td className="py-2 px-3 font-medium text-gray-800 dark:text-white/90">{s.product}</td>
                      <td className="py-2 px-3 text-gray-500 text-right">{s.quantity.toLocaleString()}</td>
                      <td className="py-2 px-3 text-gray-800 dark:text-white/90 text-right font-medium">{formatCurrency(s.totalAmount)}</td>
                      <td className="py-2 px-3 text-gray-500">{s.customerName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.costs.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Costs <span className="text-sm font-normal text-gray-400">({data.costs.length} records, {formatCurrency(data.totals.costs)} total)</span>
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-3 text-gray-500 font-medium">Date</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Category</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Description</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Location</th>
                    <th className="py-2 px-3 text-gray-500 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.costs.map((c: CostItem) => (
                    <tr key={c._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 text-gray-500">{formatDate(c.date)}</td>
                      <td className="py-2 px-3 capitalize text-gray-500">{c.category}</td>
                      <td className="py-2 px-3 text-gray-500">{c.description || "—"}</td>
                      <td className="py-2 px-3 capitalize text-gray-500">{c.locationType}</td>
                      <td className="py-2 px-3 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.production.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Production <span className="text-sm font-normal text-gray-400">({data.production.length} batches)</span>
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-3 text-gray-500 font-medium">Date</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Factory</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Product</th>
                    <th className="py-2 px-3 text-gray-500 font-medium text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.production.map((p: ProductionItem) => (
                    <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 text-gray-500">{formatDate(p.date)}</td>
                      <td className="py-2 px-3 text-gray-500">{p.factory}</td>
                      <td className="py-2 px-3 font-medium text-gray-800 dark:text-white/90">{p.product}</td>
                      <td className="py-2 px-3 text-gray-500 text-right">{p.quantity.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.transfers.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Transfers <span className="text-sm font-normal text-gray-400">({data.transfers.length} records)</span>
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-3 text-gray-500 font-medium">Date</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">From</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">To</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Product</th>
                    <th className="py-2 px-3 text-gray-500 font-medium text-right">Qty</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Truck</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transfers.map((t: TransferItem) => (
                    <tr key={t._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 text-gray-500">{formatDate(t.date)}</td>
                      <td className="py-2 px-3 capitalize text-gray-500">{t.fromType}</td>
                      <td className="py-2 px-3 capitalize text-gray-500">{t.toType}</td>
                      <td className="py-2 px-3 font-medium text-gray-800 dark:text-white/90">{t.product}</td>
                      <td className="py-2 px-3 text-gray-500 text-right">{t.quantity.toLocaleString()}</td>
                      <td className="py-2 px-3 text-gray-500">{t.truck}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === "delivered" ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" :
                          t.status === "in-transit" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                          t.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" :
                          "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.activityLogs.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Recent Activity <span className="text-sm font-normal text-gray-400">({data.activityLogs.length} entries)</span>
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="py-2 px-3 text-gray-500 font-medium">Date</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Action</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Entity</th>
                    <th className="py-2 px-3 text-gray-500 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activityLogs.map((a: ActivityLogItem) => (
                    <tr key={a._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 text-gray-500">{formatDate(a.createdAt)}</td>
                      <td className="py-2 px-3 capitalize">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.action === "created" ? "bg-green-100 text-green-700" :
                          a.action === "updated" ? "bg-yellow-100 text-yellow-700" :
                          a.action === "deleted" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {a.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 capitalize text-gray-500">{a.entity}</td>
                      <td className="py-2 px-3 text-gray-500">{a.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
            <p className="text-xs text-gray-400">
              Verri P Water Inc — Operations Management System
              <br />
              This report was generated on {new Date(data.meta.generatedAt).toLocaleString("en-NG")}
              {data.meta.filters.startDate && ` for period ${data.meta.filters.startDate} to ${data.meta.filters.endDate || "present"}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
