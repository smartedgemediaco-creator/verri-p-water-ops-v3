"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import {
  AlertIcon,
  DollarLineIcon,
  GridIcon,
  HorizontaLDots,
  UserIcon,
  GroupIcon,
  BoxIcon,
  PieChartIcon,
  TimeIcon,
  CloseIcon,
  PencilIcon,
  ListIcon,
} from "../icons/index";
import {
  FactoryIcon,
  TruckIcon,
  BottleIcon,
  WaterDropIcon,
  TransferIcon,
  ReportIcon,
  DepotIcon,
} from "../components/icons/EntityIcons";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  color?: string;
};

const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Dashboard", path: "/", color: "text-brand-500" },
  { icon: <TruckIcon />, name: "Driver Portal", path: "/driver", color: "text-orange-500" },
  { icon: <FactoryIcon />, name: "Factories", path: "/factories", color: "text-blue-500" },
  { icon: <DepotIcon />, name: "Depots", path: "/depots", color: "text-emerald-500" },
  { icon: <TruckIcon />, name: "Delivery Trucks/Tricycles", path: "/trucks", color: "text-orange-500" },
  { icon: <WaterDropIcon />, name: "Stock", path: "/stock", color: "text-cyan-500" },
  { icon: <ListIcon />, name: "Daily Stock (Factories)", path: "/daily-stock?type=factory", color: "text-blue-500" },
  { icon: <ListIcon />, name: "Daily Stock (Depots)", path: "/daily-stock?type=depot", color: "text-emerald-500" },
  { icon: <BottleIcon />, name: "Products", path: "/products", color: "text-teal-500" },
  { icon: <FactoryIcon />, name: "Production", path: "/production/new", color: "text-blue-500" },
  { icon: <BoxIcon />, name: "Raw Materials", path: "/raw-materials", color: "text-yellow-500" },
  { icon: <UserIcon />, name: "Customers", path: "/customers", color: "text-indigo-500" },
  { icon: <GroupIcon />, name: "Staff", path: "/staff", color: "text-cyan-500" },
  { icon: <TimeIcon />, name: "Attendance", path: "/attendance", color: "text-violet-500" },
  { icon: <DollarLineIcon />, name: "Salary", path: "/payroll", color: "text-emerald-500" },
  { icon: <BoxIcon />, name: "Suppliers", path: "/suppliers", color: "text-yellow-500" },
  { icon: <BoxIcon />, name: "Purchase Orders", path: "/purchase-orders", color: "text-blue-500" },
  { icon: <BoxIcon />, name: "Goods Received", path: "/goods-received-notes", color: "text-teal-500" },
  { icon: <UserIcon />, name: "Users", path: "/users", color: "text-sky-500" },
  { icon: <TransferIcon />, name: "Load Vehicles/Transfers", path: "/truck-loads", color: "text-purple-500" },
  { icon: <DollarLineIcon />, name: "Sales", path: "/sales", color: "text-emerald-500" },
  { icon: <PencilIcon />, name: "Costs / Expenses", path: "/costs", color: "text-red-500" },
  { icon: <CloseIcon />, name: "Leakages", path: "/wastage", color: "text-amber-500" },
  { icon: <AlertIcon />, name: "Scheduled Ops", path: "/scheduled-operations", color: "text-rose-500" },
  { icon: <PieChartIcon />, name: "Business Analysis", path: "/analysis", color: "text-rose-500" },
  { icon: <ReportIcon />, name: "PDF Reports", path: "/reports", color: "text-indigo-500" },
  { icon: <ReportIcon />, name: "Scheduled Reports", path: "/reports/schedule", color: "text-indigo-500" },
  { icon: <TimeIcon />, name: "Audit Trail", path: "/activity", color: "text-violet-500" },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    name: "POS Terminals", path: "/pos-devices", color: "text-gray-500",
  },
  {
    icon: <DollarLineIcon />,
    name: "POS Transactions", path: "/payment-transactions", color: "text-amber-500",
  },
  { icon: <AlertIcon />, name: "Notifications", path: "/notifications", color: "text-yellow-500" },
  { icon: <GridIcon />, name: "Getting Started", path: "/onboarding", color: "text-amber-500" },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z" fill="currentColor" />
      </svg>
    ),
    name: "Settings", path: "/settings", color: "text-gray-500",
  },
];

const roleFilter = (role: string | undefined, item: NavItem): boolean => {
  if (item.name === "Driver Portal") return role === "driver";
  if (role === "admin") return true;
  if (item.name === "Users" || item.name === "POS Terminals" || item.name === "POS Transactions") return false;
  return true;
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, closeMobileSidebar } = useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();

  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data) => setUnreadCount(data.unreadCount ?? 0))
        .catch(() => {});
    };
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, []);

  const filteredItems = navItems.filter((i) => roleFilter(user?.role, i));

  return (
    <aside
      className={`flex flex-col px-5 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        fixed mt-16 top-0 left-0 h-screen
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:sticky lg:top-0 lg:mt-0 lg:h-screen lg:flex-shrink-0 lg:translate-x-0
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" onClick={closeMobileSidebar}>
          <span
            className={`flex items-center gap-2 ${
              !isExpanded && !isHovered ? "justify-center" : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-8 h-8 text-brand-500 flex-shrink-0"
            >
              <path
                d="M12 2C8 8 5 12 5 15.5a7 7 0 0014 0C19 12 16 8 12 2z"
                fill="currentColor"
                opacity="0.3"
              />
              <path
                d="M10 15.5a3 3 0 004 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="text-lg font-bold text-gray-800 dark:text-white whitespace-nowrap">
                Verri P Water
              </span>
            )}
          </span>
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear custom-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Navigation"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              <ul className="flex flex-col gap-1">
                {filteredItems.map((nav) => (
                  <li key={nav.name}>
                    <Link
                      href={nav.path!}
                      onClick={closeMobileSidebar}
                      className={`menu-item group ${
                        isActive(nav.path!)
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={`${
                          isActive(nav.path!)
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        } ${nav.color || ""}`}
                      >
                        {nav.icon}
                      </span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text">{nav.name}</span>
                      )}
                      {nav.name === "Notifications" && unreadCount > 0 && (
                        <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
        {(isExpanded || isHovered || isMobileOpen) && <SidebarWidget />}
      </div>
    </aside>
  );
};

export default AppSidebar;
