/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, Factory, Depot, Truck, PosDevice, Stock } from "@/lib/models";
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
  if (user.role !== "admin" && user.role !== "depot-manager" && user.role !== "factory-manager" && user.role !== "driver") {
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
  const paymentMethod = url.searchParams.get("paymentMethod");
  const creditStatus = url.searchParams.get("creditStatus");
  const locationTypeParam = url.searchParams.get("locationType");

  const filter: any = {};
  filter.status = { $ne: "cancelled" };

  if (user.role === "depot-manager" && user.depotId) {
    filter.locationType = "depot";
    filter.locationId = user.depotId;
  } else if (user.role === "factory-manager" && user.factoryId) {
    filter.locationType = "factory";
    filter.locationId = user.factoryId;
  } else if (user.role === "driver" && user.truckId) {
    filter.locationType = "truck";
    filter.locationId = user.truckId;
  } else if (locationTypeParam && (locationTypeParam === "factory" || locationTypeParam === "depot" || locationTypeParam === "truck")) {
    filter.locationType = locationTypeParam;
  }

  if (productId) filter.productId = productId;
  if (customerName) filter.customerName = { $regex: customerName, $options: "i" };
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (creditStatus === "unpaid") {
    filter.paymentMethod = "credit";
    filter.isPaid = false;
  }
  if (creditStatus === "paid") {
    filter.paymentMethod = "credit";
    filter.isPaid = true;
  }
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate + "T23:59:59.999Z");
  }

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate("productId")
      .populate("posDeviceId", "name terminalSerial")
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
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "depot-manager" && user.role !== "factory-manager" && user.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    if (user.role === "depot-manager") {
      body.locationType = "depot";
      body.locationId = user.depotId;
    } else if (user.role === "factory-manager") {
      body.locationType = "factory";
      body.locationId = user.factoryId;
    } else if (user.role === "driver") {
      body.locationType = "truck";
      body.locationId = user.truckId;
    }

    // Normalize date from DD/MM/YYYY to ISO
    if (body.date && typeof body.date === "string") {
      const parts = body.date.split("/");
      if (parts.length === 3) {
        body.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    if (!body.paymentMethod) body.paymentMethod = "cash";
    if (body.paymentMethod === "credit") {
      body.isPaid = body.isPaid ?? false;
      body.paidAmount = body.paidAmount ?? 0;
    } else {
      body.isPaid = true;
    }

    if (body.paymentMethod === "pos" && body.posDeviceId) {
      const device = await PosDevice.findById(body.posDeviceId);
      if (device && device.terminalSerial && !body.posTransactionRef) {
        body.posTransactionRef = `pos-${device.terminalSerial}-${Date.now()}`;
      }
    }

    // Sales deduct the sold quantity from inventory at the sale location.
    // Stock is allowed to go negative so revenue is never lost; callers are
    // warned when this happens via `stockWarning` in the response.
    const sale = await Sale.create(body);

    let stockWarning = false;
    let remainingStock = 0;
    const saleProductId = sale.productId;
    const saleLocationType = sale.locationType;
    const saleLocationId = sale.locationId;
    const saleQty = Number(sale.quantity) || 0;
    if (saleProductId && saleLocationType && saleLocationId && saleQty > 0) {
      const updated = await Stock.findOneAndUpdate(
        { locationType: saleLocationType, locationId: saleLocationId, productId: saleProductId },
        { $inc: { quantity: -saleQty } },
        { upsert: true, new: true }
      );
      remainingStock = Number(updated?.quantity) || 0;
      if (remainingStock < 0) stockWarning = true;
    }

    try {
      await logActivity({
        action: "created",
        entity: "sale",
        entityId: sale._id.toString(),
        description: `Sale of ${body.quantity} units from ${body.locationType} to ${body.customerName || "unknown"} — ₦${body.totalAmount?.toLocaleString()} [${body.paymentMethod}]`,
        userId: user.userId,
        domainType: body.locationType === "truck" ? "depot" : body.locationType,
        domainId: body.locationId,
        productId: body.productId,
        metadata: {
          locationType: body.locationType,
          quantity: body.quantity,
          totalAmount: body.totalAmount,
          customerName: body.customerName,
          paymentMethod: body.paymentMethod,
        },
      });
    } catch {
      console.error("Failed to log activity for sale", sale._id);
    }

    return NextResponse.json(
      { ...sale.toObject(), stockWarning, remainingStock },
      { status: 201 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("Sales POST error:", e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
