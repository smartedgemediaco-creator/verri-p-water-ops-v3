"use client";

import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import Select from "@/components/form/Select";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const timeframeOptions = [
  { value: "1", label: "Last month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last year" },
  { value: "-1", label: "All time" },
];

interface Option {
  value: string;
  label: string;
}

export default function RevenueChart() {
  const [series, setSeries] = useState<{ name: string; data: number[] }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCosts, setTotalCosts] = useState(0);

  const [months, setMonths] = useState("6");
  const [entityType, setEntityType] = useState("all");
  const [entityId, setEntityId] = useState("");

  const [entityOptions, setEntityOptions] = useState<Option[]>([]);
  const [factories, setFactories] = useState<Option[]>([]);
  const [depots, setDepots] = useState<Option[]>([]);
  const [trucks, setTrucks] = useState<Option[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/factories").then((r) => r.json()),
      fetch("/api/depots").then((r) => r.json()),
      fetch("/api/trucks").then((r) => r.json()),
    ]).then(([f, d, t]) => {
      setFactories(f.map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      setDepots(d.map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
      setTrucks(t.map((x: { _id: string; plateNumber: string }) => ({ value: x._id, label: x.plateNumber })));
    });
  }, []);

  useEffect(() => {
    if (entityType === "factory") setEntityOptions(factories);
    else if (entityType === "depot") setEntityOptions(depots);
    else if (entityType === "truck") setEntityOptions(trucks);
    else setEntityOptions([]);
  }, [entityType, factories, depots, trucks]);

  useEffect(() => {
    const params = new URLSearchParams({ months, entityType });
    if (entityId) params.set("entityId", entityId);

    fetch(`/api/dashboard/charts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const sales = data.monthlySales || [];
        const costs = data.monthlyCosts || [];

        const allMonths = new Map<string, { sales: number; costs: number }>();
        for (const s of sales) {
          const key = `${s._id.year}-${String(s._id.month).padStart(2, "0")}`;
          allMonths.set(key, { sales: s.total, costs: 0 });
        }
        for (const c of costs) {
          const key = `${c._id.year}-${String(c._id.month).padStart(2, "0")}`;
          const existing = allMonths.get(key);
          if (existing) existing.costs = c.total;
          else allMonths.set(key, { sales: 0, costs: c.total });
        }

        const sortedKeys = [...allMonths.keys()].sort();
        const labels = sortedKeys.map((k) => {
          const [y, m] = k.split("-");
          return `${monthNames[parseInt(m) - 1]} ${y}`;
        });

        setCategories(labels);
        setTotalRevenue(sortedKeys.reduce((s, k) => s + allMonths.get(k)!.sales, 0));
        setTotalCosts(sortedKeys.reduce((s, k) => s + allMonths.get(k)!.costs, 0));
        setSeries([
          { name: "Revenue", data: sortedKeys.map((k) => allMonths.get(k)!.sales) },
          { name: "Costs", data: sortedKeys.map((k) => allMonths.get(k)!.costs) },
        ]);
      });
  }, [months, entityType, entityId]);

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", height: 300, type: "bar", toolbar: { show: false } },
    colors: ["#465FFF", "#F04438"],
    plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 4, borderRadiusApplication: "end" } },
    grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    legend: { show: true, position: "top", horizontalAlign: "left" },
    xaxis: { categories, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v: number) => `₦${v.toLocaleString()}` } },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Revenue vs Costs</h3>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Rev: ₦{totalRevenue.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            Cost: ₦{totalCosts.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-32">
            <Select options={timeframeOptions} placeholder="Period" value={months} onChange={setMonths} />
          </div>
          <div className="w-36">
            <Select
              options={[
                { value: "all", label: "All" },
                { value: "factory", label: "Factory" },
                { value: "depot", label: "Depot" },
                { value: "truck", label: "Truck" },
              ]}
              placeholder="Filter by"
              value={entityType}
              onChange={(val) => { setEntityType(val); setEntityId(""); }}
            />
          </div>
          {entityType !== "all" && (
            <div className="w-44">
              <Select
                options={entityOptions}
                placeholder={`Select ${entityType}`}
                value={entityId}
                onChange={setEntityId}
              />
            </div>
          )}
        </div>
      </div>
      {series.length > 0 ? (
        <ReactApexChart options={options} series={series} type="bar" height={300} />
      ) : (
        <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
          No data for the selected filters
        </div>
      )}
    </div>
  );
}
