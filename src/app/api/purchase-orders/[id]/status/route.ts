import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PurchaseOrder, RawMaterial } from "@/lib/models";
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

  const validStatuses = ["draft", "sent", "confirmed", "received", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();
  const order = await PurchaseOrder.findById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wasReceived = order.status === "received";
  order.status = status;
  await order.save();

  if (status === "received" && !wasReceived) {
    for (const item of order.items) {
      if (item.rawMaterialId) {
        await RawMaterial.findByIdAndUpdate(
          item.rawMaterialId,
          { $inc: { currentStock: item.quantity } }
        );
      }
    }
  }

  await logActivity({
    action: "updated",
    entity: "purchase-order",
    entityId: order._id.toString(),
    description: `Purchase order ${order.orderNumber} status changed to ${status}${status === "received" ? " — raw material stock updated" : ""}`,
    userId: user.userId,
    metadata: { orderNumber: order.orderNumber, status },
  });

  const updated = await PurchaseOrder.findById(id).populate("supplierId", "name supplyType").lean();
  return NextResponse.json(updated);
}
