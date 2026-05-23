"use client";

import { useState, useEffect } from "react";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import BrandedSplash from "@/components/common/BrandedSplash";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  if (loading || !splashDone) {
    return <BrandedSplash />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <Backdrop />
      <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
