import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Inventory } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const filter: Record<string, any> = {};

  if (user.role === "factory-manager" && user.factoryId) {
    filter.locationType = "factory";
    filter.locationId = user.factoryId;
  } else if (user.role === "depot-manager" && user.depotId) {
    filter.locationType = "depot";
    filter.locationId = user.depotId;
  }

  const inventory = await Inventory.find(filter).populate("productId").sort({ createdAt: -1 });
  return NextResponse.json(inventory);
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

  await logActivity({
    action: "created",
    entity: "inventory",
    entityId: item._id.toString(),
    description: `Added ${body.quantity} units of product ${body.productId} at ${body.locationType}`,
    userId: user.userId,
    domainType: body.locationType,
    domainId: body.locationId,
    productId: body.productId,
    metadata: { quantity: body.quantity },
  });

  return NextResponse.json(item, { status: 201 });
}
