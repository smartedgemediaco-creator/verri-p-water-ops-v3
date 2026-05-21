import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "depot-manager" && user.role !== "factory-manager" && user.role !== "driver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const productId = url.searchParams.get("productId");
  const locationType = url.searchParams.get("locationType");
  const locationId = url.searchParams.get("locationId");

  const match: Record<string, unknown> = {};

  if (user.role === "depot-manager" && user.depotId) {
    match.locationType = "depot";
    match.locationId = new mongoose.Types.ObjectId(user.depotId);
  } else if (user.role === "factory-manager" && user.factoryId) {
    match.locationType = "factory";
    match.locationId = new mongoose.Types.ObjectId(user.factoryId);
  } else if (user.role === "driver" && user.truckId) {
    match.locationType = "truck";
    match.locationId = new mongoose.Types.ObjectId(user.truckId);
  }

  if (productId) match.productId = productId;
  if (locationType) match.locationType = locationType;
  if (locationId) match.locationId = new mongoose.Types.ObjectId(locationId);
  if (startDate || endDate) {
    match.date = {};
    if (startDate) (match.date as Record<string, unknown>).$gte = new Date(startDate);
    if (endDate) (match.date as Record<string, unknown>).$lte = new Date(endDate + "T23:59:59.999Z");
  }

  const stats = await Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$paymentMethod",
        totalAmount: { $sum: "$totalAmount" },
        totalQuantity: { $sum: "$quantity" },
        count: { $sum: 1 },
      },
    },
  ]);

  const creditUnpaid = await Sale.aggregate([
    { $match: { ...match, paymentMethod: "credit", isPaid: false } },
    { $group: { _id: null, totalOutstanding: { $sum: { $subtract: ["$totalAmount", { $ifNull: ["$paidAmount", 0] }] } } } },
  ]);

  const result: Record<string, { totalAmount: number; totalQuantity: number; count: number }> = {};
  let grandTotal = 0;

  for (const s of stats) {
    result[s._id || "unknown"] = {
      totalAmount: s.totalAmount,
      totalQuantity: s.totalQuantity,
      count: s.count,
    };
    grandTotal += s.totalAmount;
  }

  return NextResponse.json({
    byMethod: result,
    grandTotal,
    creditOutstanding: creditUnpaid[0]?.totalOutstanding ?? 0,
    totalSales: stats.reduce((sum, s) => sum + s.count, 0),
  });
}
