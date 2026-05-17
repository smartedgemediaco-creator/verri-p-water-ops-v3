import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DeliverySchedule from "@/components/calendar/DeliverySchedule";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Delivery Schedule - Verri P Water Inc",
  description: "Delivery and transfer schedule calendar",
};

export default function CalendarPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Delivery Schedule" />
      <DeliverySchedule />
    </div>
  );
}
