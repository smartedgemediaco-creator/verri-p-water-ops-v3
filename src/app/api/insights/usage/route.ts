import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import {
  Sale,
  Cost,
  Transfer,
  Wastage,
  Production,
  Stock,
  Customer,
  Staff,
  Supplier,
  RawMaterial,
  PurchaseOrder,
  Attendance,
  ScheduledOperation,
  ServiceRecord,
  PosDevice,
  DailyProduction,
  CommissionedStaff,
  TruckLoad,
  PaymentTransaction,
} from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

/**
 * Lightweight "feature usage" snapshot.
 * Returns a single boolean/count per module so the client-side assistant can
 * detect which parts of the system the user has never touched, without
 * fetching full entity lists. Cheap: one empty-query exists/estimatedCount per
 * collection, scoped by role where applicable.
 */
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const isDriver = user.role === "driver";

  const salesFilter: Record<string, unknown> = {};
  const costFilter: Record<string, unknown> = {};
  const transferFilter: Record<string, unknown> = {};
  const wasteFilter: Record<string, unknown> = {};
  const attendanceFilter: Record<string, unknown> = {};
  const dailyProdFilter: Record<string, unknown> = {};
  const truckLoadFilter: Record<string, unknown> = {};

  if (user.role === "factory-manager" && user.factoryId) {
    salesFilter.locationType = "factory";
    salesFilter.locationId = user.factoryId;
    costFilter.locationType = "factory";
    costFilter.locationId = user.factoryId;
    wasteFilter.locationType = "factory";
    wasteFilter.locationId = user.factoryId;
    dailyProdFilter.locationType = "factory";
    dailyProdFilter.locationId = user.factoryId;
  } else if (user.role === "depot-manager" && user.depotId) {
    salesFilter.locationType = "depot";
    salesFilter.locationId = user.depotId;
    costFilter.locationType = "depot";
    costFilter.locationId = user.depotId;
    wasteFilter.locationType = "depot";
    wasteFilter.locationId = user.depotId;
    dailyProdFilter.locationType = "depot";
    dailyProdFilter.locationId = user.depotId;
  } else if (isDriver && user.truckId) {
    const oid = new mongoose.Types.ObjectId(user.truckId);
    salesFilter.locationType = "truck";
    salesFilter.locationId = oid;
    costFilter.locationType = "truck";
    costFilter.locationId = oid;
    wasteFilter.locationType = "truck";
    wasteFilter.locationId = oid;
    truckLoadFilter.truckId = oid;
    dailyProdFilter._id = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = (model: any, filter: Record<string, unknown> = {}, limit = 1) =>
    model.countDocuments(filter).limit(limit).then((n: number) => n > 0);

  const [
    hasSales,
    hasCosts,
    hasTransfers,
    hasWastage,
    hasProduction,
    hasStock,
    hasCustomers,
    hasStaff,
    hasSuppliers,
    hasRawMaterials,
    hasPurchaseOrders,
    hasAttendance,
    hasScheduledOps,
    hasServiceRecords,
    hasPosDevices,
    hasDailyProduction,
    hasCommissioned,
    hasTruckLoads,
    hasPaymentTransactions,
  ] = await Promise.all([
    count(Sale, salesFilter),
    count(Cost, costFilter),
    count(Transfer, transferFilter),
    count(Wastage, wasteFilter),
    count(Production),
    count(Stock),
    count(Customer),
    count(Staff),
    count(Supplier),
    count(RawMaterial),
    count(PurchaseOrder),
    count(Attendance, attendanceFilter),
    count(ScheduledOperation),
    count(ServiceRecord),
    count(PosDevice),
    count(DailyProduction, dailyProdFilter),
    count(CommissionedStaff),
    count(TruckLoad, truckLoadFilter),
    count(PaymentTransaction),
  ]);

  return NextResponse.json({
    hasSales,
    hasCosts,
    hasTransfers,
    hasWastage,
    hasProduction,
    hasStock,
    hasCustomers,
    hasStaff,
    hasSuppliers,
    hasRawMaterials,
    hasPurchaseOrders,
    hasAttendance,
    hasScheduledOps,
    hasServiceRecords,
    hasPosDevices,
    hasDailyProduction,
    hasCommissioned,
    hasTruckLoads,
    hasPaymentTransactions,
  });
}
