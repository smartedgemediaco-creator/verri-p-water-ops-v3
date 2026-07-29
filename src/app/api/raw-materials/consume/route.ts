import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterialConsumption, RawMaterialBatch, RawMaterial, RawMaterialStockMovement } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyLowStock } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const body = await req.json();

  if (!body.rawMaterialId || !body.locationType || !body.locationId) {
    return NextResponse.json({ error: "rawMaterialId, locationType, and locationId are required" }, { status: 400 });
  }

  const allocations = body.allocations as Array<{
    batchId: string;
    quantity: number;
    itemCount?: number;
  }>;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return NextResponse.json({ error: "At least one batch allocation is required" }, { status: 400 });
  }

  const material = await RawMaterial.findById(body.rawMaterialId);
  if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

  const processedAllocations: Array<{
    batchId: string;
    quantity: number;
    unitCost: number;
    itemCount: number;
  }> = [];
  let totalQuantity = 0;
  let totalCost = 0;

  for (const alloc of allocations) {
    const qty = Number(alloc.quantity);
    if (!qty || qty <= 0) {
      return NextResponse.json({ error: `Invalid quantity for batch ${alloc.batchId}` }, { status: 400 });
    }

    const batch = await RawMaterialBatch.findById(alloc.batchId);
    if (!batch) {
      return NextResponse.json({ error: `Batch ${alloc.batchId} not found` }, { status: 400 });
    }
    if (qty > batch.availableQuantity) {
      return NextResponse.json(
        { error: `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.availableQuantity} ${batch.unit}` },
        { status: 400 }
      );
    }

    batch.availableQuantity -= qty;
    batch.consumedQuantity += qty;
    if (batch.availableQuantity <= 0) batch.status = "consumed";
    await batch.save();

    processedAllocations.push({
      batchId: alloc.batchId,
      quantity: qty,
      unitCost: batch.unitPrice,
      itemCount: Number(alloc.itemCount) || 0,
    });

    totalQuantity += qty;
    totalCost += qty * batch.unitPrice;

    await RawMaterialStockMovement.create({
      rawMaterialId: body.rawMaterialId,
      type: body.purpose === "wastage" ? "waste" : "consumption",
      quantity: -qty,
      unit: batch.unit,
      unitCost: batch.unitPrice,
      reference: `${body.purpose || "consumption"} — batch ${batch.batchNumber}`,
      notes: body.notes || "",
      performedBy: user.email || user.userId,
    });
  }

  const consumption = await RawMaterialConsumption.create({
    rawMaterialId: body.rawMaterialId,
    locationType: body.locationType,
    locationId: body.locationId,
    date: body.date ? new Date(body.date) : new Date(),
    purpose: body.purpose || "production",
    referenceId: body.referenceId || null,
    referenceModel: body.referenceModel || "",
    allocations: processedAllocations,
    totalQuantity,
    totalCost,
    notes: body.notes || "",
    createdBy: user.userId,
  });

  material.currentStock -= totalQuantity;
  await material.save();

  await logActivity({
    action: "updated",
    entity: "raw-material",
    entityId: body.rawMaterialId,
    description: `Consumed ${totalQuantity} ${material.unit} of "${material.name}" (${processedAllocations.length} batches) — now ${material.currentStock} ${material.unit}`,
    userId: user.userId,
    metadata: { totalQuantity, totalCost, purpose: body.purpose, batchCount: processedAllocations.length },
  });

  if (material.currentStock < material.minimumStock) {
    notifyLowStock(material.name, material.currentStock, material.minimumStock).catch(() => {});
  }

  return NextResponse.json(consumption, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
