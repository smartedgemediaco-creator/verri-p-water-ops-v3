import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Transfer, Inventory } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET() {
  await connectDB();
  const transfers = await Transfer.find({})
    .populate("productId")
    .populate("truckId")
    .sort({ date: -1 });
  return NextResponse.json(transfers);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  await connectDB();
  const body = await req.json();
  const transfer = await Transfer.create(body);

  await logActivity({
    action: "created",
    entity: "transfer",
    entityId: transfer._id.toString(),
    description: `Transfer of ${body.quantity} units from ${body.fromType} to ${body.toType} — status: ${transfer.status}`,
    userId: user?.userId,
    domainType: body.fromType,
    domainId: body.fromId,
    productId: body.productId,
    metadata: { quantity: body.quantity, fromType: body.fromType, fromId: body.fromId, toType: body.toType, toId: body.toId, status: transfer.status },
  });

  if (transfer.status === "delivered") {
    await updateInventoryOnDelivery(transfer);
  }

  return NextResponse.json(transfer, { status: 201 });
}

async function updateInventoryOnDelivery(transfer: { fromType: string; fromId: string; toType: string; toId: string; productId: string; quantity: number }) {
  const { fromType, fromId, toType, toId, productId, quantity } = transfer;

  const fromFilter = { locationType: fromType, locationId: fromId, productId };
  const toFilter = { locationType: toType, locationId: toId, productId };

  await Inventory.findOneAndUpdate(fromFilter, { $inc: { quantity: -quantity } }, { upsert: true });
  await Inventory.findOneAndUpdate(toFilter, { $inc: { quantity: quantity } }, { upsert: true });
}
