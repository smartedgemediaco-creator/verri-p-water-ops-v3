import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, RawMaterialBatch, RawMaterialStockMovement, RawMaterialConsumption } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyLowStock } from "@/lib/notifications";
import { itemToPrimaryQty, recomputeMaterialStock } from "@/lib/rawMaterialStock";

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

    const quantity = Number(body.quantity) || 0;
    const itemQuantity = Number(body.itemQuantity) || 0;
    if ((!quantity || quantity <= 0) && (!itemQuantity || itemQuantity <= 0)) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    const material = await RawMaterial.findById(id);
    if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (itemQuantity > 0 && !body.batchId) {
      return NextResponse.json(
        { error: "Select a batch to consume by item count (e.g. rolls)" },
        { status: 400 }
      );
    }
    if (!itemQuantity && quantity > material.currentStock) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${material.currentStock} ${material.unit}` },
        { status: 400 }
      );
    }

    const batchId = body.batchId;
    let unitCost = material.unitCost || 0;
    let unit = material.unit;
    let batchRef = "";
    let primaryQty = quantity;
    let itemConsumedQty = 0;
    let itemUnit = "";
    const movementType =
      body.type === "waste" || body.type === "wastage" ? "waste" :
      body.type === "adjustment" ? "adjustment" :
      "consumption";

    if (batchId) {
      const batch = await RawMaterialBatch.findById(batchId);
      if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      if (batch.rawMaterialId.toString() !== id) {
        return NextResponse.json({ error: "Batch does not belong to this material" }, { status: 400 });
      }
      primaryQty = itemQuantity > 0 ? itemToPrimaryQty(batch, itemQuantity) : quantity;
      if (!primaryQty || primaryQty <= 0) {
        return NextResponse.json(
          { error: "Could not convert item count to a primary quantity. Check the batch conversion (item count vs received qty)." },
          { status: 400 }
        );
      }
      if (itemQuantity > 0 && itemQuantity > (batch.itemCount || 0) - (batch.itemConsumed || 0)) {
        return NextResponse.json(
          { error: `Insufficient ${batch.itemUnit || "items"} in batch ${batch.batchNumber}. Available: ${(batch.itemCount || 0) - (batch.itemConsumed || 0)} ${batch.itemUnit || "items"}` },
          { status: 400 }
        );
      }
      if (primaryQty > batch.availableQuantity) {
        return NextResponse.json(
          { error: `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQuantity} ${batch.unit}` },
          { status: 400 }
        );
      }
      batch.availableQuantity -= primaryQty;
      batch.consumedQuantity += primaryQty;
      if (itemQuantity > 0) batch.itemConsumed = (batch.itemConsumed || 0) + itemQuantity;
      if (batch.availableQuantity <= 0) batch.status = "consumed";
      await batch.save();

      unitCost = batch.unitPrice || unitCost;
      unit = batch.unit || unit;
      batchRef = batch.batchNumber;
      itemConsumedQty = itemQuantity;
      itemUnit = itemQuantity > 0 ? batch.itemUnit : "";

      if (body.locationType && body.locationId) {
        const purpose =
          body.purpose || (body.type === "consumption" ? "production" : body.type) || "production";
        await RawMaterialConsumption.create({
          rawMaterialId: id,
          locationType: body.locationType,
          locationId: body.locationId,
          date: body.date ? new Date(body.date) : new Date(),
          purpose,
          allocations: [
            {
              batchId,
              quantity: primaryQty,
              unitCost: batch.unitPrice,
              itemCount: itemQuantity,
              itemUnit,
            },
          ],
          totalQuantity: primaryQty,
          totalCost: primaryQty * (batch.unitPrice || 0),
          notes: body.notes || "",
          createdBy: user.userId,
        });
      }
    }

    let currentStockAfter: number;
    if (batchId) {
      currentStockAfter = await recomputeMaterialStock(id);
    } else {
      material.currentStock = Math.max(0, material.currentStock - quantity);
      await material.save();
      currentStockAfter = material.currentStock;
    }

    await RawMaterialStockMovement.create({
      rawMaterialId: id,
      batchId: batchId || undefined,
      type: movementType,
      quantity: -primaryQty,
      unit,
      itemQuantity: itemConsumedQty > 0 ? -itemConsumedQty : 0,
      itemUnit,
      unitCost,
      reference: batchRef ? `${body.type || "consumption"} — batch ${batchRef}` : body.reference || "Manual consumption",
      referenceId: body.referenceId || undefined,
      notes: body.notes || "",
      performedBy: user.email || user.userId,
    });

    await logActivity({
      action: "updated",
      entity: "raw-material",
      entityId: id,
      description: `Consumed ${primaryQty} ${unit} of "${material.name}" (now ${currentStockAfter})${batchRef ? ` from batch ${batchRef}` : ""}${itemConsumedQty > 0 ? ` (${itemConsumedQty} ${itemUnit})` : ""}`,
      userId: user.userId,
      metadata: { quantity: primaryQty, newStock: currentStockAfter, type: movementType, batchId, itemQuantity: itemConsumedQty },
    });

    if (currentStockAfter < material.minimumStock) {
      notifyLowStock(material.name, currentStockAfter, material.minimumStock).catch(() => {});
    }

    return NextResponse.json(material);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
