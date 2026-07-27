import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterialBatch, RawMaterial } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const batch = await RawMaterialBatch.findById(id)
    .populate("rawMaterialId", "name unit category")
    .populate("supplierId", "name phone whatsapp")
    .populate("purchaseOrderId", "orderNumber")
    .populate("locationId", "name")
    .lean();

  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(batch);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const oldBatch = await RawMaterialBatch.findById(id);
  if (!oldBatch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const qtyDiff = (Number(body.receivedQuantity) ?? oldBatch.receivedQuantity) - oldBatch.receivedQuantity;

  const batch = await RawMaterialBatch.findByIdAndUpdate(id, body, { new: true });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (qtyDiff !== 0) {
    await RawMaterial.findByIdAndUpdate(oldBatch.rawMaterialId, {
      $inc: { currentStock: qtyDiff, totalBatchStock: qtyDiff },
    });
  }

  await logActivity({
    action: "updated",
    entity: "raw-material-batch",
    entityId: id,
    description: `Updated batch ${batch.batchNumber}`,
    userId: user.userId,
  });

  return NextResponse.json(batch);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const batch = await RawMaterialBatch.findByIdAndDelete(id);
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await RawMaterial.findByIdAndUpdate(batch.rawMaterialId, {
    $inc: {
      currentStock: -batch.availableQuantity,
      totalBatchStock: -batch.availableQuantity,
      batchCount: -1,
    },
  });

  return NextResponse.json({ message: "Deleted" });
}
