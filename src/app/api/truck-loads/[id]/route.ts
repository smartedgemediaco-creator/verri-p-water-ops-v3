import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { TruckLoad, Stock, Wastage } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

async function adjustStock(fromType: string, fromId: string, toType: string, toId: string, productId: string, quantity: number) {
  if (fromType === "truck" && toType === "truck") return;
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
  const oldLoad = await TruckLoad.findById(id);
  if (!oldLoad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status && body.status !== oldLoad.status) {
    const oldStatus = oldLoad.status;
    const newStatus = body.status;
    const validTransitions: Record<string, string[]> = { "in-transit": ["delivered", "cancelled"] };
    const allowed = validTransitions[oldStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json({ error: `Cannot transition from ${oldStatus} to ${newStatus}` }, { status: 400 });
    }
    const spoilageQty = Math.max(0, Number(body.spoilage) || 0);
    // Stock adjustments BEFORE status update to avoid orphaned status on failure
    try {
      if (newStatus === "delivered" && oldStatus === "in-transit") {
        const deliveredQty = oldLoad.quantity - spoilageQty;
        if (deliveredQty > 0) {
          // Deduct full quantity from truck, add delivered portion to destination
          const truckFilter = { locationType: "truck", locationId: oldLoad.truckId.toString(), productId: oldLoad.productId.toString() } as const;
          const truckStock = await Stock.findOne(truckFilter);
          const available = truckStock?.quantity ?? 0;
          if (available < oldLoad.quantity) {
            throw new Error(`Insufficient stock at source: ${available} available, ${oldLoad.quantity} required`);
          }
          await Stock.findOneAndUpdate(truckFilter, { $inc: { quantity: -oldLoad.quantity } }, { upsert: true });
          if (oldLoad.toType === "truck") {
            await Stock.findOneAndUpdate(
              { locationType: "truck", locationId: oldLoad.truckId.toString(), productId: oldLoad.productId.toString() },
              { $inc: { quantity: deliveredQty } },
              { upsert: true }
            );
          } else {
            await Stock.findOneAndUpdate(
              { locationType: oldLoad.toType, locationId: oldLoad.toId!.toString(), productId: oldLoad.productId.toString() },
              { $inc: { quantity: deliveredQty } },
              { upsert: true }
            );
          }
        } else {
          await Stock.findOneAndUpdate(
            { locationType: "truck", locationId: oldLoad.truckId.toString(), productId: oldLoad.productId.toString() },
            { $inc: { quantity: -oldLoad.quantity } },
            { upsert: true }
          );
        }
        if (spoilageQty > 0) {
          await Wastage.create({
            productId: oldLoad.productId, quantity: spoilageQty, source: "transfer",
            locationType: oldLoad.toType === "truck" ? "truck" : oldLoad.toType,
            locationId: oldLoad.toType === "truck" ? oldLoad.truckId : oldLoad.toId!,
            description: body.spoilageReason || "Damaged during delivery",
            date: new Date(),
          });
        }
      } else if (newStatus === "cancelled" && oldStatus === "in-transit") {
        await adjustStock("truck", oldLoad.truckId.toString(), oldLoad.fromType, oldLoad.fromId.toString(), oldLoad.productId.toString(), oldLoad.quantity);
      }
    } catch (err: unknown) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Stock adjustment failed" }, { status: 400 });
    }
    const load = await TruckLoad.findByIdAndUpdate(id, { status: newStatus }, { new: true });
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await logActivity({ action: "updated", entity: "truck-load", entityId: id, description: `Truck load: ${oldStatus} → ${newStatus}`, userId: user.userId, domainType: load.fromType, domainId: load.fromId, productId: load.productId?.toString(), metadata: { oldStatus, newStatus } });
    return NextResponse.json(load);
  }

  if (user.role !== "admin") return NextResponse.json({ error: "Only admins can edit load details" }, { status: 403 });
  const updates: Record<string, unknown> = {};
  if (body.quantity != null) updates.quantity = Number(body.quantity);
  if (body.loadAmount != null) updates.loadAmount = Number(body.loadAmount);
  if (body.date) updates.date = body.date;
  if (body.notes != null) updates.notes = body.notes;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  const updated = await TruckLoad.findByIdAndUpdate(id, updates, { new: true });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({ action: "updated", entity: "truck-load", entityId: id, description: `Admin edited truck load fields`, userId: user.userId, metadata: { changes: updates } });
  return NextResponse.json(updated);
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
