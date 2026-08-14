import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, RawMaterialBatch } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { sanitizeCustomFields } from "@/lib/rawMaterialStock";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const similar = searchParams.get("similar");
  const locationType = searchParams.get("locationType");
  const locationId = searchParams.get("locationId");

  if (similar) {
    const materials = await RawMaterial.find({
      name: { $regex: similar, $options: "i" },
    }).select("name unit category currentStock supplierId").populate("supplierId", "name").lean();
    return NextResponse.json(materials);
  }

  let filter: Record<string, unknown> = {};
  if (locationType && locationId) {
    const batchMaterialIds = await RawMaterialBatch.distinct("rawMaterialId", {
      locationType,
      locationId,
    });
    filter = { _id: { $in: batchMaterialIds } };
  }

  const materials = await RawMaterial.find(filter).populate("supplierId", "name").sort({ name: 1 });
  return NextResponse.json(materials);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const material = await RawMaterial.create({
    name: body.name,
    unit: body.unit || "kg",
    secondaryUnit: body.secondaryUnit || "",
    units: Array.isArray(body.units) ? body.units.filter((u: unknown) => typeof u === "string" && u.trim()) : [],
    category: body.category || "other",
    minimumStock: Number(body.minimumStock) || 0,
    unitCost: Number(body.unitCost) || 0,
    supplierId: body.supplierId || null,
    notes: body.notes || "",
    customFields: sanitizeCustomFields(body.customFields),
  });
  await logActivity({
    action: "created",
    entity: "raw-material",
    entityId: material._id.toString(),
    description: `Created raw material "${body.name}"`,
    userId: user.userId,
    metadata: { name: body.name },
  });
  return NextResponse.json(material, { status: 201 });
}
