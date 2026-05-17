/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, Inventory, Factory, Depot, Truck } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

async function populateLocation(sale: any) {
  if (!sale) return sale;
  if (sale.locationType === "factory") {
    const loc = await Factory.findById(sale.locationId).select("name").lean();
    sale.location = loc ? { _id: loc._id, name: loc.name } : null;
  } else if (sale.locationType === "depot") {
    const loc = await Depot.findById(sale.locationId).select("name").lean();
    sale.location = loc ? { _id: loc._id, name: loc.name } : null;
  } else if (sale.locationType === "truck") {
    const loc = await Truck.findById(sale.locationId).select("plateNumber").lean();
    sale.location = loc ? { _id: loc._id, name: `Truck: ${loc.plateNumber}` } : null;
  }
  return sale;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "factory-manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));
  const skip = (page - 1) * limit;

  const productId = url.searchParams.get("productId");
  const customerName = url.searchParams.get("customerName");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const filter: any = {};

  if (user.role === "depot-manager" && user.depotId) {
    filter.locationType = "depot";
    filter.locationId = user.depotId;
  }

  if (productId) filter.productId = productId;
  if (customerName) filter.customerName = { $regex: customerName, $options: "i" };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate + "T23:59:59.999Z");
  }

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate("productId")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments(filter),
  ]);

  const populated = await Promise.all(sales.map(populateLocation));

  return NextResponse.json({
    sales: populated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "depot-manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();

  if (user.role === "depot-manager") {
    body.locationType = "depot";
    body.locationId = user.depotId;
  }

  const sale = await Sale.create(body);

  await Inventory.findOneAndUpdate(
    { locationType: body.locationType, locationId: body.locationId, productId: body.productId },
    { $inc: { quantity: -body.quantity } },
    { upsert: true }
  );

  await logActivity({
    action: "created",
    entity: "sale",
    entityId: sale._id.toString(),
    description: `Sale of ${body.quantity} units from ${body.locationType} to ${body.customerName || "unknown"} — ₦${body.totalAmount?.toLocaleString()}`,
    userId: user.userId,
    domainType: body.locationType === "truck" ? "depot" : body.locationType,
    domainId: body.locationId,
    productId: body.productId,
    metadata: { locationType: body.locationType, quantity: body.quantity, totalAmount: body.totalAmount, customerName: body.customerName },
  });

  return NextResponse.json(sale, { status: 201 });
}
