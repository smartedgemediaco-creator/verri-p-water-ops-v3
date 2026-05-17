import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import QuickActions from "@/components/common/QuickActions";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Quick Actions - Verri P Water Inc",
  description: "Quick actions and shortcuts",
};

export default function QuickActionsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Quick Actions" />
      <QuickActions />
    </div>
  );
}
