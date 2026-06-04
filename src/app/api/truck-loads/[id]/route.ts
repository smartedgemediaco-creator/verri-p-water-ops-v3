import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { TruckLoad, Stock, Wastage } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

async function adjustStock(fromType: string, fromId: string, toType: string, toId: string, productId: string, quantity: number) {
  if (fromType === "truck" && toType === "truck") return;
  if (fromType !== "truck") {
    const srcStock = await Stock.findOne({ locationType: fromType, locationId: fromId, productId });
    const available = srcStock?.quantity ?? 0;
    if (available < quantity) {
      throw new Error(`Insufficient stock at ${fromType}: ${available} available, ${quantity} required`);
    }
    await Stock.findOneAndUpdate(
      { locationType: fromType, locationId: fromId, productId },
      { $inc: { quantity: -quantity } },
      { upsert: true }
    );
  }
  if (toType === "truck") {
    await Stock.findOneAndUpdate(
      { locationType: "truck", locationId: toId, productId },
      { $inc: { quantity } },
      { upsert: true }
    );
  } else {
    await Stock.findOneAndUpdate(
      { locationType: toType, locationId: toId, productId },
      { $inc: { quantity } },
      { upsert: true }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const spoilageQty = Math.max(0, Number(body.spoilage) || 0);
  const oldLoad = await TruckLoad.findById(id);
  if (!oldLoad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const oldStatus = oldLoad.status;
  const newStatus = body.status;
  if (!newStatus || oldStatus === newStatus) {
    return NextResponse.json({ error: "No status change" }, { status: 400 });
  }
  const validTransitions: Record<string, string[]> = {
    "in-transit": ["delivered", "cancelled"],
  };
  const allowed = validTransitions[oldStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json({ error: `Cannot transition from ${oldStatus} to ${newStatus}` }, { status: 400 });
  }
  const load = await TruckLoad.findByIdAndUpdate(id, { status: newStatus }, { new: true });
  if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { fromType, fromId, toType, toId, truckId, productId, quantity } = load;
  try {
    if (newStatus === "delivered" && oldStatus === "in-transit") {
      const deliveredQty = quantity - spoilageQty;
      if (deliveredQty > 0) {
        await adjustStock("truck", truckId.toString(), toType, toId.toString(), productId.toString(), deliveredQty);
      }
      if (spoilageQty > 0) {
        await Wastage.create({
          productId,
          quantity: spoilageQty,
          source: "transfer",
          locationType: toType === "truck" ? "truck" : toType,
          locationId: toType === "truck" ? truckId : toId,
          description: body.spoilageReason || `Damaged during delivery ${id.slice(-6)}`,
          date: new Date(),
        });
      }
    } else if (newStatus === "cancelled" && oldStatus === "in-transit") {
      await adjustStock("truck", truckId.toString(), fromType, fromId.toString(), productId.toString(), quantity);
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stock adjustment failed" },
      { status: 400 }
    );
  }
  await logActivity({
    action: "updated",
    entity: "truck-load",
    entityId: id,
    description: `Truck load ${id.slice(-6)}: ${oldStatus} → ${newStatus}`,
    userId: user.userId,
    domainType: load.fromType,
    domainId: load.fromId,
    productId: load.productId?.toString(),
    metadata: { oldStatus, newStatus },
  });
  return NextResponse.json(load);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await connectDB();
  const load = await TruckLoad.findByIdAndDelete(id);
  if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "Deleted" });
}
