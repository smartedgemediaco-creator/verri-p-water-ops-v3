import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, RawMaterialBatch, RawMaterialStockMovement, RawMaterialConsumption } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyLowStock } from "@/lib/notifications";

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

    const quantity = Number(body.quantity);
    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    const material = await RawMaterial.findById(id);
    if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (quantity > material.currentStock) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${material.currentStock} ${material.unit}` },
        { status: 400 }
      );
    }

    const batchId = body.batchId;
    let unitCost = material.unitCost || 0;
    let unit = material.unit;
    let batchRef = "";
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
      if (quantity > batch.availableQuantity) {
        return NextResponse.json(
          { error: `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQuantity} ${batch.unit}` },
          { status: 400 }
        );
      }
      batch.availableQuantity -= quantity;
      batch.consumedQuantity += quantity;
      if (batch.availableQuantity <= 0) batch.status = "consumed";
      await batch.save();

      unitCost = batch.unitPrice || unitCost;
      unit = batch.unit || unit;
      batchRef = batch.batchNumber;

      if (body.locationType && body.locationId) {
        const purpose =
          body.purpose || (body.type === "consumption" ? "production" : body.type) || "production";
        await RawMaterialConsumption.create({
          rawMaterialId: id,
          locationType: body.locationType,
          locationId: body.locationId,
          date: body.date ? new Date(body.date) : new Date(),
          purpose,
          allocations: [{ batchId, quantity, unitCost: batch.unitPrice, itemCount: 0 }],
          totalQuantity: quantity,
          totalCost: quantity * (batch.unitPrice || 0),
          notes: body.notes || "",
          createdBy: user.userId,
        });
      }
    }

    material.currentStock -= quantity;
    await material.save();

    await RawMaterialStockMovement.create({
      rawMaterialId: id,
      batchId: batchId || undefined,
      type: movementType,
      quantity: -quantity,
      unit,
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
      description: `Consumed ${quantity} ${unit} of "${material.name}" (now ${material.currentStock})${batchRef ? ` from batch ${batchRef}` : ""}`,
      userId: user.userId,
      metadata: { quantity, newStock: material.currentStock, type: movementType, batchId },
    });

    if (material.currentStock < material.minimumStock) {
      notifyLowStock(material.name, material.currentStock, material.minimumStock).catch(() => {});
    }

    return NextResponse.json(material);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
