import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterialBatch, RawMaterial, RawMaterialStockMovement } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyLowStock } from "@/lib/notifications";

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
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const onlyAvailable = searchParams.get("onlyAvailable") === "1";

  const filter: Record<string, unknown> = {};
  if (rawMaterialId) filter.rawMaterialId = rawMaterialId;
  if (locationType) filter.locationType = locationType;
  if (locationId) filter.locationId = locationId;
  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;
  if (onlyAvailable) filter.availableQuantity = { $gt: 0 };

  if (category) {
    const catMaterials = await RawMaterial.find({ category }).distinct("_id");
    filter.rawMaterialId = { $in: catMaterials };
  }

  if (search) {
    const nameMatch = await RawMaterial.find({ name: { $regex: search, $options: "i" } }).distinct("_id");
    filter.$or = [
      { batchNumber: { $regex: search, $options: "i" } },
      { supplierName: { $regex: search, $options: "i" } },
      { rawMaterialId: { $in: nameMatch } },
    ];
  }

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
  const itemCount = Number(body.itemCount) || 0;
  const paidAmount = Number(body.paidAmount) || 0;
  const amountOwed = Number(body.amountOwed) || 0;
  const manualTotal = paidAmount + amountOwed;
  const suggestedTotal = receivedQty * unitPrice;
  const totalCost = manualTotal > 0 ? manualTotal : suggestedTotal;
  const paymentStatus =
    body.paymentStatus ||
    (manualTotal > 0
      ? amountOwed <= 0
        ? "paid"
        : paidAmount > 0
        ? "partial"
        : "unpaid"
      : "unpaid");

  const year = new Date().getFullYear();
  const count = await RawMaterialBatch.countDocuments();
  const batchNumber = body.batchNumber || `BATCH-${year}-${String(count + 1).padStart(4, "0")}`;

  const batch = await RawMaterialBatch.create({
    rawMaterialId: body.rawMaterialId,
    supplierId: body.supplierId || null,
    supplierName: body.supplierName || "",
    purchaseOrderId: body.purchaseOrderId || null,
    batchNumber,
    locationType: body.locationType,
    locationId: body.locationId,
    orderedQuantity: Number(body.orderedQuantity) || receivedQty,
    receivedQuantity: receivedQty,
    unit: body.unit || "kg",
    itemCount,
    itemUnit: body.itemUnit || "",
    conversionNote: body.conversionNote || "",
    unitPrice,
    totalCost,
    paidAmount,
    amountOwed,
    paymentStatus,
    status: body.status || "received",
    receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    availableQuantity: receivedQty,
    consumedQuantity: 0,
    qualityNotes: body.qualityNotes || "",
    orderNotes: body.orderNotes || "",
    createdBy: user.userId,
  });

  const material = await RawMaterial.findById(body.rawMaterialId);
  if (material) {
    material.currentStock += receivedQty;
    if (body.supplierId) material.supplierId = body.supplierId;
    if (unitPrice > 0) material.unitCost = unitPrice;
    await material.save();

    await RawMaterialStockMovement.create({
      rawMaterialId: body.rawMaterialId,
      batchId: batch._id,
      type: "purchase",
      quantity: receivedQty,
      unit: body.unit || material.unit,
      unitCost: unitPrice,
      reference: `Batch ${batchNumber}`,
      notes: [body.conversionNote, body.qualityNotes || body.orderNotes].filter(Boolean).join(" — ") || "",
      performedBy: user.email || user.userId,
    });

    if (material.currentStock < material.minimumStock) {
      notifyLowStock(material.name, material.currentStock, material.minimumStock).catch(() => {});
    }
  }

  await logActivity({
    action: "created",
    entity: "raw-material-batch",
    entityId: batch._id.toString(),
    description: `Created batch ${batchNumber} — ${receivedQty} ${body.unit || "kg"} of material (${paidAmount.toLocaleString()} paid, ${amountOwed.toLocaleString()} owed)`,
    userId: user.userId,
    metadata: { batchNumber, receivedQty, unitPrice, paidAmount, amountOwed, locationType: body.locationType, locationId: body.locationId },
  });

  return NextResponse.json(batch, { status: 201 });
}
