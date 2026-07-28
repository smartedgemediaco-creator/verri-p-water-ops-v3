import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PurchaseOrder, RawMaterialBatch, RawMaterial, SupplierLedger, Supplier } from "@/lib/models";
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

  const order = await PurchaseOrder.findById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const deliveries = body.deliveries as Array<{
    itemIndex: number;
    receivedQuantity: number;
    itemCount?: number;
    unitCount?: number;
    qualityNotes?: string;
  }>;

  if (!Array.isArray(deliveries) || deliveries.length === 0) {
    return NextResponse.json({ error: "At least one delivery entry is required" }, { status: 400 });
  }

  const year = new Date().getFullYear();
  const createdBatches: string[] = [];

  for (const delivery of deliveries) {
    const item = order.items[delivery.itemIndex];
    if (!item) {
      return NextResponse.json({ error: `Invalid item index: ${delivery.itemIndex}` }, { status: 400 });
    }

    const receivedQty = Number(delivery.receivedQuantity) || 0;
    if (receivedQty <= 0) {
      return NextResponse.json({ error: "Received quantity must be greater than 0" }, { status: 400 });
    }

    const batchCount = await RawMaterialBatch.countDocuments();
    const batchNumber = `BATCH-${year}-${String(batchCount + 1).padStart(4, "0")}`;

    const locationType = order.deliveryLocationType || "factory";
    const locationId = order.deliveryLocationId;

    if (!locationId) {
      return NextResponse.json({ error: "PO has no delivery location set" }, { status: 400 });
    }

    const batch = await RawMaterialBatch.create({
      rawMaterialId: item.rawMaterialId,
      supplierId: order.supplierId || null,
      purchaseOrderId: order._id,
      batchNumber,
      locationType,
      locationId,
      orderedQuantity: item.quantity,
      receivedQuantity: receivedQty,
      unit: item.unit || "kg",
      itemCount: Number(delivery.unitCount) || Number(delivery.itemCount) || 0,
      itemUnit: item.itemUnit || "",
      unitPrice: item.unitPrice,
      totalCost: receivedQty * item.unitPrice,
      status: "received",
      receivedDate: new Date(),
      availableQuantity: receivedQty,
      consumedQuantity: 0,
      qualityNotes: delivery.qualityNotes || "",
      createdBy: user.userId,
    });

    createdBatches.push(batchNumber);

    item.quantityReceived = (item.quantityReceived || 0) + receivedQty;
    if (!item.batchIds) item.batchIds = [];
    item.batchIds.push(batch._id);

    if (item.rawMaterialId) {
      await RawMaterial.findByIdAndUpdate(item.rawMaterialId, {
        $inc: {
          currentStock: receivedQty,
          totalReceived: receivedQty,
          totalBatchStock: receivedQty,
          batchCount: 1,
        },
        $set: { lastReceivedDate: new Date() },
      });
    }
  }

  const allReceived = order.items.every((item: { quantity: number; quantityReceived: number }) => item.quantityReceived >= item.quantity);
  const someReceived = order.items.some((item: { quantityReceived: number }) => (item.quantityReceived || 0) > 0);

  if (allReceived) {
    order.status = "received";
    order.deliveryStatus = "delivered";
    order.receivedDate = new Date();
  } else if (someReceived) {
    order.status = "partially-received";
    order.deliveryStatus = "partial";
  }

  await order.save();

  if (order.supplierId) {
    const totalDelivered = deliveries.reduce((sum, d) => {
      const item = order.items[d.itemIndex];
      return sum + (Number(d.receivedQuantity) || 0) * (item?.unitPrice || 0);
    }, 0);

    const supplier = await Supplier.findById(order.supplierId);
    if (supplier) {
      const lastEntry = await SupplierLedger.findOne({ supplierId: order.supplierId }).sort({ date: -1 }).lean();
      const prevBalance = lastEntry?.runningBalance ?? 0;

      await SupplierLedger.create({
        supplierId: order.supplierId,
        date: new Date(),
        type: "order",
        description: `Delivery received for PO ${order.orderNumber} — ${createdBatches.join(", ")}`,
        orderId: order._id,
        credit: totalDelivered,
        amount: totalDelivered,
        runningBalance: prevBalance + totalDelivered,
        createdBy: user.userId,
      });

      supplier.totalWeOwe += totalDelivered;
      supplier.netBalance = supplier.totalWeOwe - supplier.totalOwedToUs;
      await supplier.save();
    }
  }

  await logActivity({
    action: "updated",
    entity: "purchase-order",
    entityId: order._id.toString(),
    description: `Received goods for PO ${order.orderNumber} — batches: ${createdBatches.join(", ")}`,
    userId: user.userId,
    metadata: { batchNumbers: createdBatches, status: order.status },
  });

  const updated = await PurchaseOrder.findById(id)
    .populate("supplierId", "name supplyType phone whatsapp")
    .populate("items.rawMaterialId", "name unit category")
    .lean();

  return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
