import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, Cost } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
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

  const saleMatch: Record<string, any> = { date: { $gte: fromDate } };
  const costMatch: Record<string, any> = { date: { $gte: fromDate } };

  if (entityType !== "all" && entityId) {
    if (entityType === "depot") {
      saleMatch.depotId = entityId;
      costMatch.locationType = "depot";
      costMatch.locationId = entityId;
    } else if (entityType === "factory") {
      costMatch.locationType = "factory";
      costMatch.locationId = entityId;
    }
  }

  if (user.role === "factory-manager" && user.factoryId) {
    costMatch.locationType = "factory";
    costMatch.locationId = user.factoryId;
  } else if (user.role === "depot-manager" && user.depotId) {
    saleMatch.depotId = user.depotId;
    costMatch.locationType = "depot";
    costMatch.locationId = user.depotId;
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

  return NextResponse.json({
    monthlySales,
    monthlyCosts,
    costByCategory,
  });
}
