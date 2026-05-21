"use client";

import { useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface Step {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  order: number;
  estimate: string;
}

const STEPS: Step[] = [
  { id: "products", title: "Add Your Products", description: "Create the products you sell — sachet water, bottles, dispenser tops. Set names, categories, and unit prices.", href: "/products/new", icon: "📦", order: 1, estimate: "2 min" },
  { id: "factories", title: "Register Factories", description: "Add your production facilities. Each factory needs a name, location, and production capacity.", href: "/factories/new", icon: "🏭", order: 2, estimate: "2 min" },
  { id: "depots", title: "Create Depots", description: "Set up distribution depots where stock is stored before reaching customers.", href: "/depots/new", icon: "🏬", order: 3, estimate: "2 min" },
  { id: "trucks", title: "Register Trucks", description: "Add delivery trucks and assign drivers. Link each truck to a factory or depot.", href: "/trucks/new", icon: "🚚", order: 4, estimate: "3 min" },
  { id: "users", title: "Invite Staff", description: "Create accounts for factory managers, depot managers, and drivers with role-based access.", href: "/users/new", icon: "👤", order: 5, estimate: "3 min" },
  { id: "production", title: "Record Production", description: "Log production batches. This automatically adds stock to the factory's inventory.", href: "/inventory", icon: "⚙️", order: 6, estimate: "2 min" },
  { id: "transfers", title: "Transfer Stock", description: "Move inventory between factories, depots, and trucks. Track each transfer from dispatch to delivery.", href: "/transfers/new", icon: "🔄", order: 7, estimate: "3 min" },
  { id: "sales", title: "Record Sales", description: "Log sales at depots and factories. Stock is deducted automatically. Supports cash, POS, transfer, and credit.", href: "/sales/new", icon: "💰", order: 8, estimate: "2 min" },
  { id: "costs", title: "Track Costs", description: "Record business expenses — fuel, maintenance, salaries. See profitability per location.", href: "/costs", icon: "📉", order: 9, estimate: "2 min" },
  { id: "pos-devices", title: "Register POS Terminals", description: "Add Moniepoint, OPay, or PalmPay terminals. Link to locations so transactions auto-record as sales.", href: "/pos-devices", icon: "💳", order: 10, estimate: "3 min" },
];

const ACCOMPLISHED_KEY = "water-ops-onboarding-done";

export default function OnboardingPage() {
  const [done, setDone] = useState<Set<string>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(ACCOMPLISHED_KEY) || "[]");
      return new Set<string>(Array.isArray(stored) ? stored : []);
    } catch {
      return new Set<string>();
    }
  });

  const toggle = (id: string) => {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDone(next);
    localStorage.setItem(ACCOMPLISHED_KEY, JSON.stringify([...next]));
  };

  const resetProgress = () => {
    setDone(new Set());
    localStorage.removeItem(ACCOMPLISHED_KEY);
  };

  const completed = done.size;
  const total = STEPS.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <PageBreadcrumb pageTitle="Getting Started" />
        <button onClick={resetProgress} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
          Reset progress
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">🚀</span>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">Welcome to Verri P Water Ops</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Follow these steps in order to set up your business. Each step links to the page you need.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex-1">
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {completed}/{total} steps
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {STEPS.map((step, i) => {
          const isDone = done.has(step.id);
          return (
            <div key={step.id} className={`bg-white dark:bg-gray-900 rounded-xl border transition-all ${
              isDone
                ? "border-emerald-200 dark:border-emerald-500/30 opacity-75"
                : "border-gray-200 dark:border-gray-700"
            }`}>
              <div className="p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-lg shrink-0">
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Step {step.order}</span>
                      <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{step.estimate}</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{step.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{step.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Link
                        href={step.href}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors"
                      >
                        Go to page →
                      </Link>
                      <button
                        onClick={() => toggle(step.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          isDone
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        }`}
                      >
                        {isDone ? <>✓ Done</> : <>Mark done</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {i < STEPS.length - 1 && !isDone && (
                <div className="flex justify-center pb-2">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-gray-300 dark:text-gray-600">
                    <path d="M10 13L6 9h8l-4 4z" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completed === total && (
        <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/30 p-6 text-center">
          <span className="text-4xl block mb-3">🎉</span>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">All Set!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Your business is fully configured. Head to the dashboard to monitor operations.
          </p>
          <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
