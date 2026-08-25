import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Production, Sale, Stock, Transfer, Wastage, DashboardReset } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  // Reset baseline: when set, Produced / Sold / Pending Transfer only count
  // activity on or after this date. History is preserved; the counters simply
  // start fresh from the reset point. Available / Wastage are unaffected.
  const resetDoc = await DashboardReset.findOne({ key: "stats" }).lean();
  const resetAt = resetDoc?.resetAt ? new Date(resetDoc.resetAt) : null;

  const url = new URL(req.url);
  const filterLocationType = url.searchParams.get("locationType");
  const filterLocationId = url.searchParams.get("locationId");
  const filterProductId = url.searchParams.get("productId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const isAdmin = user.role === "admin";
  const isFactoryMgr = user.role === "factory-manager";
  const isDepotMgr = user.role === "depot-manager";
  const isDriver = user.role === "driver";

  const prodFilter: Record<string, unknown> = {};
  const saleFilter: Record<string, unknown> = { status: { $ne: "cancelled" } };
  const invFilter: Record<string, unknown> = {};
  const transferFilter: Record<string, unknown> = {};
  const wasteFilter: Record<string, unknown> = {};

  // Role-based scoping
  if (isFactoryMgr && user.factoryId) {
    const oid = new mongoose.Types.ObjectId(user.factoryId);
    prodFilter.factoryId = oid;
    saleFilter.locationType = "factory";
    saleFilter.locationId = oid;
    invFilter.locationType = "factory";
    invFilter.locationId = oid;
    wasteFilter.locationType = "factory";
    wasteFilter.locationId = oid;
  } else if (isDepotMgr && user.depotId) {
    const oid = new mongoose.Types.ObjectId(user.depotId);
    saleFilter.locationType = "depot";
    saleFilter.locationId = oid;
    invFilter.locationType = "depot";
    invFilter.locationId = oid;
    wasteFilter.locationType = "depot";
    wasteFilter.locationId = oid;
    prodFilter._id = null;
  } else if (isDriver && user.truckId) {
    const oid = new mongoose.Types.ObjectId(user.truckId);
    saleFilter.locationType = "truck";
    saleFilter.locationId = oid;
    invFilter.locationType = "truck";
    invFilter.locationId = oid;
    wasteFilter.locationType = "truck";
    wasteFilter.locationId = oid;
    prodFilter._id = null;
  }

  // Specific location filter (admin can drill into any location)
  if (isAdmin && filterLocationType && filterLocationType !== "all") {
    if (filterLocationId) {
      const oid = new mongoose.Types.ObjectId(filterLocationId);
      saleFilter.locationType = filterLocationType;
      saleFilter.locationId = oid;
      invFilter.locationType = filterLocationType;
      invFilter.locationId = oid;
      wasteFilter.locationType = filterLocationType;
      wasteFilter.locationId = oid;
      if (filterLocationType === "factory") {
        prodFilter.factoryId = oid;
      } else {
        prodFilter._id = null;
      }
    } else {
      saleFilter.locationType = filterLocationType;
      invFilter.locationType = filterLocationType;
      wasteFilter.locationType = filterLocationType;
    }
  }

  // Product filter
  if (filterProductId) {
    const pid = new mongoose.Types.ObjectId(filterProductId);
    prodFilter.productId = pid;
    saleFilter.productId = pid;
    invFilter.productId = pid;
    wasteFilter.productId = pid;
    transferFilter.productId = pid;
  }

  // Date range filter
  const dateFilter: Record<string, Date | Record<string, Date>> = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }
  if (Object.keys(dateFilter).length > 0) {
    prodFilter.date = { ...dateFilter };
    saleFilter.date = { ...dateFilter };
    wasteFilter.date = { ...dateFilter };
    transferFilter.date = { ...dateFilter };
  }

  // Apply reset baseline to Produced / Sold / Pending Transfer (not Wastage).
  if (resetAt) {
    const applyReset = (f: Record<string, unknown>) => {
      const existing = (f.date as Record<string, Date> | undefined) || {};
      const merged: Record<string, Date> = { ...existing };
      const cur = existing.$gte ? new Date(existing.$gte) : null;
      if (!cur || resetAt > cur) merged.$gte = resetAt;
      f.date = merged;
    };
    applyReset(prodFilter);
    applyReset(saleFilter);
    applyReset(transferFilter);
  }

  // Transfer filter for specific location
  if (filterLocationId && filterLocationType && filterLocationType !== "all") {
    const oid = new mongoose.Types.ObjectId(filterLocationId);
    if (filterLocationType === "truck") {
      transferFilter.truckId = oid;
    } else {
      transferFilter.$or = [{ fromId: oid }, { toId: oid }];
    }
  }

  const [
    productionAgg, salesAgg, inventoryAgg,
    pendingTransferAgg, inTransitAgg, wastageAgg,
  ] = await Promise.all([
    Production.aggregate([
      { $match: prodFilter },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]),
    Sale.aggregate([
      { $match: saleFilter },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]),
    Stock.aggregate([
      { $match: invFilter },
      {
        $group: {
          _id: null,
          total: { $sum: "$quantity" },
          factoryStock: { $sum: { $cond: [{ $eq: ["$locationType", "factory"] }, "$quantity", 0] } },
          depotStock: { $sum: { $cond: [{ $eq: ["$locationType", "depot"] }, "$quantity", 0] } },
          truckStock: { $sum: { $cond: [{ $eq: ["$locationType", "truck"] }, "$quantity", 0] } },
          locations: { $addToSet: { type: "$locationType", id: "$locationId" } },
        },
      },
    ]),
    Transfer.aggregate([
      { $match: { status: "pending", ...transferFilter } },
      { $group: { _id: null, total: { $sum: "$quantity" }, count: { $sum: 1 } } },
    ]),
    Transfer.aggregate([
      { $match: { status: "in-transit", ...transferFilter } },
      { $group: { _id: null, total: { $sum: "$quantity" }, count: { $sum: 1 } } },
    ]),
    Wastage.aggregate([
      { $match: wasteFilter },
      {
        $group: {
          _id: null,
          total: { $sum: "$quantity" },
          productionLoss: { $sum: { $cond: [{ $eq: ["$source", "production"] }, "$quantity", 0] } },
          transferLoss: { $sum: { $cond: [{ $eq: ["$source", "transfer"] }, "$quantity", 0] } },
          saleLoss: { $sum: { $cond: [{ $eq: ["$source", "sale"] }, "$quantity", 0] } },
          storageLoss: { $sum: { $cond: [{ $eq: ["$source", "storage"] }, "$quantity", 0] } },
          otherLoss: { $sum: { $cond: [{ $eq: ["$source", "other"] }, "$quantity", 0] } },
        },
      },
    ]),
  ]);

  const waste = wastageAgg[0];

  return NextResponse.json({
    totalProduced: productionAgg[0]?.total ?? 0,
    totalSold: salesAgg[0]?.total ?? 0,
    totalAvailable: inventoryAgg[0]?.total ?? 0,
    factoryStock: inventoryAgg[0]?.factoryStock ?? 0,
    depotStock: inventoryAgg[0]?.depotStock ?? 0,
    truckStock: inventoryAgg[0]?.truckStock ?? 0,
    locationCount: inventoryAgg[0]?.locations?.length ?? 0,
    pendingTransferQty: pendingTransferAgg[0]?.total ?? 0,
    pendingTransferCount: pendingTransferAgg[0]?.count ?? 0,
    inTransitQty: inTransitAgg[0]?.total ?? 0,
    inTransitCount: inTransitAgg[0]?.count ?? 0,
    totalWastage: waste?.total ?? 0,
    productionLoss: waste?.productionLoss ?? 0,
    transferLoss: waste?.transferLoss ?? 0,
    saleLoss: waste?.saleLoss ?? 0,
    storageLoss: waste?.storageLoss ?? 0,
    otherLoss: waste?.otherLoss ?? 0,
  });
}
