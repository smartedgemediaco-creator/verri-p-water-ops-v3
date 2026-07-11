/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ActivityLog } from "@/lib/models/ActivityLog";
import { User, Product, Factory, Depot, Truck } from "@/lib/models";
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
  } else if (user.role === "driver" && user.truckId) {
    filter.$or = [
      { domainType: "truck", domainId: user.truckId },
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

  // Resolve user names
  const userIds = [...new Set(logs.filter((l) => l.userId).map((l) => l.userId))];
  const users = userIds.length > 0
    ? await User.find({ _id: { $in: userIds } }).select("name email role").lean()
    : [];
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  // Resolve product names
  const productIds = [...new Set(logs.filter((l) => l.productId).map((l) => l.productId))];
  const productDocs = productIds.length > 0
    ? await Product.find({ _id: { $in: productIds } }).select("name").lean()
    : [];
  const productMap = new Map(productDocs.map((p) => [p._id.toString(), (p as any).name]));

  // Resolve location names (domainId + domainType → factory/depot/truck name)
  const domainEntries = logs.filter((l) => l.domainType && l.domainId).map((l) => ({ type: l.domainType, id: l.domainId }));
  const factoryIds = [...new Set(domainEntries.filter((e) => e.type === "factory").map((e) => e.id))];
  const depotIds = [...new Set(domainEntries.filter((e) => e.type === "depot").map((e) => e.id))];
  const truckIds = [...new Set(domainEntries.filter((e) => e.type === "truck").map((e) => e.id))];

  const [factoryDocs, depotDocs, truckDocs] = await Promise.all([
    factoryIds.length > 0 ? Factory.find({ _id: { $in: factoryIds } }).select("name").lean() : [],
    depotIds.length > 0 ? Depot.find({ _id: { $in: depotIds } }).select("name").lean() : [],
    truckIds.length > 0 ? Truck.find({ _id: { $in: truckIds } }).select("plateNumber").lean() : [],
  ]);

  const locationMap = new Map<string, string>();
  for (const f of factoryDocs) locationMap.set(`factory:${f._id.toString()}`, (f as any).name);
  for (const d of depotDocs) locationMap.set(`depot:${d._id.toString()}`, (d as any).name);
  for (const t of truckDocs) locationMap.set(`truck:${t._id.toString()}`, (t as any).plateNumber);

  // Resolve entity names for entityId field
  const entityGroups: Record<string, Set<string>> = {};
  for (const log of logs) {
    if (!log.entityId) continue;
    if (!entityGroups[log.entity]) entityGroups[log.entity] = new Set();
    entityGroups[log.entity].add(log.entityId.toString());
  }

  const entityNameMap = new Map<string, string>();
  if (entityGroups["factory"]) {
    const docs = await Factory.find({ _id: { $in: [...entityGroups["factory"]] } }).select("name").lean();
    for (const d of docs) entityNameMap.set(d._id.toString(), (d as any).name);
  }
  if (entityGroups["depot"]) {
    const docs = await Depot.find({ _id: { $in: [...entityGroups["depot"]] } }).select("name").lean();
    for (const d of docs) entityNameMap.set(d._id.toString(), (d as any).name);
  }
  if (entityGroups["truck"]) {
    const docs = await Truck.find({ _id: { $in: [...entityGroups["truck"]] } }).select("plateNumber").lean();
    for (const d of docs) entityNameMap.set(d._id.toString(), (d as any).plateNumber);
  }
  if (entityGroups["product"]) {
    const docs = await Product.find({ _id: { $in: [...entityGroups["product"]] } }).select("name").lean();
    for (const d of docs) entityNameMap.set(d._id.toString(), (d as any).name);
  }
  if (entityGroups["customer"]) {
    const { Customer } = await import("@/lib/models");
    const docs = await Customer.find({ _id: { $in: [...entityGroups["customer"]] } }).select("name").lean();
    for (const d of docs) entityNameMap.set(d._id.toString(), (d as any).name);
  }
  if (entityGroups["staff"] || entityGroups["user"]) {
    const ids = [...(entityGroups["staff"] ?? []), ...(entityGroups["user"] ?? [])];
    const docs = await User.find({ _id: { $in: ids } }).select("name").lean();
    for (const d of docs) entityNameMap.set(d._id.toString(), (d as any).name);
  }

  const enriched = logs.map((log) => {
    const entityName = entityNameMap.get(log.entityId?.toString() ?? "") ?? null;
    const productName = log.productId ? productMap.get(log.productId.toString()) ?? null : null;
    const domainKey = log.domainType && log.domainId ? `${log.domainType}:${log.domainId.toString()}` : null;
    const locationName = domainKey ? locationMap.get(domainKey) ?? null : null;

    return {
      ...log,
      _id: log._id.toString(),
      entityId: log.entityId?.toString() ?? "",
      user: log.userId ? userMap.get(log.userId) ?? null : null,
      entityName,
      productName,
      locationName,
    };
  });

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
