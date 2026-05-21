"use client";

import { useEffect, useState } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import Select from "@/components/form/Select";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const timeframeOptions = [
  { value: "1", label: "Last month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last year" },
  { value: "-1", label: "All time" },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  pos: "POS",
  transfer: "Transfer",
  credit: "Credit",
};

const METHOD_COLORS = [
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
];

export default function PaymentMethodChart() {
  const [series, setSeries] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [months, setMonths] = useState("6");
  const [poll, setPoll] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPoll((p) => p + 1), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ months, entityType: "all" });
    fetch(`/api/dashboard/charts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const methods = (data.salesByPaymentMethod || []) as { _id: string; total: number; count: number }[];
        const sorted = methods.sort((a, b) => b.total - a.total);
        setSeries(sorted.map((m) => m.total));
        setLabels(sorted.map((m) => METHOD_LABELS[m._id] || m._id || "Unknown"));
        setTotal(sorted.reduce((s, m) => s + m.total, 0));
      });
  }, [months, poll]);

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", height: 300, type: "donut", toolbar: { show: false } },
    colors: METHOD_COLORS,
    labels,
    legend: { show: true, position: "bottom", horizontalAlign: "center" },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: { show: true, fontSize: "14px", color: "#6B7280" },
            value: {
              show: true,
              fontSize: "16px",
              fontWeight: 600,
              color: "#111827",
              formatter: (v: string) => `₦${Number(v || 0).toLocaleString()}`,
            },
            total: {
              show: true,
              label: "Total",
              fontSize: "14px",
              color: "#6B7280",
              formatter: () => `₦${total.toLocaleString()}`,
            },
          },
        },
      },
    },
    stroke: { width: 0 },
    responsive: [{ breakpoint: 480, options: { chart: { height: 250 }, legend: { position: "bottom" } } }],
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Sales by Payment Method</h3>
        <div className="w-32">
          <Select options={timeframeOptions} placeholder="Period" value={months} onChange={setMonths} />
        </div>
      </div>
      {series.length > 0 ? (
        <ReactApexChart options={options} series={series} type="donut" height={300} />
      ) : (
        <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
          No payment data for the selected period
        </div>
      )}
    </div>
  );
}
