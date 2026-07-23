"use client";

import { useEffect, useRef, useState } from "react";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DatePicker from "@/components/form/date-picker";
import { formatDate } from "@/lib/dateFormat";
import { downloadTablePdf } from "@/lib/pdf";

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

interface StockItem {
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
  stock: StockItem[];
  sales: SaleItem[];
  costs: CostItem[];
  production: ProductionItem[];
  transfers: TransferItem[];
  activityLogs: ActivityLogItem[];
  totals: {
    sales: number;
    costs: number;
    profit: number;
    stock: number;
    production: number;
    transfers: number;
  };
}

export default function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
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
  const [dateKey, _setDateKey] = useState(0);

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
    const target = pdfRef.current ?? reportRef.current;
    await downloadTablePdf(
      { current: target } as React.RefObject<HTMLElement | null>,
      `verri-p-report-${new Date().toISOString().slice(0, 10)}`,
      setGenerating,
      { title: "Operations Report", subtitle: data?.meta?.filters?.startDate ? `${data.meta.filters.startDate} to ${data.meta.filters.endDate || "present"}` : "", skipHeaderFooter: true }
    );
  };

  const formatCurrency = (n: number) =>
    `₦${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtDate = (d: string) => formatDate(d, "long");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Reports" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Report Filters</h3>
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

      {data && (<>        
        <div ref={reportRef} className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden" style={{ fontFamily: "Outfit, sans-serif" }}>
          <div style={{ height: "6px", background: "linear-gradient(90deg, #465fff 0%, #3641f5 100%)" }} />

          <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid #e4e7ec" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#465fff"><path d="M12 2C8 8 5 12 5 15.5a7 7 0 0014 0C19 12 16 8 12 2z" opacity="0.3"/><path d="M10 15.5a3 3 0 004 0" stroke="#465fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: "#101828", letterSpacing: "-0.02em" }}>Verri P Water Inc</h1>
                <p className="text-sm mt-0.5" style={{ color: "#667085", letterSpacing: "0.02em", textTransform: "uppercase", fontWeight: 500 }}>Operations Report</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs" style={{ color: "#98a2b3" }}>
              <span>
                <span style={{ color: "#667085", fontWeight: 600 }}>Generated:</span>{" "}
                {fmtDate(data.meta.generatedAt)} by {data.meta.generatedBy}
              </span>
              {data.meta.filters.domainType && (
                <span>
                  <span style={{ color: "#667085", fontWeight: 600 }}>Scope:</span>{" "}
                  {(() => {
                    const entities = data.entities?.[`${data.meta.filters.domainType}s` as keyof typeof data.entities] as { _id: string; name?: string; plateNumber?: string }[] | undefined;
                    const match = entities?.find((e) => e._id === data.meta.filters.domainId);
                    return data.meta.filters.domainType === "truck" ? (match as { plateNumber?: string } | undefined)?.plateNumber ?? data.meta.filters.domainType : (match as { name?: string } | undefined)?.name ?? data.meta.filters.domainType;
                  })()}
                </span>
              )}
              {(data.meta.filters.startDate || data.meta.filters.endDate) && (
                <span>
                  <span style={{ color: "#667085", fontWeight: 600 }}>Period:</span>{" "}
                  {data.meta.filters.startDate || "earliest"} — {data.meta.filters.endDate || "present"}
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: "24px 32px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "40px" }}>
              {[
                { label: "Factories", value: data.entities.factories.length, color: "#3b82f6", bg: "#eff6ff" },
                { label: "Depots", value: data.entities.depots.length, color: "#22c55e", bg: "#f0fdf4" },
                { label: "Vehicles", value: data.entities.trucks.length, color: "#a855f7", bg: "#faf5ff" },
                { label: "Products", value: data.entities.products.length, color: "#fb6514", bg: "#fffaf5" },
              ].map((c) => (
                <div key={c.label} style={{ borderRadius: "14px", padding: "20px", textAlign: "center", backgroundColor: c.bg, border: `1px solid ${c.color}30`, flex: "1 1 calc(25% - 16px)", minWidth: "130px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#667085", margin: 0 }}>{c.label}</p>
                  <p style={{ fontSize: "28px", fontWeight: 700, marginTop: "8px", marginBottom: 0, color: c.color }}>{c.value}</p>
                </div>
              ))}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e4e7ec", margin: 0 }} />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {[
                { label: "Total Sales", value: formatCurrency(data.totals.sales), color: "#10b981", bg: "#ecfdf5" },
                { label: "Total Costs", value: formatCurrency(data.totals.costs), color: "#ef4444", bg: "#fef2f2" },
                {
                  label: "Net Profit",
                  value: formatCurrency(data.totals.profit),
                  color: data.totals.profit >= 0 ? "#14b8a6" : "#ef4444",
                  bg: data.totals.profit >= 0 ? "#f0fdfa" : "#fef2f2",
                },
                { label: "Stock", value: `${(data.totals.stock ?? 0).toLocaleString()} units`, color: "#06b6d4", bg: "#ecfeff" },
                { label: "Production Batches", value: (data.totals.production ?? 0).toLocaleString(), color: "#6366f1", bg: "#eef2ff" },
                { label: "Transfers", value: (data.totals.transfers ?? 0).toLocaleString(), color: "#8b5cf6", bg: "#f5f3ff" },
              ].map((c) => (
                <div key={c.label} style={{ borderRadius: "14px", padding: "20px", textAlign: "center", backgroundColor: c.bg, border: `1px solid ${c.color}30`, flex: "1 1 calc(33.33% - 16px)", minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#667085", margin: 0 }}>{c.label}</p>
                  <p style={{ fontSize: "22px", fontWeight: 700, marginTop: "8px", marginBottom: 0, color: c.color }}>{c.value}</p>
                </div>
              ))}
            </div>

            {(data.entities.factories.length > 0 || data.entities.depots.length > 0 || data.stock.length > 0 || data.sales.length > 0 || data.costs.length > 0 || data.production.length > 0 || data.transfers.length > 0 || data.activityLogs.length > 0) && (
              <hr style={{ border: "none", borderTop: "1px solid #e4e7ec", marginBottom: "40px" }} />
            )}

            {data.entities.factories.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "#101828" }}>Factories</h2>
                  <span className="text-xs ml-auto" style={{ color: "#98a2b3" }}>{data.entities.factories.length} registered</span>
                </div>
                <table className="w-full text-sm border-collapse" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Name</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Location</th>
                      <th className="py-3 px-4 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Capacity</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.entities.factories.map((f: Entity) => (
                      <tr key={f._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td className="py-3 px-4 font-medium" style={{ color: "#344054" }}>{f.name}</td>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{f.location}</td>
                        <td className="py-3 px-4 text-right" style={{ color: "#667085" }}>{(f.capacity ?? 0).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: f.isActive ? "#ecfdf5" : "#fef2f2", color: f.isActive ? "#059669" : "#dc2626" }}>
                            {f.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.entities.depots.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "#101828" }}>Depots</h2>
                  <span className="text-xs ml-auto" style={{ color: "#98a2b3" }}>{data.entities.depots.length} registered</span>
                </div>
                <table className="w-full text-sm border-collapse" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Name</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Location</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.entities.depots.map((d: Entity) => (
                        <tr key={d._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                          <td className="py-3 px-4 font-medium" style={{ color: "#344054" }}>{d.name}</td>
                          <td className="py-3 px-4" style={{ color: "#667085" }}>{d.location}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: d.isActive ? "#ecfdf5" : "#fef2f2", color: d.isActive ? "#059669" : "#dc2626" }}>
                              {d.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.stock.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "#101828" }}>Stock</h2>
                  <span className="text-xs ml-auto" style={{ color: "#98a2b3" }}>{(data.totals.stock ?? 0).toLocaleString()} total units</span>
                </div>
                <table className="w-full text-sm border-collapse" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Product</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Location</th>
                      <th className="py-3 px-4 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.stock.map((i: StockItem, idx: number) => (
                      <tr key={idx} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td className="py-3 px-4 font-medium" style={{ color: "#344054" }}>{i.product}</td>
                        <td className="py-3 px-4 capitalize" style={{ color: "#667085" }}>{i.locationType}</td>
                        <td className="py-3 px-4 text-right" style={{ color: "#667085" }}>{(i.quantity ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.sales.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "#101828" }}>Sales</h2>
                  <span className="text-xs ml-auto" style={{ color: "#98a2b3" }}>{data.sales.length} records — {formatCurrency(data.totals.sales)} total</span>
                </div>
                <table className="w-full text-sm border-collapse" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Date</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Depot</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Product</th>
                      <th className="py-3 px-4 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Qty</th>
                      <th className="py-3 px-4 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Amount</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Customer</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.sales.map((s: SaleItem) => (
                      <tr key={s._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{fmtDate(s.date)}</td>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{s.depot}</td>
                        <td className="py-3 px-4 font-medium" style={{ color: "#344054" }}>{s.product}</td>
                        <td className="py-3 px-4 text-right" style={{ color: "#667085" }}>{(s.quantity ?? 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-medium" style={{ color: "#344054" }}>{formatCurrency(s.totalAmount)}</td>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{s.customerName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.costs.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "#101828" }}>Costs</h2>
                  <span className="text-xs ml-auto" style={{ color: "#98a2b3" }}>{data.costs.length} records — {formatCurrency(data.totals.costs)} total</span>
                </div>
                <table className="w-full text-sm border-collapse" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Date</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Category</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Description</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Location</th>
                      <th className="py-3 px-4 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.costs.map((c: CostItem) => (
                      <tr key={c._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{fmtDate(c.date)}</td>
                        <td className="py-3 px-4 capitalize" style={{ color: "#667085" }}>{c.category}</td>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{c.description || "—"}</td>
                        <td className="py-3 px-4 capitalize" style={{ color: "#667085" }}>{c.locationType}</td>
                        <td className="py-3 px-4 text-right font-medium" style={{ color: "#dc2626" }}>{formatCurrency(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.production.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "#101828" }}>Production</h2>
                  <span className="text-xs ml-auto" style={{ color: "#98a2b3" }}>{data.production.length} batches</span>
                </div>
                <table className="w-full text-sm border-collapse" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Date</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Factory</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Product</th>
                      <th className="py-3 px-4 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.production.map((p: ProductionItem) => (
                      <tr key={p._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{fmtDate(p.date)}</td>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{p.factory}</td>
                        <td className="py-3 px-4 font-medium" style={{ color: "#344054" }}>{p.product}</td>
                        <td className="py-3 px-4 text-right" style={{ color: "#667085" }}>{(p.quantity ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.transfers.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "#101828" }}>Transfers</h2>
                  <span className="text-xs ml-auto" style={{ color: "#98a2b3" }}>{data.transfers.length} records</span>
                </div>
                <table className="w-full text-sm border-collapse" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Date</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>From</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>To</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Product</th>
                      <th className="py-3 px-4 text-right font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Qty</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Truck</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.transfers.map((t: TransferItem) => (
                      <tr key={t._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{fmtDate(t.date)}</td>
                        <td className="py-3 px-4 capitalize" style={{ color: "#667085" }}>{t.fromType}</td>
                        <td className="py-3 px-4 capitalize" style={{ color: "#667085" }}>{t.toType}</td>
                        <td className="py-3 px-4 font-medium" style={{ color: "#344054" }}>{t.product}</td>
                        <td className="py-3 px-4 text-right" style={{ color: "#667085" }}>{(t.quantity ?? 0).toLocaleString()}</td>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{t.truck}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                            backgroundColor: t.status === "delivered" ? "#ecfdf5" : t.status === "in-transit" ? "#eff6ff" : t.status === "pending" ? "#fffbeb" : "#fef2f2",
                            color: t.status === "delivered" ? "#059669" : t.status === "in-transit" ? "#2563eb" : t.status === "pending" ? "#d97706" : "#dc2626",
                          }}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.activityLogs.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 className="text-lg font-semibold" style={{ color: "#101828" }}>Recent Activity</h2>
                  <span className="text-xs ml-auto" style={{ color: "#98a2b3" }}>{data.activityLogs.length} entries</span>
                </div>
                <table className="w-full text-sm border-collapse" style={{ borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Date</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Action</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Entity</th>
                      <th className="py-3 px-4 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#667085" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.activityLogs.map((a: ActivityLogItem) => (
                      <tr key={a._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{fmtDate(a.createdAt)}</td>
                        <td className="py-3 px-4 capitalize">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                            backgroundColor: a.action === "created" ? "#ecfdf5" : a.action === "updated" ? "#fffbeb" : a.action === "deleted" ? "#fef2f2" : "#f2f4f7",
                            color: a.action === "created" ? "#059669" : a.action === "updated" ? "#d97706" : a.action === "deleted" ? "#dc2626" : "#667085",
                          }}>
                            {a.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize" style={{ color: "#667085" }}>{a.entity}</td>
                        <td className="py-3 px-4" style={{ color: "#667085" }}>{a.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>

          <div style={{ borderTop: "1px solid #e4e7ec", padding: "16px 32px", textAlign: "center" }}>
            <p className="text-xs" style={{ color: "#98a2b3" }}>
              <span style={{ fontWeight: 600, color: "#667085" }}>Verri P Water Inc</span> — Operations Management System
              <br />
              Generated {new Date(data.meta.generatedAt).toLocaleString("en-NG")}
              {data.meta.filters.startDate && ` for period ${data.meta.filters.startDate} to ${data.meta.filters.endDate || "present"}`}
            </p>
            <div style={{ marginTop: "8px", height: "3px", background: "linear-gradient(90deg, #465fff 0%, #3641f5 100%)", borderRadius: "2px", maxWidth: "240px", marginLeft: "auto", marginRight: "auto" }} />
          </div>
        </div>

        <div ref={pdfRef} style={{
          position: "absolute", left: "-9999px", top: 0, width: "1200px",
          fontFamily: "Outfit, sans-serif", backgroundColor: "#ffffff",
        }}>
          <div style={{ height: "6px", background: "linear-gradient(90deg, #465fff 0%, #3641f5 100%)" }} />

          <div style={{ padding: "32px 32px 24px", borderBottom: "1px solid #e4e7ec" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#465fff"><path d="M12 2C8 8 5 12 5 15.5a7 7 0 0014 0C19 12 16 8 12 2z" opacity="0.3"/><path d="M10 15.5a3 3 0 004 0" stroke="#465fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#101828", letterSpacing: "-0.02em", margin: 0 }}>Verri P Water Inc</h1>
                <p style={{ fontSize: "14px", margin: "2px 0 0", color: "#667085", textTransform: "uppercase", letterSpacing: "0.02em", fontWeight: 500 }}>Operations Report</p>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 32px", fontSize: "12px", color: "#98a2b3" }}>
              <span><span style={{ color: "#667085", fontWeight: 600 }}>Generated:</span> {fmtDate(data.meta.generatedAt)} by {data.meta.generatedBy}</span>
              {data.meta.filters.domainType && <span><span style={{ color: "#667085", fontWeight: 600 }}>Scope:</span> {(() => {
                const entities = data.entities?.[`${data.meta.filters.domainType}s` as keyof typeof data.entities] as { _id: string; name?: string; plateNumber?: string }[] | undefined;
                const match = entities?.find((e) => e._id === data.meta.filters.domainId);
                return data.meta.filters.domainType === "truck" ? (match as { plateNumber?: string } | undefined)?.plateNumber ?? data.meta.filters.domainType : (match as { name?: string } | undefined)?.name ?? data.meta.filters.domainType;
              })()}</span>}
              {(data.meta.filters.startDate || data.meta.filters.endDate) && (
                <span><span style={{ color: "#667085", fontWeight: 600 }}>Period:</span> {data.meta.filters.startDate || "earliest"} — {data.meta.filters.endDate || "present"}</span>
              )}
            </div>
          </div>

          <div style={{ padding: "24px 32px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "40px" }}>
              {[
                { label: "Factories", value: data.entities.factories.length, color: "#3b82f6", bg: "#eff6ff" },
                { label: "Depots", value: data.entities.depots.length, color: "#22c55e", bg: "#f0fdf4" },
                { label: "Vehicles", value: data.entities.trucks.length, color: "#a855f7", bg: "#faf5ff" },
                { label: "Products", value: data.entities.products.length, color: "#fb6514", bg: "#fffaf5" },
              ].map((c) => (
                <div key={c.label} style={{ borderRadius: "14px", padding: "20px", textAlign: "center", backgroundColor: c.bg, border: `1px solid ${c.color}30`, flex: "1 1 calc(25% - 16px)", minWidth: "130px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#667085", margin: 0 }}>{c.label}</p>
                  <p style={{ fontSize: "28px", fontWeight: 700, marginTop: "8px", marginBottom: 0, color: c.color }}>{c.value}</p>
                </div>
              ))}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e4e7ec", margin: 0 }} />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {[
                { label: "Total Sales", value: formatCurrency(data.totals.sales), color: "#10b981", bg: "#ecfdf5" },
                { label: "Total Costs", value: formatCurrency(data.totals.costs), color: "#ef4444", bg: "#fef2f2" },
                {
                  label: "Net Profit",
                  value: formatCurrency(data.totals.profit),
                  color: data.totals.profit >= 0 ? "#14b8a6" : "#ef4444",
                  bg: data.totals.profit >= 0 ? "#f0fdfa" : "#fef2f2",
                },
                { label: "Stock", value: `${(data.totals.stock ?? 0).toLocaleString()} units`, color: "#06b6d4", bg: "#ecfeff" },
                { label: "Production Batches", value: (data.totals.production ?? 0).toLocaleString(), color: "#6366f1", bg: "#eef2ff" },
                { label: "Transfers", value: (data.totals.transfers ?? 0).toLocaleString(), color: "#8b5cf6", bg: "#f5f3ff" },
              ].map((c) => (
                <div key={c.label} style={{ borderRadius: "14px", padding: "20px", textAlign: "center", backgroundColor: c.bg, border: `1px solid ${c.color}30`, flex: "1 1 calc(33.33% - 16px)", minWidth: "150px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#667085", margin: 0 }}>{c.label}</p>
                  <p style={{ fontSize: "22px", fontWeight: 700, marginTop: "8px", marginBottom: 0, color: c.color }}>{c.value}</p>
                </div>
              ))}
            </div>

            {(data.entities.factories.length > 0 || data.entities.depots.length > 0 || data.stock.length > 0 || data.sales.length > 0 || data.costs.length > 0 || data.production.length > 0 || data.transfers.length > 0 || data.activityLogs.length > 0) && (
              <hr style={{ border: "none", borderTop: "1px solid #e4e7ec", marginBottom: "40px" }} />
            )}

            {data.entities.factories.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#101828", margin: 0 }}>Factories</h2>
                  <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{data.entities.factories.length} registered</span>
                </div>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Name</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Location</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Capacity</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.entities.factories.map((f: Entity) => (
                      <tr key={f._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: "#344054" }}>{f.name}</td>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{f.location}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#667085" }}>{(f.capacity ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: 500, backgroundColor: f.isActive ? "#ecfdf5" : "#fef2f2", color: f.isActive ? "#059669" : "#dc2626" }}>{f.isActive ? "Active" : "Inactive"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.entities.depots.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#101828", margin: 0 }}>Depots</h2>
                  <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{data.entities.depots.length} registered</span>
                </div>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Name</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Location</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.entities.depots.map((d: Entity) => (
                      <tr key={d._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: "#344054" }}>{d.name}</td>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{d.location}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: 500, backgroundColor: d.isActive ? "#ecfdf5" : "#fef2f2", color: d.isActive ? "#059669" : "#dc2626" }}>{d.isActive ? "Active" : "Inactive"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.stock.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#101828", margin: 0 }}>Stock</h2>
                  <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{(data.totals.stock ?? 0).toLocaleString()} total units</span>
                </div>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Product</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Location</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.stock.map((i: StockItem, idx: number) => (
                      <tr key={idx} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: "#344054" }}>{i.product}</td>
                        <td style={{ padding: "12px 16px", textTransform: "capitalize", color: "#667085" }}>{i.locationType}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#667085" }}>{(i.quantity ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.sales.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#101828", margin: 0 }}>Sales</h2>
                  <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{data.sales.length} records — {formatCurrency(data.totals.sales)} total</span>
                </div>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Date</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Depot</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Product</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Qty</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Amount</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Customer</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.sales.map((s: SaleItem) => (
                      <tr key={s._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{fmtDate(s.date)}</td>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{s.depot}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: "#344054" }}>{s.product}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#667085" }}>{(s.quantity ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500, color: "#344054" }}>{formatCurrency(s.totalAmount)}</td>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{s.customerName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.costs.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#101828", margin: 0 }}>Costs</h2>
                  <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{data.costs.length} records — {formatCurrency(data.totals.costs)} total</span>
                </div>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Date</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Category</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Description</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Location</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.costs.map((c: CostItem) => (
                      <tr key={c._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{fmtDate(c.date)}</td>
                        <td style={{ padding: "12px 16px", textTransform: "capitalize", color: "#667085" }}>{c.category}</td>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{c.description || "—"}</td>
                        <td style={{ padding: "12px 16px", textTransform: "capitalize", color: "#667085" }}>{c.locationType}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500, color: "#dc2626" }}>{formatCurrency(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.production.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#101828", margin: 0 }}>Production</h2>
                  <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{data.production.length} batches</span>
                </div>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Date</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Factory</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Product</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.production.map((p: ProductionItem) => (
                      <tr key={p._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{fmtDate(p.date)}</td>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{p.factory}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: "#344054" }}>{p.product}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#667085" }}>{(p.quantity ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.transfers.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#101828", margin: 0 }}>Transfers</h2>
                  <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{data.transfers.length} records</span>
                </div>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Date</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>From</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>To</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Product</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Qty</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Truck</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.transfers.map((t: TransferItem) => (
                      <tr key={t._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{fmtDate(t.date)}</td>
                        <td style={{ padding: "12px 16px", textTransform: "capitalize", color: "#667085" }}>{t.fromType}</td>
                        <td style={{ padding: "12px 16px", textTransform: "capitalize", color: "#667085" }}>{t.toType}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: "#344054" }}>{t.product}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#667085" }}>{(t.quantity ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{t.truck}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: 500,
                            backgroundColor: t.status === "delivered" ? "#ecfdf5" : t.status === "in-transit" ? "#eff6ff" : t.status === "pending" ? "#fffbeb" : "#fef2f2",
                            color: t.status === "delivered" ? "#059669" : t.status === "in-transit" ? "#2563eb" : t.status === "pending" ? "#d97706" : "#dc2626",
                          }}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {data.activityLogs.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: "5px", height: "24px", backgroundColor: "#465fff", borderRadius: "3px" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#101828", margin: 0 }}>Recent Activity</h2>
                  <span style={{ fontSize: "12px", marginLeft: "auto", color: "#98a2b3" }}>{data.activityLogs.length} entries</span>
                </div>
                <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #d0d5dd" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#eef1f5" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Date</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Action</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Entity</th>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#667085" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: "#ffffff" }}>
                    {data.activityLogs.map((a: ActivityLogItem) => (
                      <tr key={a._id} style={{ borderTop: "1px solid #f2f4f7" }}>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{fmtDate(a.createdAt)}</td>
                        <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: 500,
                            backgroundColor: a.action === "created" ? "#ecfdf5" : a.action === "updated" ? "#fffbeb" : a.action === "deleted" ? "#fef2f2" : "#f2f4f7",
                            color: a.action === "created" ? "#059669" : a.action === "updated" ? "#d97706" : a.action === "deleted" ? "#dc2626" : "#667085",
                          }}>{a.action}</span>
                        </td>
                        <td style={{ padding: "12px 16px", textTransform: "capitalize", color: "#667085" }}>{a.entity}</td>
                        <td style={{ padding: "12px 16px", color: "#667085" }}>{a.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>

          <div style={{ borderTop: "1px solid #e4e7ec", padding: "16px 32px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", color: "#98a2b3", margin: 0 }}>
              <span style={{ fontWeight: 600, color: "#667085" }}>Verri P Water Inc</span> — Operations Management System
              <br />
              Generated {new Date(data.meta.generatedAt).toLocaleString("en-NG")}
              {data.meta.filters.startDate && ` for period ${data.meta.filters.startDate} to ${data.meta.filters.endDate || "present"}`}
            </p>
            <div style={{ marginTop: "8px", height: "3px", background: "linear-gradient(90deg, #465fff 0%, #3641f5 100%)", borderRadius: "2px", maxWidth: "240px", marginLeft: "auto", marginRight: "auto" }} />
          </div>
        </div>
      </>)}
    </div>
  );
}
