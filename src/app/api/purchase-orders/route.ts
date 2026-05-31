import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PurchaseOrder } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import mongoose from "mongoose";

function generateOrderNumber(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${ymd}-${rand}`;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");

  const filter: Record<string, unknown> = {};
  if (supplierId) filter.supplierId = new mongoose.Types.ObjectId(supplierId);

  const orders = await PurchaseOrder.find(filter)
    .populate("supplierId", "name supplyType")
    .sort({ orderDate: -1 });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();

  const totalAmount = (body.items ?? []).reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0
  );

  const order = await PurchaseOrder.create({
    ...body,
    orderNumber: generateOrderNumber(),
    totalAmount,
  });

  await logActivity({
    action: "created",
    entity: "purchase-order",
    entityId: order._id.toString(),
    description: `Created purchase order ${order.orderNumber} for ${totalAmount.toLocaleString()}`,
    userId: user.userId,
    metadata: { orderNumber: order.orderNumber, totalAmount },
  });

  return NextResponse.json(order, { status: 201 });
}
