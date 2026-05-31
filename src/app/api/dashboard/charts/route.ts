import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, Cost } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get("months") || "6");
    const entityType = searchParams.get("entityType") || "all";
    const entityId = searchParams.get("entityId");

    const now = new Date();
    const fromDate =
      months === -1
        ? new Date(0)
        : new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const saleMatch: Record<string, unknown> = { date: { $gte: fromDate } };
    const costMatch: Record<string, unknown> = { date: { $gte: fromDate } };

    // Apply role-based scope first (default filter)
    if (user.role === "factory-manager" && user.factoryId) {
      const oid = new mongoose.Types.ObjectId(user.factoryId);
      saleMatch.locationType = "factory";
      saleMatch.locationId = oid;
      costMatch.locationType = "factory";
      costMatch.locationId = oid;
    } else if (user.role === "depot-manager" && user.depotId) {
      const oid = new mongoose.Types.ObjectId(user.depotId);
      saleMatch.locationType = "depot";
      saleMatch.locationId = oid;
      costMatch.locationType = "depot";
      costMatch.locationId = oid;
    }

    // Let explicit entity filter override role scope (admin can freely filter)
    if (entityType !== "all") {
      saleMatch.locationType = entityType;
      costMatch.locationType = entityType;
      if (entityId) {
        const oid = new mongoose.Types.ObjectId(entityId);
        saleMatch.locationId = oid;
        costMatch.locationId = oid;
      }
    }

    const monthlySales = await Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlyCosts = await Cost.aggregate([
      { $match: costMatch },
      {
        $group: {
          _id: { year: { $year: "$date" }, month: { $month: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const costByCategory = await Cost.aggregate([
      { $match: costMatch },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]);

    const salesByPaymentMethod = await Sale.aggregate([
      { $match: saleMatch },
      { $group: { _id: "$paymentMethod", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    return NextResponse.json({
      monthlySales,
      monthlyCosts,
      costByCategory,
      salesByPaymentMethod,
    });
  } catch (e: unknown) {
    console.error("Dashboard charts error:", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
