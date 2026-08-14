import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, RawMaterialBatch } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyLowStock } from "@/lib/notifications";
import { sanitizeCustomFields } from "@/lib/rawMaterialStock";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const material = await RawMaterial.findById(id).populate("supplierId", "name");
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(material);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const allowedFields: Record<string, unknown> = {};
  for (const key of ["name", "unit", "category", "minimumStock", "unitCost", "supplierId", "notes"]) {
    if (key in body) allowedFields[key] = body[key];
  }
  if ("secondaryUnit" in body) allowedFields.secondaryUnit = body.secondaryUnit ?? "";
  if ("units" in body) {
    allowedFields.units = Array.isArray(body.units)
      ? body.units.filter((u: unknown) => typeof u === "string" && u.trim())
      : [];
  }
  if ("customFields" in body) allowedFields.customFields = sanitizeCustomFields(body.customFields);
  const material = await RawMaterial.findByIdAndUpdate(id, allowedFields, { new: true });
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await logActivity({
    action: "updated",
    entity: "raw-material",
    entityId: id,
    description: `Updated raw material "${material.name}"`,
    userId: user.userId,
  });
  if (material.currentStock < material.minimumStock) {
    notifyLowStock(material.name, material.currentStock, material.minimumStock).catch(() => {});
  }
  return NextResponse.json(material);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await connectDB();
  const batchCount = await RawMaterialBatch.countDocuments({ rawMaterialId: id });
  if (batchCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this material has ${batchCount} batch(es) with stock history. Delete the batches first.` },
      { status: 400 }
    );
  }
  const material = await RawMaterial.findByIdAndDelete(id);
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await logActivity({
    action: "deleted",
    entity: "raw-material",
    entityId: id,
    description: `Deleted raw material "${material.name}"`,
    userId: user.userId,
  });
  return NextResponse.json({ message: "Deleted" });
}
