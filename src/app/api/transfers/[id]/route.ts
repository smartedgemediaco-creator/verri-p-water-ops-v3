import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Transfer, Inventory } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const oldTransfer = await Transfer.findById(id);
  if (!oldTransfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const transfer = await Transfer.findByIdAndUpdate(id, body, { new: true });
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "delivered" && oldTransfer.status !== "delivered") {
    const { fromType, fromId, toType, toId, productId, quantity } = transfer;
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

  await logActivity({
    action: "updated",
    entity: "transfer",
    entityId: id,
    description: `Transfer ${id.slice(-6)} status changed to "${transfer.status}"`,
    userId: user?.userId,
    domainType: transfer.fromType,
    domainId: transfer.fromId,
    productId: transfer.productId?.toString(),
    metadata: { oldStatus: oldTransfer.status, newStatus: transfer.status },
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
