/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Stock, Transfer, ActivityLog, User } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

function getLocationScope(user: NonNullable<ReturnType<typeof getUserFromRequest>>): Record<string, unknown> {
  if (user.role === "factory-manager" && user.factoryId) {
    return { locationType: "factory", locationId: user.factoryId };
  }
  if (user.role === "depot-manager" && user.depotId) {
    return { locationType: "depot", locationId: user.depotId };
  }
  if (user.role === "driver" && user.truckId) {
    return { locationType: "truck", locationId: user.truckId };
  }
  return {};
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const scope = getLocationScope(user);
  const hasScope = Object.keys(scope).length > 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const activityFilter: Record<string, unknown> = { createdAt: { $gte: sevenDaysAgo } };
  if (hasScope) activityFilter.domainType = scope.locationType;

  const recentActivity = await ActivityLog.find(activityFilter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Resolve user names for activity entries
  const userIds = [...new Set(recentActivity.map((a) => a.userId).filter(Boolean))];
  const userDocs = await User.find({ _id: { $in: userIds } }).select("name email").lean();
  const userNameMap: Record<string, string> = {};
  for (const u of userDocs) {
    userNameMap[u._id.toString()] = (u as any).name ?? (u as any).email ?? "Unknown";
  }

  const stockFilter: Record<string, unknown> = { quantity: { $lte: 0 } };
  if (hasScope) {
    stockFilter.locationType = scope.locationType;
    stockFilter.locationId = (scope as any).locationId;
  }
  const lowStock = await Stock.find(stockFilter)
    .populate("productId")
    .limit(10);

  const transferFilter: Record<string, unknown> = { status: "in-transit" };
  if (user.role === "driver" && user.truckId) {
    transferFilter.truckId = user.truckId;
  } else if (hasScope) {
    transferFilter.$or = [
      { fromType: scope.locationType, fromId: (scope as any).locationId },
      { toType: scope.locationType, toId: (scope as any).locationId },
    ];
  }
  const recentTransfers = await Transfer.find(transferFilter)
    .populate("productId")
    .populate("truckId")
    .limit(5);

  return NextResponse.json({
    recentActivity: recentActivity.map((a) => ({
      _id: a._id,
      action: a.action,
      entity: a.entity,
      description: a.description,
      createdAt: a.createdAt,
      userId: a.userId,
      userName: a.userId ? (userNameMap[a.userId.toString()] ?? null) : null,
    })),
    unreadCount: recentActivity.length,
    lowStock: lowStock.map((i) => ({
      product: (i as any).productId?.name ?? "Unknown",
      quantity: i.quantity,
      locationType: i.locationType,
      locationId: i.locationId,
    })),
    inTransit: recentTransfers.map((t) => ({
      product: (t as any).productId?.name ?? "Unknown",
      truck: (t as any).truckId?.plateNumber ?? "Unknown",
      quantity: t.quantity,
    })),
  });
}
