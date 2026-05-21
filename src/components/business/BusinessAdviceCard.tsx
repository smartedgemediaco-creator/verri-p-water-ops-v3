"use client";

import { useEffect, useState } from "react";
import {
  LightbulbIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "lucide-react";

interface Advice {
  type: "positive" | "warning" | "insight";
  icon: React.ReactNode;
  title: string;
  message: string;
}

export default function BusinessAdviceCard() {
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analysis").then((r) => r.json()),
      fetch("/api/dashboard/charts").then((r) => r.json()),
      fetch("/api/notifications").then((r) => r.json()),
    ])
      .then(([analysis, charts, notifications]) => {
        const messages: Advice[] = [];

        const fArr = analysis.factories || [];
        const dArr = analysis.depots || [];
        const tArr = analysis.trucks || [];
        const inventory = fArr.reduce((s: number, f: { inventory: number }) => s + f.inventory, 0) + dArr.reduce((s: number, d: { inventory: number }) => s + d.inventory, 0) + tArr.reduce((s: number, t: { inventory: number }) => s + (t.inventory ?? 0), 0);
        const sales = fArr.reduce((s: number, f: { sales: number }) => s + f.sales, 0) + dArr.reduce((s: number, d: { sales: number }) => s + d.sales, 0);
        const costs = fArr.reduce((s: number, f: { costs: number }) => s + f.costs, 0) + dArr.reduce((s: number, d: { costs: number }) => s + d.costs, 0);
        const profit = sales - costs;
        const activeTransfers = tArr.reduce((s: number, t: { activeTransfers: number }) => s + (t.activeTransfers ?? 0), 0);
        const factories = fArr.length;
        const depots = dArr.length;

        const monthlySales = charts.monthlySales || [];
        const salesTrend =
          monthlySales.length >= 2
            ? monthlySales[monthlySales.length - 1].total -
              monthlySales[monthlySales.length - 2].total
            : 0;

        const lowStockAlerts = (notifications.notifications || []).filter(
          (n: any) => n.type === "low-stock"
        );

        if (profit < 0) {
          messages.push({
            type: "warning",
            icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />,
            title: "Loss Warning",
            message: `Your costs (₦${costs.toLocaleString()}) exceed sales (₦${sales.toLocaleString()}). Consider reviewing operational expenses or adjusting pricing.`,
          });
        } else if (profit > 0 && profit < sales * 0.15) {
          messages.push({
            type: "warning",
            icon: <TrendingUpIcon className="w-5 h-5 text-amber-500" />,
            title: "Thin Margins",
            message: `Profit margin is ${((profit / sales) * 100).toFixed(1)}%. Consider reducing costs or increasing prices to improve profitability.`,
          });
        } else if (profit > 0) {
          messages.push({
            type: "positive",
            icon: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />,
            title: "Healthy Profit",
            message: `Profit margin is ${((profit / sales) * 100).toFixed(1)}%. Your operations are running efficiently. Keep up the good work!`,
          });
        }

        if (salesTrend > 0) {
          messages.push({
            type: "positive",
            icon: <TrendingUpIcon className="w-5 h-5 text-emerald-500" />,
            title: "Sales Rising",
            message: `Sales grew by ₦${salesTrend.toLocaleString()} this month. Demand is increasing — ensure adequate inventory to fulfill orders.`,
          });
        } else if (salesTrend < 0) {
          messages.push({
            type: "warning",
            icon: <TrendingDownIcon className="w-5 h-5 text-red-500" />,
            title: "Sales Dropping",
            message: `Sales declined by ₦${Math.abs(salesTrend).toLocaleString()} this month. Consider promotions, expanding routes, or checking product availability.`,
          });
        }

        if (lowStockAlerts.length > 0) {
          messages.push({
            type: "warning",
            icon: <AlertTriangleIcon className="w-5 h-5 text-orange-500" />,
            title: "Low Stock Alert",
            message: `${lowStockAlerts.length} product(s) are running low on inventory. Schedule production or restocking to avoid stockouts.`,
          });
        }

        if (inventory > 0 && sales > 0) {
          const turnoverRate = sales / inventory;
          if (turnoverRate < 0.5) {
            messages.push({
              type: "insight",
              icon: <LightbulbIcon className="w-5 h-5 text-yellow-500" />,
              title: "Inventory Efficiency",
              message: `Inventory turnover is low (${turnoverRate.toFixed(2)}x). You may be holding excess stock. Review reorder quantities.`,
            });
          } else if (turnoverRate > 5) {
            messages.push({
              type: "insight",
              icon: <LightbulbIcon className="w-5 h-5 text-yellow-500" />,
              title: "High Inventory Turnover",
              message: `Products are moving fast (${turnoverRate.toFixed(1)}x turnover). Consider increasing production to meet demand.`,
            });
          }
        }

        if (activeTransfers > 0) {
          messages.push({
            type: "insight",
            icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />,
            title: "Active Transfers",
            message: `${activeTransfers} transfer(s) are in progress. Monitor delivery status and ensure timely receipt at destination depots.`,
          });
        }

        if (factories > 0 && depots > 0 && inventory === 0) {
          messages.push({
            type: "warning",
            icon: <AlertTriangleIcon className="w-5 h-5 text-red-500" />,
            title: "Empty Inventory",
            message: `You have ${factories} factory(ies) and ${depots} depot(s) but no inventory recorded. Start by logging initial stock levels.`,
          });
        }

        if (messages.length === 0) {
          messages.push({
            type: "insight",
            icon: <LightbulbIcon className="w-5 h-5 text-blue-500" />,
            title: "Getting Started",
            message: "Add some products, record inventory, and log sales to receive actionable business insights here.",
          });
        }

        setAdvice(messages.slice(0, 4));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 animate-pulse">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!advice.length) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-4">
        <LightbulbIcon className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Business Advice
        </h3>
      </div>
      <div className="space-y-3">
        {advice.map((item, idx) => (
          <div
            key={idx}
            className={`flex gap-3 p-3 rounded-lg ${
              item.type === "warning"
                ? "bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10"
                : item.type === "positive"
                ? "bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10"
                : "bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {item.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                {item.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
