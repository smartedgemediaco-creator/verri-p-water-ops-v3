import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PurchaseOrder } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = ["draft", "sent", "confirmed", "partially-received", "received", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();
  const order = await PurchaseOrder.findById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only allow forward transitions
  const transitions: Record<string, string[]> = {
    draft: ["sent", "cancelled"],
    sent: ["confirmed", "cancelled"],
    confirmed: ["partially-received", "received", "cancelled"],
    "partially-received": ["received", "cancelled"],
    received: [],
    cancelled: [],
  };

  if (!transitions[order.status]?.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from "${order.status}" to "${status}"` },
      { status: 400 }
    );
  }

  order.status = status;

  if (status === "cancelled") {
    order.deliveryStatus = "pending";
  }

  await order.save();

  await logActivity({
    action: "updated",
    entity: "purchase-order",
    entityId: order._id.toString(),
    description: `Purchase order ${order.orderNumber} status changed to ${status}`,
    userId: user.userId,
    metadata: { orderNumber: order.orderNumber, status },
  });

  const updated = await PurchaseOrder.findById(id)
    .populate("supplierId", "name supplyType phone whatsapp")
    .lean();
  return NextResponse.json(updated);
}
