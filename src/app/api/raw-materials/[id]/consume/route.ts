import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, RawMaterialStockMovement } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyLowStock } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  material.currentStock -= quantity;
  material.totalConsumed += quantity;
  material.lastConsumedDate = new Date();
  await material.save();

  await RawMaterialStockMovement.create({
    rawMaterialId: id,
    type: body.type || "consumption",
    quantity: -quantity,
    unit: material.unit,
    unitCost: material.unitCost,
    reference: body.reference || "Manual consumption",
    referenceId: body.referenceId || undefined,
    notes: body.notes || "",
    performedBy: user.email || user.userId,
  });

  await logActivity({
    action: "updated",
    entity: "raw-material",
    entityId: id,
    description: `Consumed ${quantity} ${material.unit} of "${material.name}" (now ${material.currentStock})`,
    userId: user.userId,
    metadata: { quantity, newStock: material.currentStock, type: body.type || "consumption" },
  });

  if (material.currentStock < material.minimumStock) {
    notifyLowStock(material.name, material.currentStock, material.minimumStock).catch(() => {});
  }

  return NextResponse.json(material);
}
