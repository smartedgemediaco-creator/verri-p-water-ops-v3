import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PurchaseOrder, SupplierLedger, Supplier } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

  if (order.supplierId) {
    const supplier = await Supplier.findById(order.supplierId);
    if (supplier) {
      const lastEntry = await SupplierLedger.findOne({ supplierId: order.supplierId }).sort({ date: -1 }).lean();
      const prevBalance = lastEntry?.runningBalance ?? 0;

      await SupplierLedger.create({
        supplierId: order.supplierId,
        date: body.date ? new Date(body.date) : new Date(),
        type: "payment-sent",
        description: `Payment for PO ${order.orderNumber}`,
        orderId: order._id,
        debit: amount,
        amount,
        paymentMethod: body.method || "transfer",
        reference: body.reference || "",
        runningBalance: prevBalance - amount,
        notes: body.notes || "",
        createdBy: user.userId,
      });

      supplier.totalWeOwe = Math.max(0, supplier.totalWeOwe - amount);
      supplier.netBalance = supplier.totalWeOwe - supplier.totalOwedToUs;
      await supplier.save();
    }
  }

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
    },
  });

  const updated = await PurchaseOrder.findById(id)
    .populate("supplierId", "name supplyType phone whatsapp")
    .lean();

  return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
