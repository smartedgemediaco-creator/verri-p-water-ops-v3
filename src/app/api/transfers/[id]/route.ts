import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Transfer, Stock, Wastage } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyTransferStatus } from "@/lib/notifications";

async function checkAndAdjustStock(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
  productId: string,
  quantity: number
) {
  if (fromType === "truck" && toType === "truck") return;

  const fromFilter = { locationType: fromType, locationId: fromId, productId };
  const current = await Stock.findOne(fromFilter);
  const available = current?.quantity ?? 0;
  if (available < quantity) {
    throw new Error(`Insufficient stock at source: ${available} available, ${quantity} required`);
  }
  await Stock.findOneAndUpdate(fromFilter, { $inc: { quantity: -quantity } }, { upsert: true });

  if (toType === "truck") {
    await Stock.findOneAndUpdate(
      { locationType: "truck", locationId: toId, productId },
      { $inc: { quantity: quantity } },
      { upsert: true }
    );
  } else {
    await Stock.findOneAndUpdate(
      { locationType: toType, locationId: toId, productId },
      { $inc: { quantity: quantity } },
      { upsert: true }
    );
  }
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
  const spoilageQty = Math.max(0, Number(body.spoilage) || 0);

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
  const isDriver = user.role === "driver";
  const isSender =
    (oldTransfer.fromType === "factory" && user.role === "factory-manager" && user.factoryId === oldTransfer.fromId.toString()) ||
    (oldTransfer.fromType === "depot" && user.role === "depot-manager" && user.depotId === oldTransfer.fromId.toString()) ||
    (oldTransfer.fromType === "truck" && isDriver && user.truckId === oldTransfer.fromId.toString()) ||
    (oldTransfer.fromType === "truck" && !isDriver && user.truckId === oldTransfer.fromId.toString());
  const isReceiver =
    (oldTransfer.toType === "factory" && user.role === "factory-manager" && user.factoryId === oldTransfer.toId.toString()) ||
    (oldTransfer.toType === "depot" && user.role === "depot-manager" && user.depotId === oldTransfer.toId.toString()) ||
    (oldTransfer.toType === "truck" && isDriver && user.truckId === oldTransfer.toId.toString()) ||
    (oldTransfer.toType === "truck" && !isDriver && user.truckId === oldTransfer.toId.toString());
  const isAssignedDriver = isDriver && user.truckId === oldTransfer.truckId.toString();

  const transitioningToInTransit = newStatus === "in-transit";
  const transitioningToDelivered = newStatus === "delivered";
  const transitioningToCancelled = newStatus === "cancelled";

  if (transitioningToInTransit && !isAdmin && !isSender && !isAssignedDriver) {
    return NextResponse.json({ error: "Only the sender or assigned driver can mark as in-transit" }, { status: 403 });
  }
  if (transitioningToDelivered && !isAdmin && !isReceiver && !isAssignedDriver) {
    return NextResponse.json({ error: "Only the receiver or assigned driver can confirm delivery" }, { status: 403 });
  }
  if (transitioningToCancelled && !isAdmin && !isSender && !isReceiver && !isAssignedDriver) {
    return NextResponse.json({ error: "Only the sender, receiver, or assigned driver can cancel" }, { status: 403 });
  }

  // Perform stock adjustments BEFORE updating status to keep inventory consistent on failure
  try {
    if (transitioningToInTransit) {
      const { fromType: fType, fromId: fId, truckId: tId, productId: pId, quantity: qty } = oldTransfer;
      if (fType === "truck") {
        await checkAndAdjustStock("truck", tId.toString(), "truck", tId.toString(), pId.toString(), qty);
      } else {
        await checkAndAdjustStock(fType, fId.toString(), "truck", tId.toString(), pId.toString(), qty);
      }
    } else if (transitioningToDelivered && oldStatus === "in-transit") {
      const deliveredQty = oldTransfer.quantity - spoilageQty;
      const { toType, toId, truckId: tId, productId: pId, quantity: qty } = oldTransfer;
      if (deliveredQty > 0) {
        // Deduct full quantity from truck, add delivered portion to destination
        const truckFilter = { locationType: "truck", locationId: tId.toString(), productId: pId.toString() } as const;
        const truckStock = await Stock.findOne(truckFilter);
        const available = truckStock?.quantity ?? 0;
        if (available < qty) {
          throw new Error(`Insufficient stock at source: ${available} available, ${qty} required`);
        }
        await Stock.findOneAndUpdate(truckFilter, { $inc: { quantity: -qty } }, { upsert: true });
        if (toType === "truck") {
          await Stock.findOneAndUpdate(
            { locationType: "truck", locationId: tId.toString(), productId: pId.toString() },
            { $inc: { quantity: deliveredQty } },
            { upsert: true }
          );
        } else {
          await Stock.findOneAndUpdate(
            { locationType: toType, locationId: toId.toString(), productId: pId.toString() },
            { $inc: { quantity: deliveredQty } },
            { upsert: true }
          );
        }
      } else {
        await Stock.findOneAndUpdate(
          { locationType: "truck", locationId: oldTransfer.truckId.toString(), productId: oldTransfer.productId.toString() },
          { $inc: { quantity: -oldTransfer.quantity } },
          { upsert: true }
        );
      }
      if (spoilageQty > 0) {
        await Wastage.create({
          productId: oldTransfer.productId,
          quantity: spoilageQty,
          source: "transfer",
          locationType: oldTransfer.toType === "truck" ? "truck" : oldTransfer.toType,
          locationId: oldTransfer.toType === "truck" ? oldTransfer.truckId : oldTransfer.toId,
          description: body.spoilageReason || `Damaged during transfer`,
          date: new Date(),
        });
      }
    } else if (transitioningToDelivered && oldStatus === "pending") {
      const deliveredQty = oldTransfer.quantity - spoilageQty;
      const { fromType: fType, fromId: fId, toType: tType, toId: tId, truckId: trId, productId: pId, quantity: qty } = oldTransfer;
      if (deliveredQty > 0) {
        // Deduct full quantity from source, add delivered portion to destination
        const fromFilter = { locationType: fType, locationId: fId.toString(), productId: pId.toString() } as const;
        // For truck source, fromId is the truckId; ensure we check correctly
        const srcStock = await Stock.findOne(fromFilter);
        const available = srcStock?.quantity ?? 0;
        if (available < qty) {
          throw new Error(`Insufficient stock at source: ${available} available, ${qty} required`);
        }
        await Stock.findOneAndUpdate(fromFilter, { $inc: { quantity: -qty } }, { upsert: true });
        if (tType === "truck") {
          await Stock.findOneAndUpdate(
            { locationType: "truck", locationId: trId.toString(), productId: pId.toString() },
            { $inc: { quantity: deliveredQty } },
            { upsert: true }
          );
        } else {
          await Stock.findOneAndUpdate(
            { locationType: tType, locationId: tId.toString(), productId: pId.toString() },
            { $inc: { quantity: deliveredQty } },
            { upsert: true }
          );
        }
      } else {
        // All spoiled – deduct full from source only
        if (oldTransfer.fromType !== "truck") {
          await Stock.findOneAndUpdate(
            { locationType: oldTransfer.fromType, locationId: oldTransfer.fromId.toString(), productId: oldTransfer.productId.toString() },
            { $inc: { quantity: -oldTransfer.quantity } },
            { upsert: true }
          );
        } else {
          await Stock.findOneAndUpdate(
            { locationType: "truck", locationId: oldTransfer.truckId.toString(), productId: oldTransfer.productId.toString() },
            { $inc: { quantity: -oldTransfer.quantity } },
            { upsert: true }
          );
        }
        if (oldTransfer.toType === "truck") {
          await Stock.findOneAndUpdate(
            { locationType: "truck", locationId: oldTransfer.truckId.toString(), productId: oldTransfer.productId.toString() },
            { $inc: { quantity: oldTransfer.quantity } },
            { upsert: true }
          );
        }
      }
      if (spoilageQty > 0) {
        await Wastage.create({
          productId: oldTransfer.productId,
          quantity: spoilageQty,
          source: "transfer",
          locationType: oldTransfer.toType === "truck" ? "truck" : oldTransfer.toType,
          locationId: oldTransfer.toType === "truck" ? oldTransfer.truckId : oldTransfer.toId,
          description: body.spoilageReason || `Damaged during transfer`,
          date: new Date(),
        });
      }
    } else if (transitioningToCancelled && oldStatus === "in-transit") {
      const { fromType: fType, fromId: fId, truckId: tId, productId: pId, quantity: qty } = oldTransfer;
      // Restore: remove from truck, return to source
      const truckFilter = { locationType: "truck", locationId: tId.toString(), productId: pId.toString() } as const;
      const truckStock = await Stock.findOne(truckFilter);
      const available = truckStock?.quantity ?? 0;
      if (available < qty) {
        throw new Error(`Insufficient stock at source: ${available} available, ${qty} required`);
      }
      await Stock.findOneAndUpdate(truckFilter, { $inc: { quantity: -qty } }, { upsert: true });
      await Stock.findOneAndUpdate(
        { locationType: fType, locationId: fId.toString(), productId: pId.toString() },
        { $inc: { quantity: qty } },
        { upsert: true }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stock adjustment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const transfer = await Transfer.findByIdAndUpdate(id, { status: newStatus }, { new: true });
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { fromType, fromId, toType, toId, truckId, productId, quantity } = transfer;

  await logActivity({
    action: "updated",
    entity: "transfer",
    entityId: id,
    description: `Transfer: ${oldStatus} → ${newStatus}`,
    userId: user.userId,
    domainType: transfer.fromType,
    domainId: transfer.fromId,
    productId: transfer.productId?.toString(),
    metadata: { oldStatus, newStatus },
  });

  if (newStatus === "in-transit" || newStatus === "delivered") {
    const product = await (await import("@/lib/models/Product")).Product.findById(transfer.productId).select("name").lean();
    const fromLoc = transfer.fromType === "factory"
      ? await (await import("@/lib/models/Factory")).Factory.findById(transfer.fromId).select("name").lean()
      : transfer.fromType === "depot"
      ? await (await import("@/lib/models/Depot")).Depot.findById(transfer.fromId).select("name").lean()
      : await (await import("@/lib/models/Truck")).Truck.findById(transfer.fromId).select("plateNumber").lean();
    const toLoc = transfer.toType === "factory"
      ? await (await import("@/lib/models/Factory")).Factory.findById(transfer.toId).select("name").lean()
      : transfer.toType === "depot"
      ? await (await import("@/lib/models/Depot")).Depot.findById(transfer.toId).select("name").lean()
      : await (await import("@/lib/models/Truck")).Truck.findById(transfer.toId).select("plateNumber").lean();

    notifyTransferStatus(
      (product as { name?: string } | null)?.name ?? "Unknown",
      transfer.quantity,
      (fromLoc as { name?: string; plateNumber?: string } | null)?.name ?? (fromLoc as { plateNumber?: string } | null)?.plateNumber ?? transfer.fromType,
      (toLoc as { name?: string; plateNumber?: string } | null)?.name ?? (toLoc as { plateNumber?: string } | null)?.plateNumber ?? transfer.toType,
      newStatus
    ).catch(() => {});
  }

  return NextResponse.json(transfer);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete transfers" }, { status: 403 });
  }
  const { id } = await params;
  await connectDB();
  const transfer = await Transfer.findByIdAndDelete(id);
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "transfer",
    entityId: id,
    description: `Admin deleted transfer from ${transfer.fromType} to ${transfer.toType}`,
    userId: user.userId,
    domainType: transfer.fromType,
    domainId: transfer.fromId,
    productId: transfer.productId?.toString(),
  });

  return NextResponse.json({ message: "Deleted" });
}
