import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Transfer, Inventory, Factory, Depot, Truck } from "@/lib/models";
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

  if (user.role !== "admin" && user.role !== "factory-manager" && user.role !== "depot-manager" && user.role !== "driver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.role === "driver") {
    if (truckId && truckId !== user.truckId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    filter.truckId = user.truckId;
  } else if (truckId) {
    filter.truckId = truckId;
  }

  if (statusFilter) {
    const statuses = statusFilter.split(",");
    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }

  const transfers = await Transfer.find(filter)
    .populate("productId")
    .populate("truckId")
    .sort({ date: -1 });

  const enriched = await Promise.all(
    transfers.map(async (t) => {
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
    if (user.role !== "admin" && user.role !== "factory-manager" && user.role !== "depot-manager" && user.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    if (body.date && typeof body.date === "string") {
      const parts = body.date.split("/");
      if (parts.length === 3) body.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    if (user.role === "driver" && user.truckId) {
      body.truckId = user.truckId;
    }

    const transfer = await Transfer.create(body);

  await logActivity({
    action: "created",
    entity: "transfer",
    entityId: transfer._id.toString(),
    description: `Transfer of ${body.quantity} units from ${body.fromType} to ${body.toType} — status: ${transfer.status}`,
    userId: user.userId,
    domainType: body.fromType,
    domainId: body.fromId,
    productId: body.productId,
    metadata: { quantity: body.quantity, fromType: body.fromType, fromId: body.fromId, toType: body.toType, toId: body.toId, status: transfer.status },
  });

  if (transfer.status === "delivered") {
    await updateInventoryOnDelivery({
      fromType: body.fromType,
      fromId: body.fromId,
      toType: body.toType,
      toId: body.toId,
      truckId: body.truckId,
      productId: body.productId,
      quantity: body.quantity,
    });
  }

    return NextResponse.json(transfer, { status: 201 });
  } catch (e: unknown) {
    console.error("Transfers POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function updateInventoryOnDelivery(transfer: { fromType: string; fromId: string; toType: string; toId: string; truckId: string; productId: string; quantity: number }) {
  const { fromType, fromId, toType, toId, truckId, productId, quantity } = transfer;

  if (fromType === "truck" && toType === "truck") return;

  if (fromType !== "truck") {
    await Inventory.findOneAndUpdate(
      { locationType: fromType, locationId: fromId, productId },
      { $inc: { quantity: -quantity } },
      { upsert: true }
    );
  }

  if (toType === "truck") {
    await Inventory.findOneAndUpdate(
      { locationType: "truck", locationId: truckId, productId },
      { $inc: { quantity: quantity } },
      { upsert: true }
    );
  } else {
    await Inventory.findOneAndUpdate(
      { locationType: toType, locationId: toId, productId },
      { $inc: { quantity: quantity } },
      { upsert: true }
    );
  }
}
