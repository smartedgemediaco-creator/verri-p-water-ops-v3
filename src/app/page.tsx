"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/signin");
    }
  }, [user, loading, router]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-900">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Verri P Water — redirecting…</p>
    </div>
  );
}