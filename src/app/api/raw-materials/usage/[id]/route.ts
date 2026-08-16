import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDB from "@/lib/db";
import { RawMaterialConsumption, RawMaterialBatch, RawMaterialStockMovement } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { itemToPrimaryQty, recomputeMaterialStock } from "@/lib/rawMaterialStock";

type AllocationLike = {
  batchId?: Types.ObjectId | string;
  quantity?: number;
  itemCount?: number;
};

async function restoreBatchStock(allocations: AllocationLike[]) {
  for (const a of allocations) {
    if (!a.batchId) continue;
    const batch = await RawMaterialBatch.findById(a.batchId);
    if (!batch) continue;
    batch.availableQuantity = (batch.availableQuantity || 0) + (a.quantity || 0);
    batch.consumedQuantity = Math.max(0, (batch.consumedQuantity || 0) - (a.quantity || 0));
    if ((a.itemCount || 0) > 0) {
      batch.itemConsumed = Math.max(0, (batch.itemConsumed || 0) - (a.itemCount || 0));
    }
    if (batch.availableQuantity > 0 && batch.status === "consumed") {
      batch.status = "received";
    }
    await batch.save();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const record = await RawMaterialConsumption.findById(id).populate("rawMaterialId", "name unit");
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalQuantity = record.totalQuantity || 0;
  const unit = record.rawMaterialId?.unit || "";
  const purpose = record.purpose || "consumption";
  const materialId = record.rawMaterialId?._id as Types.ObjectId | undefined;

  await restoreBatchStock(record.allocations);
  if (materialId) await recomputeMaterialStock(materialId);
  await RawMaterialStockMovement.deleteMany({ referenceId: id });
  await RawMaterialConsumption.findByIdAndDelete(id);

  await logActivity({
    action: "deleted",
    entity: "raw-material-usage",
    entityId: id,
    description: `Deleted usage record: ${totalQuantity} ${unit} of "${record.rawMaterialId?.name ?? "material"}" (${purpose}) — stock restored to batch`,
    userId: user.userId,
    metadata: { totalQuantity, unit, purpose, stockRestored: true },
  });

  return NextResponse.json({ message: "Deleted", stockRestored: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const record = await RawMaterialConsumption.findById(id).populate("rawMaterialId", "name unit");
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const batchId = body.batchId;
  const quantity = Number(body.quantity) || 0;
  const itemQuantity = Number(body.itemQuantity) || 0;
  if (!batchId) {
    return NextResponse.json({ error: "Select a batch" }, { status: 400 });
  }
  if ((!quantity || quantity <= 0) && (!itemQuantity || itemQuantity <= 0)) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const batch = await RawMaterialBatch.findById(batchId);
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.rawMaterialId.toString() !== record.rawMaterialId._id.toString()) {
    return NextResponse.json({ error: "Batch does not belong to this material" }, { status: 400 });
  }

  const oldAllocationsForBatch = (record.allocations as AllocationLike[]).filter(
    (a: AllocationLike) => a.batchId?.toString() === batchId
  );
  const oldPrimary = oldAllocationsForBatch.reduce((sum: number, a: AllocationLike) => sum + (a.quantity || 0), 0);
  const oldItems = oldAllocationsForBatch.reduce((sum: number, a: AllocationLike) => sum + (a.itemCount || 0), 0);

  let primaryQty = quantity;
  let itemCount = 0;
  let itemUnit = "";
  if (itemQuantity > 0) {
    primaryQty = itemToPrimaryQty(batch, itemQuantity);
    if (!primaryQty || primaryQty <= 0) {
      return NextResponse.json(
        { error: "Could not convert item count to a primary quantity. Check the batch conversion (item count vs received qty)." },
        { status: 400 }
      );
    }
    if (itemQuantity > (batch.itemCount || 0) - (batch.itemConsumed || 0) + oldItems) {
      return NextResponse.json(
        { error: `Insufficient ${batch.itemUnit || "items"} in batch ${batch.batchNumber}. Available: ${(batch.itemCount || 0) - (batch.itemConsumed || 0) + oldItems} ${batch.itemUnit || "items"}` },
        { status: 400 }
      );
    }
    itemCount = itemQuantity;
    itemUnit = batch.itemUnit || "";
  }
  if (primaryQty > batch.availableQuantity + oldPrimary) {
    return NextResponse.json(
      { error: `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQuantity + oldPrimary} ${batch.unit}` },
      { status: 400 }
    );
  }

  await restoreBatchStock(record.allocations);

  batch.availableQuantity -= primaryQty;
  batch.consumedQuantity += primaryQty;
  if (itemCount > 0) batch.itemConsumed = (batch.itemConsumed || 0) + itemCount;
  if (batch.availableQuantity <= 0) batch.status = "consumed";
  await batch.save();

  const purpose = body.purpose || record.purpose || "production";
  const date = body.date ? new Date(body.date) : record.date;
  const unit = batch.unit || record.rawMaterialId?.unit || "";

  record.allocations = [{ batchId, quantity: primaryQty, unitCost: batch.unitPrice || 0, itemCount, itemUnit }];
  record.totalQuantity = primaryQty;
  record.totalCost = primaryQty * (batch.unitPrice || 0);
  record.purpose = purpose;
  record.notes = body.notes ?? record.notes;
  record.date = date;
  if (body.locationType && body.locationId) {
    record.locationType = body.locationType;
    record.locationId = body.locationId;
  }
  await record.save();

  await recomputeMaterialStock(record.rawMaterialId._id);

  const movementType = purpose === "wastage" ? "waste" : purpose === "adjustment" ? "adjustment" : "consumption";
  await RawMaterialStockMovement.deleteMany({ referenceId: id });
  await RawMaterialStockMovement.create({
    rawMaterialId: record.rawMaterialId._id,
    batchId,
    type: movementType,
    quantity: -primaryQty,
    unit,
    itemQuantity: itemCount > 0 ? -itemCount : 0,
    itemUnit,
    unitCost: batch.unitPrice || 0,
    reference: `usage edit — batch ${batch.batchNumber}`,
    referenceId: id,
    notes: body.notes || "",
    performedBy: user.email || user.userId,
  });

  await logActivity({
    action: "updated",
    entity: "raw-material-usage",
    entityId: id,
    description: `Edited usage of "${record.rawMaterialId?.name ?? "material"}": now ${primaryQty} ${unit} (${purpose}) from batch ${batch.batchNumber}`,
    userId: user.userId,
    metadata: { totalQuantity: primaryQty, unit, purpose, batchId, itemQuantity: itemCount },
  });

  return NextResponse.json(record);
}
