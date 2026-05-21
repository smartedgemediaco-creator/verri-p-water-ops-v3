import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Inventory, Product, Factory, Depot, Truck } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

async function populateLocation(
  item: Record<string, unknown> & { toObject?: () => Record<string, unknown> }
) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : item;
  if (obj.locationType === "factory") {
    const loc = await Factory.findById(obj.locationId).select("name").lean();
    obj.locationName = (loc as { name?: string } | null)?.name ?? null;
  } else if (obj.locationType === "depot") {
    const loc = await Depot.findById(obj.locationId).select("name").lean();
    obj.locationName = (loc as { name?: string } | null)?.name ?? null;
  } else if (obj.locationType === "truck") {
    const loc = await Truck.findById(obj.locationId).select("plateNumber").lean();
    obj.locationName = loc ? `Truck ${(loc as { plateNumber?: string }).plateNumber}` : null;
  }
  return obj;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const url = new URL(req.url);
  const locationType = url.searchParams.get("locationType");
  const locationId = url.searchParams.get("locationId");
  const productId = url.searchParams.get("productId");

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
  } else if (!user.role || user.role === "admin") {
    // admins and unbound users can filter by query params
    if (locationType && locationType !== "all") filter.locationType = locationType;
    if (locationId) filter.locationId = locationId;
  }

  if (productId) filter.productId = productId;

  const inventory = await Inventory.find(filter).populate("productId").sort({ createdAt: -1 }).lean();
  const populated = await Promise.all(inventory.map(populateLocation));
  return NextResponse.json(populated);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "factory-manager" && user.role !== "depot-manager") {
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
  }

  const item = await Inventory.create(body);

  const prod = await Product.findById(body.productId).select("name").lean();

  await logActivity({
    action: "created",
    entity: "inventory",
    entityId: item._id.toString(),
    description: `Added ${body.quantity} units of ${(prod as { name?: string } | null)?.name ?? body.productId} at ${body.locationType}`,
    userId: user.userId,
    domainType: body.locationType,
    domainId: body.locationId,
    productId: body.productId,
    metadata: { quantity: body.quantity },
  });

  return NextResponse.json(item, { status: 201 });
}
