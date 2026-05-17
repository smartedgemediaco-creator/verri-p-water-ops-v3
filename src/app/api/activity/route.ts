/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ActivityLog } from "@/lib/models/ActivityLog";
import { User } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));
  const skip = (page - 1) * limit;

  const entity = url.searchParams.get("entity");
  const action = url.searchParams.get("action");
  const productId = url.searchParams.get("productId");
  const search = url.searchParams.get("search");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const filter: any = {};

  if (entity) filter.entity = entity;
  if (action) filter.action = action;
  if (productId) filter.productId = productId;
  if (search) filter.description = { $regex: search, $options: "i" };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
  }

  // Role-based domain scoping
  if (user.role === "factory-manager" && user.factoryId) {
    filter.$or = [
      { domainType: "factory", domainId: user.factoryId },
      { domainType: { $exists: false } },
    ];
  } else if (user.role === "depot-manager" && user.depotId) {
    filter.$or = [
      { domainType: "depot", domainId: user.depotId },
      { domainType: { $exists: false } },
    ];
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  const userIds = [...new Set(logs.filter((l) => l.userId).map((l) => l.userId))];
  const users = userIds.length > 0
    ? await User.find({ _id: { $in: userIds } }).select("name email role").lean()
    : [];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const enriched = logs.map((log) => ({
    ...log,
    _id: log._id.toString(),
    entityId: log.entityId.toString(),
    user: log.userId ? userMap.get(log.userId) ?? null : null,
  }));

  return NextResponse.json({
    logs: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
