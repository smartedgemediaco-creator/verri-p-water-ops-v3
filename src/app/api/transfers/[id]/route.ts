import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Transfer, Inventory } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

async function adjustInventory(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
  productId: string,
  quantity: number
) {
  await Inventory.findOneAndUpdate(
    { locationType: fromType, locationId: fromId, productId },
    { $inc: { quantity: -quantity } },
    { upsert: true }
  );
  await Inventory.findOneAndUpdate(
    { locationType: toType, locationId: toId, productId },
    { $inc: { quantity: quantity } },
    { upsert: true }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const oldTransfer = await Transfer.findById(id);
  if (!oldTransfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldStatus = oldTransfer.status;
  const newStatus = body.status;
  if (!newStatus || oldStatus === newStatus) {
    return NextResponse.json({ error: "No status change" }, { status: 400 });
  }

  const validTransitions: Record<string, string[]> = {
    pending: ["in-transit", "cancelled"],
    "in-transit": ["delivered", "cancelled"],
  };
  const allowed = validTransitions[oldStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json({ error: `Cannot transition from ${oldStatus} to ${newStatus}` }, { status: 400 });
  }

  const isAdmin = user.role === "admin";
  const isSender =
    (oldTransfer.fromType === "factory" && user.role === "factory-manager" && user.factoryId === oldTransfer.fromId.toString()) ||
    (oldTransfer.fromType === "depot" && user.role === "depot-manager" && user.depotId === oldTransfer.fromId.toString());
  const isReceiver =
    (oldTransfer.toType === "factory" && user.role === "factory-manager" && user.factoryId === oldTransfer.toId.toString()) ||
    (oldTransfer.toType === "depot" && user.role === "depot-manager" && user.depotId === oldTransfer.toId.toString());

  const transitioningToInTransit = newStatus === "in-transit";
  const transitioningToDelivered = newStatus === "delivered";
  const transitioningToCancelled = newStatus === "cancelled";

  if (transitioningToInTransit && !isAdmin && !isSender) {
    return NextResponse.json({ error: "Only the sender can mark as in-transit" }, { status: 403 });
  }
  if (transitioningToDelivered && !isAdmin && !isReceiver) {
    return NextResponse.json({ error: "Only the receiver can confirm delivery" }, { status: 403 });
  }
  if (transitioningToCancelled && !isAdmin && !isSender && !isReceiver) {
    return NextResponse.json({ error: "Only the sender or receiver can cancel" }, { status: 403 });
  }

  const transfer = await Transfer.findByIdAndUpdate(id, { status: newStatus }, { new: true });
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { fromType, fromId, toType, toId, truckId, productId, quantity } = transfer;

  if (transitioningToInTransit) {
    await adjustInventory(fromType, fromId.toString(), "truck", truckId.toString(), productId.toString(), quantity);
  } else if (transitioningToDelivered && oldStatus === "in-transit") {
    await adjustInventory("truck", truckId.toString(), toType, toId.toString(), productId.toString(), quantity);
  } else if (transitioningToDelivered && oldStatus === "pending") {
    await adjustInventory(fromType, fromId.toString(), toType, toId.toString(), productId.toString(), quantity);
  } else if (transitioningToCancelled && oldStatus === "in-transit") {
    await adjustInventory("truck", truckId.toString(), fromType, fromId.toString(), productId.toString(), quantity);
  }

  await logActivity({
    action: "updated",
    entity: "transfer",
    entityId: id,
    description: `Transfer ${id.slice(-6)}: ${oldStatus} → ${newStatus}`,
    userId: user.userId,
    domainType: transfer.fromType,
    domainId: transfer.fromId,
    productId: transfer.productId?.toString(),
    metadata: { oldStatus, newStatus },
  });

  return NextResponse.json(transfer);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  const { id } = await params;
  await connectDB();
  const transfer = await Transfer.findByIdAndDelete(id);
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "transfer",
    entityId: id,
    description: `Deleted transfer from ${transfer.fromType} to ${transfer.toType}`,
    userId: user?.userId,
    domainType: transfer.fromType,
    domainId: transfer.fromId,
    productId: transfer.productId?.toString(),
  });

  return NextResponse.json({ message: "Deleted" });
}
