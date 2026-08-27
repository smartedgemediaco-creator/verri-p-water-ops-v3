import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, DailyStock, SalesLedger, DashboardReset } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "depot-manager" && user.role !== "factory-manager" && user.role !== "driver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const resetDoc = await DashboardReset.findOne({ key: "stats" }).lean();
  const resetAt = resetDoc?.resetAt ? new Date(resetDoc.resetAt) : null;
  const resetDateStr = resetAt ? resetAt.toISOString().slice(0, 10) : null;

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const productId = url.searchParams.get("productId");
  const locationType = url.searchParams.get("locationType");
  const locationId = url.searchParams.get("locationId");

  const match: Record<string, unknown> = {};
  match.status = { $ne: "cancelled" };

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
  // Apply reset baseline if no explicit startDate or reset is later
  let effectiveStart = startDate;
  if (resetAt) {
    const resetStr = resetAt.toISOString().slice(0, 10);
    if (!effectiveStart || resetStr > effectiveStart) effectiveStart = resetStr;
  }
  if (effectiveStart || endDate) {
    match.date = {};
    if (effectiveStart) (match.date as Record<string, unknown>).$gte = new Date(effectiveStart);
    if (endDate) (match.date as Record<string, unknown>).$lte = new Date(endDate + "T23:59:59.999Z");
  }

  // DailyStock and SalesLedger use string dates
  const dailyMatch: Record<string, unknown> = {};
  const ledgerMatch: Record<string, unknown> = {};
  if (user.role === "depot-manager" && user.depotId) {
    dailyMatch.locationType = "depot";
    dailyMatch.locationId = user.depotId;
    ledgerMatch.locationType = "depot";
    ledgerMatch.locationId = user.depotId;
  } else if (user.role === "factory-manager" && user.factoryId) {
    dailyMatch.locationType = "factory";
    dailyMatch.locationId = user.factoryId;
    ledgerMatch.locationType = "factory";
    ledgerMatch.locationId = user.factoryId;
  } else if (user.role === "driver" && user.truckId) {
    ledgerMatch.locationType = "truck";
    ledgerMatch.locationId = user.truckId;
    dailyMatch._id = null; // no daily for trucks
  }
  if (locationType) {
    dailyMatch.locationType = locationType;
    ledgerMatch.locationType = locationType;
  }
  if (locationId) {
    dailyMatch.locationId = locationId;
    ledgerMatch.locationId = locationId;
  }
  let dailyEffectiveStart = startDate;
  let ledgerEffectiveStart = startDate;
  if (resetDateStr) {
    if (!dailyEffectiveStart || resetDateStr > dailyEffectiveStart) dailyEffectiveStart = resetDateStr;
    if (!ledgerEffectiveStart || resetDateStr > ledgerEffectiveStart) ledgerEffectiveStart = resetDateStr;
  }
  if (dailyEffectiveStart || endDate) {
    dailyMatch.date = {};
    if (dailyEffectiveStart) (dailyMatch.date as Record<string, unknown>).$gte = dailyEffectiveStart;
    if (endDate) (dailyMatch.date as Record<string, unknown>).$lte = endDate;
  }
  if (ledgerEffectiveStart || endDate) {
    ledgerMatch.date = {};
    if (ledgerEffectiveStart) (ledgerMatch.date as Record<string, unknown>).$gte = ledgerEffectiveStart;
    if (endDate) (ledgerMatch.date as Record<string, unknown>).$lte = endDate;
  }
  if (productId) {
    // DailyStock is only for sachet product, but keep filter for consistency
    // SalesLedger product filter
    ledgerMatch.productId = productId;
  }

  const [stats, creditUnpaid, dailyAgg, ledgerAgg] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$totalAmount" },
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
    ]),
    Sale.aggregate([
      { $match: { ...match, paymentMethod: "credit", isPaid: false } },
      { $group: { _id: null, totalOutstanding: { $sum: { $subtract: ["$totalAmount", { $ifNull: ["$paidAmount", 0] }] } } } },
    ]),
    // DailyStock: cashDelivered + debts as amount, factorySale+bigTruck etc as quantity
    DailyStock.aggregate([
      { $match: dailyMatch },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $add: ["$cashDelivered", { $ifNull: ["$debts", 0] }] } },
          // For quantity, use totalSold for factory (computed via sale keys in docs is 0, so sum the sale fields directly)
          // Instead, sum bagsProduced is production, not sales. Use a heuristic: sum of sale-like fields
          // For depot: factorySale + bigTruck ; for factory: use stored totalSold if >0 else sum of sale keys
          // Here we approximate by summing cash-related quantity via factorySale+bigTruck for depot and totalSold for factory
          // To keep simple, sum the quantity fields that represent bags sold
          totalQuantity: {
            $sum: {
              $add: [
                { $ifNull: ["$factorySale", 0] },
                { $ifNull: ["$bigTruck", 0] },
                { $ifNull: ["$smallTruck1", 0] },
                { $ifNull: ["$smallTruck2", 0] },
                { $ifNull: ["$depot", 0] },
                { $ifNull: ["$tricycle", 0] },
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    SalesLedger.aggregate([
      { $match: ledgerMatch },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $ifNull: ["$amountSold", 0] } },
          totalQuantity: {
            $sum: {
              $max: [0, { $subtract: [{ $subtract: ["$stockLoaded", "$returnedStock"] }, "$leakages"] }],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const creditOutstandingSale = creditUnpaid[0]?.totalOutstanding ?? 0;
  // Also include SalesLedger/Daily outstanding? For now only Sale credit.

  const result: Record<string, { totalAmount: number; totalQuantity: number; count: number }> = {};
  let grandTotal = 0;
  let totalQuantityAll = 0;
  let totalCount = 0;

  for (const s of stats) {
    const key = s._id || "unknown";
    result[key] = {
      totalAmount: s.totalAmount,
      totalQuantity: s.totalQuantity,
      count: s.count,
    };
    grandTotal += s.totalAmount;
    totalQuantityAll += s.totalQuantity;
    totalCount += s.count;
  }

  // Merge DailyStock as "cash" method for display
  const daily = dailyAgg[0];
  if (daily && (daily.totalAmount > 0 || daily.totalQuantity > 0)) {
    const key = "daily";
    result[key] = {
      totalAmount: daily.totalAmount,
      totalQuantity: daily.totalQuantity,
      count: daily.count,
    };
    grandTotal += daily.totalAmount;
    totalQuantityAll += daily.totalQuantity;
    totalCount += daily.count;
  }

  const ledger = ledgerAgg[0];
  if (ledger && (ledger.totalAmount > 0 || ledger.totalQuantity > 0)) {
    const key = "ledger";
    result[key] = {
      totalAmount: ledger.totalAmount,
      totalQuantity: ledger.totalQuantity,
      count: ledger.count,
    };
    grandTotal += ledger.totalAmount;
    totalQuantityAll += ledger.totalQuantity;
    totalCount += ledger.count;
  }

  return NextResponse.json({
    byMethod: result,
    grandTotal,
    creditOutstanding: creditOutstandingSale,
    totalSales: totalCount,
    totalQuantity: totalQuantityAll,
  });
}
