import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { GoodsReceivedNote, PurchaseOrder, RawMaterial, RawMaterialStockMovement } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const purchaseOrderId = searchParams.get("purchaseOrderId");

  const filter: Record<string, unknown> = {};
  if (purchaseOrderId)
    filter.purchaseOrderId = new mongoose.Types.ObjectId(purchaseOrderId);

  const notes = await GoodsReceivedNote.find(filter)
    .populate({
      path: "purchaseOrderId",
      populate: { path: "supplierId", select: "name phone whatsapp" },
    })
    .populate("items.rawMaterialId", "name unit stockUnit")
    .sort({ receivedDate: -1 });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();

  if (!body.purchaseOrderId) {
    return NextResponse.json({ error: "Purchase order is required" }, { status: 400 });
  }

  const po = await PurchaseOrder.findById(body.purchaseOrderId);
  if (!po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  const grn = await GoodsReceivedNote.create(body);

  // Update raw material stock + PO item quantityReceived + create movements
  const poItemUpdates: { itemIndex: number; qtyReceived: number }[] = [];

  for (let idx = 0; idx < (body.items ?? []).length; idx++) {
    const item = body.items[idx];
    const conditionMultiplier =
      item.condition === "good" ? 1 : item.condition === "partial" ? 0.5 : 0;
    const effectiveQty = (item.quantityReceived ?? 0) * conditionMultiplier;

    if (effectiveQty > 0 && item.rawMaterialId) {
      const rm = await RawMaterial.findByIdAndUpdate(item.rawMaterialId, {
        $inc: { currentStock: effectiveQty, totalReceived: effectiveQty },
        $set: { lastReceivedDate: new Date() },
      }, { new: true });

      await RawMaterialStockMovement.create({
        rawMaterialId: item.rawMaterialId,
        type: "purchase",
        quantity: effectiveQty,
        unit: rm?.unit ?? "",
        unitCost: rm?.unitCost ?? 0,
        reference: `GRN — PO ${po.orderNumber}`,
        referenceId: grn._id,
        notes: item.condition !== "good" ? `Condition: ${item.condition}` : "",
        performedBy: user.email || user.userId,
      });

      poItemUpdates.push({ itemIndex: idx, qtyReceived: effectiveQty });
    } else if (effectiveQty > 0) {
      poItemUpdates.push({ itemIndex: idx, qtyReceived: effectiveQty });
    }
  }

  // Update PO item quantityReceived fields and recalculate delivery status
  for (const update of poItemUpdates) {
    const poItem = po.items[update.itemIndex];
    if (poItem) {
      poItem.quantityReceived = (poItem.quantityReceived ?? 0) + update.qtyReceived;
    }
  }

  const totalOrdered = po.items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);
  const totalReceived = po.items.reduce((s: number, i: { quantityReceived?: number }) => s + (i.quantityReceived ?? 0), 0);

  if (totalReceived >= totalOrdered) {
    po.deliveryStatus = "delivered";
    po.status = "received";
    po.receivedDate = new Date();
  } else if (totalReceived > 0) {
    po.deliveryStatus = "partial";
    po.status = "partially-received";
  }

  await po.save();

  await logActivity({
    action: "created",
    entity: "goods-received-note",
    entityId: grn._id.toString(),
    description: `Goods received for PO ${po.orderNumber} — ${poItemUpdates.length} item(s) added to stock`,
    userId: user.userId,
    metadata: { purchaseOrderId: body.purchaseOrderId, orderNumber: po.orderNumber },
  });

  return NextResponse.json(grn, { status: 201 });
}
