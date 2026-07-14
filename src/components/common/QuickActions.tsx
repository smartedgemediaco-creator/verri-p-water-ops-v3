"use client";
import Link from "next/link";
import { FactoryIcon, DepotIcon, TruckIcon, BottleIcon, WaterDropIcon, TransferIcon } from "@/components/icons/EntityIcons";
import { PlusIcon, DollarLineIcon } from "@/icons";

const actions = [
  {
    label: "New Factory",
    href: "/factories/new",
    icon: <FactoryIcon className="w-6 h-6" />,
    desc: "Register a new production factory",
    bg: "bg-blue-50 dark:bg-blue-500/5",
    iconColor: "text-blue-500",
    border: "border-blue-200 dark:border-blue-500/20",
  },
  {
    label: "New Depot",
    href: "/depots/new",
    icon: <DepotIcon className="w-6 h-6" />,
    desc: "Open a new distribution depot",
    bg: "bg-emerald-50 dark:bg-emerald-500/5",
    iconColor: "text-emerald-500",
    border: "border-emerald-200 dark:border-emerald-500/20",
  },
  {
    label: "New Vehicle",
    href: "/trucks/new",
    icon: <TruckIcon className="w-6 h-6" />,
    desc: "Add a delivery truck/tricycle to your fleet",
    bg: "bg-orange-50 dark:bg-orange-500/5",
    iconColor: "text-orange-500",
    border: "border-orange-200 dark:border-orange-500/20",
  },
  {
    label: "New Product",
    href: "/products/new",
    icon: <BottleIcon className="w-6 h-6" />,
    desc: "Add a new water product (sachet, bottle, etc.)",
    bg: "bg-teal-50 dark:bg-teal-500/5",
    iconColor: "text-teal-500",
    border: "border-teal-200 dark:border-teal-500/20",
  },
  {
    label: "Record Sale",
    href: "/sales/new",
    icon: <DollarLineIcon className="w-6 h-6" />,
    desc: "Log a new sales transaction",
    bg: "bg-amber-50 dark:bg-amber-500/5",
    iconColor: "text-amber-500",
    border: "border-amber-200 dark:border-amber-500/20",
  },
  {
    label: "New Transfer",
    href: "/transfers/new",
    icon: <TransferIcon className="w-6 h-6" />,
    desc: "Transfer stock between locations",
    bg: "bg-purple-50 dark:bg-purple-500/5",
    iconColor: "text-purple-500",
    border: "border-purple-200 dark:border-purple-500/20",
  },
  {
    label: "New Cost",
    href: "/costs/new",
    icon: <WaterDropIcon className="w-6 h-6" />,
    desc: "Log operational expenses",
    bg: "bg-red-50 dark:bg-red-500/5",
    iconColor: "text-red-500",
    border: "border-red-200 dark:border-red-500/20",
  },
  {
    label: "New User",
    href: "/users/new",
    icon: <PlusIcon className="w-6 h-6" />,
    desc: "Add a team member to the system",
    bg: "bg-sky-50 dark:bg-sky-500/5",
    iconColor: "text-sky-500",
    border: "border-sky-200 dark:border-sky-500/20",
  },
];

export default function QuickActions() {
  return (
    <div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex items-start gap-3 p-4 rounded-xl border ${action.border} ${action.bg} hover:shadow-md transition-all group`}
            >
              <div className={`flex-shrink-0 mt-0.5 ${action.iconColor}`}>
                {action.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-brand-500 transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {action.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
