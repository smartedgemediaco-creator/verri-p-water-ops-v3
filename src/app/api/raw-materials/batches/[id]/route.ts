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

const BATCH_EDITABLE_FIELDS = [
  "supplierId",
  "supplierName",
  "locationType",
  "locationId",
  "orderedQuantity",
  "receivedQuantity",
  "unit",
  "itemCount",
  "itemUnit",
  "conversionNote",
  "unitPrice",
  "paidAmount",
  "amountOwed",
  "status",
  "receivedDate",
  "expiryDate",
  "qualityNotes",
  "orderNotes",
];

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

  const allowed: Record<string, unknown> = {};
  for (const key of BATCH_EDITABLE_FIELDS) {
    if (key in body) allowed[key] = body[key];
  }

  const receivedQty = Number(allowed.receivedQuantity ?? oldBatch.receivedQuantity) || 0;
  const unitPrice = Number(allowed.unitPrice ?? oldBatch.unitPrice) || 0;
  const paidAmount = Number(allowed.paidAmount ?? oldBatch.paidAmount) || 0;
  const amountOwed = Number(allowed.amountOwed ?? oldBatch.amountOwed) || 0;
  const manualTotal = paidAmount + amountOwed;
  const suggestedTotal = receivedQty * unitPrice;
  allowed.totalCost = manualTotal > 0 ? manualTotal : suggestedTotal;
  allowed.paymentStatus =
    manualTotal > 0
      ? amountOwed <= 0
        ? "paid"
        : paidAmount > 0
        ? "partial"
        : "unpaid"
      : "unpaid";

  const qtyDiff = receivedQty - (oldBatch.receivedQuantity || 0);
  if (qtyDiff !== 0) {
    const newAvailable = Math.max(0, (oldBatch.availableQuantity || 0) + qtyDiff);
    allowed.availableQuantity = newAvailable;
    if (newAvailable <= 0 && allowed.status !== "expired") allowed.status = "consumed";
    else if (newAvailable > 0 && oldBatch.status === "consumed") allowed.status = "partially-received";
    await RawMaterial.findByIdAndUpdate(oldBatch.rawMaterialId, {
      $inc: { currentStock: qtyDiff },
    });
  }

  const batch = await RawMaterialBatch.findByIdAndUpdate(id, allowed, { new: true });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "raw-material-batch",
    entityId: id,
    description: `Updated batch ${batch.batchNumber} — ${batch.receivedQuantity} ${batch.unit || "unit"} (${batch.paidAmount.toLocaleString()} paid, ${batch.amountOwed.toLocaleString()} owed)`,
    userId: user.userId,
    metadata: { changes: allowed },
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

  const batch = await RawMaterialBatch.findById(id);
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ((batch.consumedQuantity || 0) > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${batch.consumedQuantity.toLocaleString()} ${batch.unit || "unit"} of this batch has been consumed. Delete the usage records first, or keep the batch for history.`,
      },
      { status: 400 }
    );
  }

  const batchNumber = batch.batchNumber;
  const availableQty = batch.availableQuantity || 0;
  await RawMaterialBatch.findByIdAndDelete(id);
  await RawMaterial.findByIdAndUpdate(batch.rawMaterialId, {
    $inc: { currentStock: -availableQty },
  });

  await logActivity({
    action: "deleted",
    entity: "raw-material-batch",
    entityId: id,
    description: `Deleted batch ${batchNumber} (${availableQty} ${batch.unit || "unit"} removed from stock)`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
