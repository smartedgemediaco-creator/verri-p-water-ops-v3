import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PurchaseOrder } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }

  const order = await PurchaseOrder.findById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  order.payments.push({
    amount,
    method: body.method || "transfer",
    date: body.date ? new Date(body.date) : new Date(),
    reference: body.reference || "",
    notes: body.notes || "",
    recordedBy: user.email || user.userId,
  });

  order.amountPaid = order.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

  if (order.amountPaid >= order.totalAmount) {
    order.paymentStatus = "paid";
  } else if (order.amountPaid > 0) {
    order.paymentStatus = "partial";
  }

  await order.save();

  await logActivity({
    action: "updated",
    entity: "purchase-order",
    entityId: order._id.toString(),
    description: `Payment of ₦${amount.toLocaleString()} recorded for PO ${order.orderNumber} (${order.paymentStatus})`,
    userId: user.userId,
    metadata: {
      orderNumber: order.orderNumber,
      amount,
      method: body.method || "transfer",
      paymentStatus: order.paymentStatus,
      amountPaid: order.amountPaid,
      totalAmount: order.totalAmount,
    },
  });

  const updated = await PurchaseOrder.findById(id)
    .populate("supplierId", "name supplyType phone whatsapp")
    .lean();
  return NextResponse.json(updated);
}
