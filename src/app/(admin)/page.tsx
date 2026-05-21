"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminDashboardPage from "../admin-dashboard-page";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role === "driver") {
      router.replace("/driver");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <img src="/images/logo/auth-logo.svg" alt="" className="w-12 h-12 opacity-60" />
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (user?.role === "driver") return null;

  return <AdminDashboardPage />;
}
