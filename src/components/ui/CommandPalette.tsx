"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  GridIcon,
  PieChartIcon,
  DollarLineIcon,
  AlertIcon,
  TimeIcon,
  UserIcon,
  PlusIcon,
  CloseIcon,
} from "@/icons";
import {
  FactoryIcon,
  DepotIcon,
  TruckIcon,
  WaterDropIcon,
  TransferIcon,
  BottleIcon,
  ReportIcon,
} from "@/components/icons/EntityIcons";

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: React.ReactNode;
  section: "pages" | "actions";
}

const pageItems: PaletteItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: <GridIcon />, section: "pages", description: "Overview & stats" },
  { id: "factories", label: "All Factories", href: "/factories", icon: <FactoryIcon />, section: "pages", description: "Manage factories" },
  { id: "factories-new", label: "Add Factory", href: "/factories/new", icon: <FactoryIcon />, section: "pages", description: "Register a new factory" },
  { id: "depots", label: "All Depots", href: "/depots", icon: <DepotIcon />, section: "pages", description: "Manage depots" },
  { id: "depots-new", label: "Add Depot", href: "/depots/new", icon: <DepotIcon />, section: "pages", description: "Open a new depot" },
  { id: "trucks", label: "All Vehicles", href: "/trucks", icon: <TruckIcon />, section: "pages", description: "Manage delivery vehicles" },
  { id: "trucks-new", label: "Add Vehicle", href: "/trucks/new", icon: <TruckIcon />, section: "pages", description: "Add a delivery truck/tricycle" },
  { id: "stock", label: "Stock", href: "/stock", icon: <WaterDropIcon />, section: "pages", description: "Stock levels & activity" },
  { id: "transfers", label: "All Transfers", href: "/transfers", icon: <TransferIcon />, section: "pages", description: "Stock transfers" },
  { id: "transfers-new", label: "New Transfer", href: "/transfers/new", icon: <TransferIcon />, section: "pages", description: "Create a stock transfer" },
  { id: "sales", label: "Sales", href: "/sales", icon: <DollarLineIcon />, section: "pages", description: "Sales transactions" },
  { id: "costs", label: "Costs", href: "/costs", icon: <DollarLineIcon />, section: "pages", description: "Operational expenses" },
  { id: "pos-devices", label: "POS Devices", href: "/pos-devices", icon: <GridIcon />, section: "pages", description: "POS terminal registry" },
  { id: "pos-transactions", label: "POS Transactions", href: "/payment-transactions", icon: <GridIcon />, section: "pages", description: "Payment transactions" },
  { id: "analysis", label: "Analysis", href: "/analysis", icon: <PieChartIcon />, section: "pages", description: "Business analysis" },
  { id: "products", label: "All Products", href: "/products", icon: <BottleIcon />, section: "pages", description: "Product catalog" },
  { id: "products-new", label: "Add Product", href: "/products/new", icon: <BottleIcon />, section: "pages", description: "Create a new product" },
  { id: "reports", label: "Reports", href: "/reports", icon: <ReportIcon />, section: "pages", description: "Generate PDF reports" },
  { id: "notifications", label: "Notifications", href: "/notifications", icon: <AlertIcon />, section: "pages", description: "Alerts & notifications" },
  { id: "users", label: "Users", href: "/users", icon: <UserIcon />, section: "pages", description: "User management" },
  { id: "activity", label: "Activity Log", href: "/activity", icon: <TimeIcon />, section: "pages", description: "Audit trail" },
];

const actionItems: PaletteItem[] = [
  { id: "action-factory", label: "New Factory", href: "/factories/new", icon: <PlusIcon />, section: "actions", description: "Register a new factory" },
  { id: "action-depot", label: "New Depot", href: "/depots/new", icon: <PlusIcon />, section: "actions", description: "Open a new depot" },
  { id: "action-truck", label: "New Vehicle", href: "/trucks/new", icon: <PlusIcon />, section: "actions", description: "Add a delivery vehicle" },
  { id: "action-product", label: "New Product", href: "/products/new", icon: <PlusIcon />, section: "actions", description: "Create a product" },
  { id: "action-sale", label: "Record Sale", href: "/sales/new", icon: <PlusIcon />, section: "actions", description: "Log a sale" },
  { id: "action-transfer", label: "New Transfer", href: "/transfers/new", icon: <PlusIcon />, section: "actions", description: "Transfer stock" },
  { id: "action-cost", label: "New Cost", href: "/costs/new", icon: <PlusIcon />, section: "actions", description: "Log expenses" },
  { id: "action-user", label: "New User", href: "/users/new", icon: <PlusIcon />, section: "actions", description: "Add team member" },
];

function filterItems(items: PaletteItem[], query: string): PaletteItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q)
  );
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const roleFilter = useCallback(
    (item: PaletteItem): boolean => {
      if (user?.role === "admin") return true;
      if (item.id === "users" || item.id === "action-user") return false;
      return true;
    },
    [user?.role]
  );

  const allItems = [...pageItems, ...actionItems].filter(roleFilter);
  const filtered = filterItems(allItems, query);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      navigate(filtered[selectedIndex].href);
    }
  };

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  if (!isOpen) return null;

  const pagesSection = filtered.filter((i) => i.section === "pages");
  const actionsSection = filtered.filter((i) => i.section === "actions");

  const getGlobalIndex = (section: PaletteItem[], localIndex: number) =>
    filtered.indexOf(section[localIndex]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
          <svg
            className="ml-5 shrink-0 fill-gray-400 dark:fill-gray-500"
            width="20"
            height="20"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages and actions..."
            className="w-full bg-transparent border-0 py-4 pl-3 pr-4 text-gray-800 dark:text-white/90 placeholder-gray-400 dark:placeholder-white/30 text-base outline-none"
          />
          <button
            onClick={onClose}
            className="mr-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {pagesSection.length > 0 && (
            <div>
              <p className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Pages
              </p>
              {pagesSection.map((item, i) => {
                const globalIdx = getGlobalIndex(pagesSection, i);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                      selectedIndex === globalIdx
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="w-5 h-5 shrink-0 [&>svg]:w-5 [&>svg]:h-5">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.description && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {actionsSection.length > 0 && (
            <div>
              <p className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Quick Actions
              </p>
              {actionsSection.map((item, i) => {
                const globalIdx = getGlobalIndex(actionsSection, i);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                      selectedIndex === globalIdx
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <span className="w-5 h-5 shrink-0 [&>svg]:w-5 [&>svg]:h-5">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.description && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-[10px] font-medium text-gray-500 dark:text-gray-400">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-[10px] font-medium text-gray-500 dark:text-gray-400">↓</kbd>
            <span>navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-[10px] font-medium text-gray-500 dark:text-gray-400">↵</kbd>
            <span>select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-[10px] font-medium text-gray-500 dark:text-gray-400">esc</kbd>
            <span>close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
