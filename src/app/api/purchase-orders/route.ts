import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PurchaseOrder, Supplier } from "@/lib/models";
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
    .populate("supplierId", "name supplyType phone whatsapp email contactPerson")
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

  let contactPhone = body.contactPhone || "";
  let contactEmail = body.contactEmail || "";
  let supplierName = body.supplierName || "";

  if (body.supplierId && (!contactPhone && !contactEmail)) {
    const supplier = await Supplier.findById(body.supplierId).lean();
    if (supplier) {
      contactPhone = contactPhone || supplier.phone || "";
      contactEmail = contactEmail || supplier.email || "";
      supplierName = supplierName || supplier.name || "";
    }
  }

  const items = (body.items ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    quantityReceived: 0,
  }));

  const order = await PurchaseOrder.create({
    ...(body.supplierId ? { supplierId: body.supplierId } : {}),
    supplierName,
    items,
    orderNumber: generateOrderNumber(),
    totalAmount,
    contactPhone,
    contactEmail,
    expectedDate: body.expectedDate || undefined,
    notes: body.notes || "",
  });

  await logActivity({
    action: "created",
    entity: "purchase-order",
    entityId: order._id.toString(),
    description: `Created purchase order ${order.orderNumber} for ₦${totalAmount.toLocaleString()}${supplierName ? ` (Supplier: ${supplierName})` : ""}`,
    userId: user.userId,
    metadata: { orderNumber: order.orderNumber, totalAmount, supplierName },
  });

  return NextResponse.json(order, { status: 201 });
}
