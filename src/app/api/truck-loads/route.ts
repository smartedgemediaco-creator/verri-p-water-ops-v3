import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { TruckLoad, Stock, Factory, Depot, Truck, Customer } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import mongoose from "mongoose";

async function resolveLocationName(type: string, id: string): Promise<string | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  if (type === "factory") {
    const f = await Factory.findById(id).select("name").lean();
    return (f as { name?: string } | null)?.name ?? null;
  }
  if (type === "depot") {
    const d = await Depot.findById(id).select("name").lean();
    return (d as { name?: string } | null)?.name ?? null;
  }
  if (type === "truck") {
    const t = await Truck.findById(id).select("plateNumber").lean();
    return t ? `Truck: ${(t as { plateNumber?: string }).plateNumber}` : null;
  }
  if (type === "customer") {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return "Customer (Outside Sale)";
    const c = await Customer.findById(id).select("name").lean();
    return c ? `Customer: ${(c as { name?: string } | null)?.name}` : "Customer (Outside Sale)";
  }
  return null;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const truckId = searchParams.get("truckId");
  const statusFilter = searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (user.role === "driver" && user.truckId) {
    filter.truckId = user.truckId;
  } else if (truckId) {
    filter.truckId = truckId;
  }
  if (statusFilter) {
    const statuses = statusFilter.split(",");
    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }

  const loads = await TruckLoad.find(filter)
    .populate("productId")
    .populate("truckId")
    .sort({ date: -1 });

  const enriched = await Promise.all(
    loads.map(async (t) => {
      const obj = t.toObject();
      obj.fromName = await resolveLocationName(obj.fromType, obj.fromId);
      obj.toName = await resolveLocationName(obj.toType, obj.toId);
      return obj;
    })
  );
  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const body = await req.json();
    if (body.date && typeof body.date === "string") {
      const parts = body.date.split("/");
      if (parts.length === 3) body.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (user.role === "driver" && user.truckId) {
      body.truckId = user.truckId;
    }
    if (body.toType === "customer" && !body.toId) {
      delete body.toId;
    } else if (body.toType !== "customer" && !body.toId) {
      return NextResponse.json({ error: "Destination is required" }, { status: 400 });
    }
    if (!body.fromType || !body.fromId || !body.productId || !body.quantity || !body.truckId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const load = await TruckLoad.create(body);
    await logActivity({
      action: "created",
      entity: "truck-load",
      entityId: load._id.toString(),
      description: `Loaded ${body.quantity} units from ${body.fromType} to ${body.toType}`,
      userId: user.userId,
      domainType: body.fromType,
      domainId: body.fromId,
      productId: body.productId,
      metadata: { quantity: body.quantity, status: load.status },
    });
    if (load.status === "delivered") {
      await updateInventoryOnDelivery(body);
    }
    return NextResponse.json(load, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateInventoryOnDelivery(data: { fromType: string; fromId: string; toType: string; toId: string; truckId: string; productId: string; quantity: number }) {
  const { fromType, toType, truckId, productId, quantity } = data;
  if (fromType === "truck" && toType === "truck") return;
  if (fromType !== "truck") {
    const srcStock = await Stock.findOne({ locationType: fromType, locationId: data.fromId, productId });
    const available = srcStock?.quantity ?? 0;
    if (available < quantity) {
      throw new Error(`Insufficient stock at ${fromType}: ${available} available, ${quantity} required`);
    }
    await Stock.findOneAndUpdate(
      { locationType: fromType, locationId: data.fromId, productId },
      { $inc: { quantity: -quantity } },
      { upsert: true }
    );
  }
  if (toType === "customer") return;
  if (toType === "truck") {
    await Stock.findOneAndUpdate(
      { locationType: "truck", locationId: truckId, productId },
      { $inc: { quantity } },
      { upsert: true }
    );
  } else {
    await Stock.findOneAndUpdate(
      { locationType: toType, locationId: data.toId, productId },
      { $inc: { quantity } },
      { upsert: true }
    );
  }
}
