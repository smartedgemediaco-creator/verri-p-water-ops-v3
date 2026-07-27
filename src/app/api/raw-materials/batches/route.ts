import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterialBatch, RawMaterial } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const rawMaterialId = searchParams.get("rawMaterialId");
  const locationType = searchParams.get("locationType");
  const locationId = searchParams.get("locationId");
  const status = searchParams.get("status");
  const supplierId = searchParams.get("supplierId");

  const filter: Record<string, unknown> = {};
  if (rawMaterialId) filter.rawMaterialId = rawMaterialId;
  if (locationType) filter.locationType = locationType;
  if (locationId) filter.locationId = locationId;
  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;

  const batches = await RawMaterialBatch.find(filter)
    .populate("rawMaterialId", "name unit category")
    .populate("supplierId", "name")
    .populate("purchaseOrderId", "orderNumber")
    .populate("locationId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();

  if (!body.rawMaterialId || !body.locationType || !body.locationId) {
    return NextResponse.json({ error: "rawMaterialId, locationType, and locationId are required" }, { status: 400 });
  }

  const receivedQty = Number(body.receivedQuantity) || 0;
  const unitPrice = Number(body.unitPrice) || 0;

  const year = new Date().getFullYear();
  const count = await RawMaterialBatch.countDocuments();
  const batchNumber = `BATCH-${year}-${String(count + 1).padStart(4, "0")}`;

  const batch = await RawMaterialBatch.create({
    rawMaterialId: body.rawMaterialId,
    supplierId: body.supplierId || null,
    purchaseOrderId: body.purchaseOrderId || null,
    batchNumber,
    locationType: body.locationType,
    locationId: body.locationId,
    orderedQuantity: Number(body.orderedQuantity) || receivedQty,
    receivedQuantity: receivedQty,
    unit: body.unit || "kg",
    itemCount: Number(body.itemCount) || 0,
    itemUnit: body.itemUnit || "",
    unitPrice,
    totalCost: receivedQty * unitPrice,
    status: body.status || "received",
    receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    availableQuantity: receivedQty,
    consumedQuantity: 0,
    qualityNotes: body.qualityNotes || "",
    createdBy: user.userId,
  });

  await RawMaterial.findByIdAndUpdate(body.rawMaterialId, {
    $inc: {
      currentStock: receivedQty,
      totalReceived: receivedQty,
      totalBatchStock: receivedQty,
      batchCount: 1,
    },
    $set: { lastReceivedDate: new Date() },
  });

  await logActivity({
    action: "created",
    "entity": "raw-material-batch",
    entityId: batch._id.toString(),
    description: `Created batch ${batchNumber} — ${receivedQty} ${body.unit || "kg"} of material`,
    userId: user.userId,
    metadata: { batchNumber, receivedQty, unitPrice },
  });

  return NextResponse.json(batch, { status: 201 });
}
