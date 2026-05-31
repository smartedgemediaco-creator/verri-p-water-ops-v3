import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { GoodsReceivedNote, PurchaseOrder, RawMaterial } from "@/lib/models";
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
      populate: { path: "supplierId", select: "name" },
    })
    .populate("items.rawMaterialId", "name unit")
    .sort({ receivedDate: -1 });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();

  const grn = await GoodsReceivedNote.create(body);

  // Update raw material stock for each item
  for (const item of body.items ?? []) {
    const conditionMultiplier =
      item.condition === "good" ? 1 : item.condition === "partial" ? 0.5 : 0;
    const effectiveQty = (item.quantityReceived ?? 0) * conditionMultiplier;
    if (effectiveQty > 0) {
      await RawMaterial.findByIdAndUpdate(item.rawMaterialId, {
        $inc: { currentStock: effectiveQty },
      });
    }
  }

  // Auto-update PO status to "received" if all items match
  if (body.purchaseOrderId) {
    await PurchaseOrder.findByIdAndUpdate(body.purchaseOrderId, {
      status: "received",
    });
  }

  await logActivity({
    action: "created",
    entity: "goods-received-note",
    entityId: grn._id.toString(),
    description: "Recorded goods received note",
    userId: user.userId,
    metadata: { purchaseOrderId: body.purchaseOrderId },
  });

  return NextResponse.json(grn, { status: 201 });
}
