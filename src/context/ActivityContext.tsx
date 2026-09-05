"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";

export interface UsageSnapshot {
  hasSales: boolean;
  hasCosts: boolean;
  hasTransfers: boolean;
  hasWastage: boolean;
  hasProduction: boolean;
  hasStock: boolean;
  hasCustomers: boolean;
  hasStaff: boolean;
  hasSuppliers: boolean;
  hasRawMaterials: boolean;
  hasPurchaseOrders: boolean;
  hasAttendance: boolean;
  hasScheduledOps: boolean;
  hasServiceRecords: boolean;
  hasPosDevices: boolean;
  hasDailyProduction: boolean;
  hasCommissioned: boolean;
  hasTruckLoads: boolean;
  hasPaymentTransactions: boolean;
}

const EMPTY_SNAPSHOT: UsageSnapshot = {
  hasSales: false,
  hasCosts: false,
  hasTransfers: false,
  hasWastage: false,
  hasProduction: false,
  hasStock: false,
  hasCustomers: false,
  hasStaff: false,
  hasSuppliers: false,
  hasRawMaterials: false,
  hasPurchaseOrders: false,
  hasAttendance: false,
  hasScheduledOps: false,
  hasServiceRecords: false,
  hasPosDevices: false,
  hasDailyProduction: false,
  hasCommissioned: false,
  hasTruckLoads: false,
  hasPaymentTransactions: false,
};

interface ActivityContextType {
  usage: UsageSnapshot;
  loading: boolean;
  refreshUsage: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/insights/usage");
      const data = await res.json();
      setUsage({ ...EMPTY_SNAPSHOT, ...data });
    } catch {
      // Keep whatever we have; never crash on a network hiccup.
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when the user logs in / route becomes available.
  useEffect(() => {
    if (user) {
      fetchUsage(); // eslint-disable-line react-hooks/set-state-in-effect
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Background refresh every 15 minutes so the assistant's "unused feature"
  // detection stays current without a per-visit API hit.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchUsage, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [user, fetchUsage]);

  return (
    <ActivityContext.Provider value={{ usage, loading, refreshUsage: fetchUsage }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be inside ActivityProvider");
  return ctx;
}
