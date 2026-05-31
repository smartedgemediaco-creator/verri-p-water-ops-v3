"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import Select from "@/components/form/Select";
import { ArrowRightIcon } from "@/icons";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

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

export default function CostBreakdownChart() {
  const [series, setSeries] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [total, setTotal] = useState(0);

  const [months, setMonths] = useState("6");
  const [entityType, setEntityType] = useState("all");
  const [entityId, setEntityId] = useState("");

  const [factories, setFactories] = useState<Option[]>([]);
  const [depots, setDepots] = useState<Option[]>([]);
  const [trucks, setTrucks] = useState<Option[]>([]);
  const [poll, setPoll] = useState(0);

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
    const id = setInterval(() => setPoll((p) => p + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const entityOpts = entityType === "factory" ? factories : entityType === "depot" ? depots : entityType === "truck" ? trucks : [];

  useEffect(() => {
    const params = new URLSearchParams({ months, entityType });
    if (entityId) params.set("entityId", entityId);

    fetch(`/api/dashboard/charts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const costs = data.costByCategory || [];
        if (costs.length > 0) {
          setLabels(costs.map((c: { _id: string; total: number }) => c._id.charAt(0).toUpperCase() + c._id.slice(1)));
          setSeries(costs.map((c: { _id: string; total: number }) => c.total));
          setTotal(costs.reduce((s: number, c: { _id: string; total: number }) => s + c.total, 0));
        } else {
          setLabels([]);
          setSeries([]);
          setTotal(0);
        }
      });
  }, [months, entityType, entityId, poll]);

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", height: 300, type: "donut" },
    colors: ["#465FFF", "#F79009", "#12B76A", "#F04438", "#7A5AF8", "#98A2B3"],
    labels,
    legend: { show: true, position: "bottom" },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            name: { show: true, offsetY: -8, color: "#98A2B3" },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: 700,
              offsetY: 8,
              color: "#1D2939",
              formatter: () => `₦${total.toLocaleString()}`,
            },
            total: {
              show: true,
              label: "Total Costs",
              fontSize: "12px",
              fontWeight: 400,
              color: "#98A2B3",
              formatter: () => `₦${total.toLocaleString()}`,
            },
          },
        },
      },
    },
    responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { position: "bottom" } } }],
    yaxis: { labels: { formatter: (v: number) => `₦${v.toLocaleString()}` } },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Cost Breakdown</h3>
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
                options={entityOpts}
                placeholder={`Select ${entityType}`}
                value={entityId}
                onChange={setEntityId}
              />
            </div>
          )}
        </div>
      </div>
      {series.length > 0 ? (
        <ReactApexChart options={options} series={series} type="donut" height={300} />
      ) : (
        <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
          No data for the selected filters
        </div>
      )}
      <div className="mt-3 text-center">
        <Link href="/costs" className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
          Expand Cost Breakdown <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
