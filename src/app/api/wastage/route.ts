import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Wastage, Factory, Depot, Truck, Product, Stock, Sale } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyWastage } from "@/lib/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function populateLocation(item: any) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : item;
  if (obj.locationType === "factory") {
    const loc = await Factory.findById(obj.locationId).select("name").lean();
    obj.locationName = loc?.name ?? null;
  } else if (obj.locationType === "depot") {
    const loc = await Depot.findById(obj.locationId).select("name").lean();
    obj.locationName = loc?.name ?? null;
  } else if (obj.locationType === "truck") {
    const loc = await Truck.findById(obj.locationId).select("plateNumber").lean();
    obj.locationName = loc ? `Truck ${loc.plateNumber}` : null;
  }
  return obj;
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "factory-manager" && user.role !== "depot-manager" && user.role !== "driver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();

  if (user.role === "factory-manager") {
    body.locationType = "factory";
    body.locationId = user.factoryId;
  } else if (user.role === "depot-manager") {
    body.locationType = "depot";
    body.locationId = user.depotId;
  } else if (user.role === "driver") {
    body.locationType = "truck";
    body.locationId = user.truckId;
  }

  const deductFromStock = body.deductFromStock === true || body.deductFromStock === "true";
  const recordAsSale = body.recordAsSale === true || body.recordAsSale === "true";
  const wastage = await Wastage.create({
    ...body,
    deductFromStock,
    recordAsSale,
    saleUnitPrice: Number(body.saleUnitPrice) || 0,
    customerName: body.customerName || "",
  });

  if (deductFromStock) {
    await Stock.findOneAndUpdate(
      { locationType: body.locationType, locationId: body.locationId, productId: body.productId },
      { $inc: { quantity: -Math.abs(Number(body.quantity)) } },
      { upsert: true }
    );
  }

  let saleRecord = null;
  if (recordAsSale) {
    const qty = Number(body.quantity) || 0;
    const unitPrice = Number(body.saleUnitPrice) || 0;
    const bulkPrice = Number(body.saleBulkPrice) || 0;
    const totalAmount = body.salePriceMode === "bulk" ? bulkPrice : unitPrice * qty;
    saleRecord = await Sale.create({
      locationType: body.locationType,
      locationId: body.locationId,
      productId: body.productId,
      quantity: qty,
      unitPrice: body.salePriceMode === "bulk" && qty > 0 ? bulkPrice / qty : unitPrice,
      totalAmount,
      customerName: body.customerName || "Leakage sale",
      paymentMethod: "cash",
      isPaid: true,
      condition: "ordinary",
      notes: `Leakage sale (${body.salePriceMode === "bulk" ? "bulk" : "unit"} price) — recorded via leakage entry`,
      date: body.date || new Date(),
    });
  }

  await logActivity({
    action: "created",
    entity: "wastage",
    entityId: wastage._id.toString(),
    description: `Recorded ${body.quantity} units ${body.source} spoilage at ${body.locationType}`,
    userId: user.userId,
    productId: body.productId,
    metadata: { quantity: body.quantity, source: body.source },
  });

  const prod = await Product.findById(body.productId).select("name").lean();
  const loc = body.locationType === "factory"
    ? await Factory.findById(body.locationId).select("name").lean()
    : body.locationType === "depot"
    ? await Depot.findById(body.locationId).select("name").lean()
    : await Truck.findById(body.locationId).select("plateNumber").lean();
  const locName = (loc as { name?: string; plateNumber?: string } | null)?.name ?? (loc as { plateNumber?: string } | null)?.plateNumber ?? body.locationType;

  notifyWastage(
    (prod as { name?: string } | null)?.name ?? "Unknown product",
    body.quantity,
    locName,
    body.source
  ).catch(() => {});

  return NextResponse.json({ wastage, sale: saleRecord }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const url = new URL(req.url);
  const locationType = url.searchParams.get("locationType");
  const locationId = url.searchParams.get("locationId");
  const productId = url.searchParams.get("productId");
  const source = url.searchParams.get("source");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const filter: Record<string, unknown> = {};

  if (user.role === "factory-manager" && user.factoryId) {
    filter.locationType = "factory";
    filter.locationId = user.factoryId;
  } else if (user.role === "depot-manager" && user.depotId) {
    filter.locationType = "depot";
    filter.locationId = user.depotId;
  } else if (user.role === "driver" && user.truckId) {
    filter.locationType = "truck";
    filter.locationId = user.truckId;
  }

  if (locationType && locationType !== "all") filter.locationType = locationType;
  if (locationId) filter.locationId = locationId;
  if (productId) filter.productId = productId;
  if (source && source !== "all") filter.source = source;

  if (startDate || endDate) {
    filter.date = {} as Record<string, unknown>;
    if (startDate) (filter.date as Record<string, unknown>).$gte = new Date(startDate);
    if (endDate) (filter.date as Record<string, unknown>).$lte = new Date(endDate + "T23:59:59.999Z");
  }

  const records = await Wastage.find(filter)
    .populate("productId")
    .sort({ date: -1 })
    .lean();

  const populated = await Promise.all(records.map(populateLocation));

  return NextResponse.json(populated);
}
