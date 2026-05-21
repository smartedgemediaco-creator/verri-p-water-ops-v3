/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Inventory, Transfer, ActivityLog, User } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentActivity = await ActivityLog.find({ createdAt: { $gte: sevenDaysAgo } })
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

  const lowStock = await Inventory.find({ quantity: { $lte: 0 } })
    .populate("productId")
    .limit(10);

  const recentTransfers = await Transfer.find({ status: "in-transit" })
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
