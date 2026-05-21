"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

interface ActivityItem {
  _id: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
}

interface AlertItem {
  product: string;
  quantity: number;
  locationType: string;
  locationId: string;
}

interface InTransitItem {
  product: string;
  truck: string;
  quantity: number;
}

interface NotificationData {
  recentActivity: ActivityItem[];
  unreadCount: number;
  lowStock: AlertItem[];
  inTransit: InTransitItem[];
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);
  const [data, setData] = useState<NotificationData | null>(null);

  useEffect(() => {
    const fetchData = () => {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    };
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setNotifying(false);
  };

  const activity = data?.recentActivity ?? [];
  const lowStock = data?.lowStock ?? [];
  const inTransit = data?.inTransit ?? [];
  const totalAlerts = lowStock.length + inTransit.length;
  const showDot = notifying && (activity.length > 0 || totalAlerts > 0);

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${showDot ? "flex" : "hidden"}`}>
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z" fill="currentColor" />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notifications</h5>
          <span className="text-xs text-gray-400">{activity.length + totalAlerts} total</span>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {totalAlerts > 0 && (
            <li className="px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Alerts</p>
              {lowStock.slice(0, 3).map((item, i) => (
                <DropdownItem key={`ls-${i}`} onItemClick={closeDropdown} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/10">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{item.product}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.locationType} &middot; {item.quantity} left</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400">{item.quantity}</span>
                </DropdownItem>
              ))}
              {inTransit.slice(0, 3).map((item, i) => (
                <DropdownItem key={`it-${i}`} onItemClick={closeDropdown} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/10">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{item.product}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Truck: {item.truck}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400">{item.quantity}</span>
                </DropdownItem>
              ))}
            </li>
          )}

          {activity.length > 0 && (
            <li className="px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Recent Activity</p>
              {activity.slice(0, 5).map((item) => (
                <DropdownItem key={item._id} onItemClick={closeDropdown} className="flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5">
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[9px] font-bold uppercase bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    {item.entity.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 dark:text-white/90 leading-snug truncate">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{item.action} &middot; {item.entity}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                </DropdownItem>
              ))}
            </li>
          )}

          {activity.length === 0 && totalAlerts === 0 && (
            <li className="text-center py-8 text-sm text-gray-400">No notifications</li>
          )}
        </ul>

        <Link
          href="/notifications"
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link>
      </Dropdown>
    </div>
  );
}
