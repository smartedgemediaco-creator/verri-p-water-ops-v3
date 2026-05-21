import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cost, Factory, Depot, Truck } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

async function populateLocation(cost: any) {
  if (!cost) return cost;
  if (cost.locationType === "factory") {
    const loc = await Factory.findById(cost.locationId).select("name").lean();
    cost.locationName = loc?.name ?? "Unknown Factory";
  } else if (cost.locationType === "depot") {
    const loc = await Depot.findById(cost.locationId).select("name").lean();
    cost.locationName = loc?.name ?? "Unknown Depot";
  } else if (cost.locationType === "truck") {
    const loc = await Truck.findById(cost.locationId).select("plateNumber").lean();
    cost.locationName = loc ? `Truck: ${loc.plateNumber}` : "Unknown Truck";
  }
  return cost;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "factory-manager" && user.role !== "depot-manager" && user.role !== "driver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const filter: Record<string, any> = {};
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

  const costs = await Cost.find(filter).lean().sort({ date: -1 });
  const populated = await Promise.all(costs.map(populateLocation));
  return NextResponse.json(populated);
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "factory-manager" && user.role !== "depot-manager" && user.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    if (user.role === "factory-manager" && user.factoryId) {
      body.locationType = "factory";
      body.locationId = user.factoryId;
    } else if (user.role === "depot-manager" && user.depotId) {
      body.locationType = "depot";
      body.locationId = user.depotId;
    } else if (user.role === "driver" && user.truckId) {
      body.locationType = "truck";
      body.locationId = user.truckId;
    }

    if (body.date && typeof body.date === "string") {
      const parts = body.date.split("/");
      if (parts.length === 3) {
        body.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const cost = await Cost.create(body);

    await logActivity({
      action: "created",
      entity: "cost",
      entityId: cost._id.toString(),
      description: `${body.category} cost of ₦${body.amount?.toLocaleString()} — ${body.description || "no description"}`,
      userId: user.userId,
      domainType: body.locationType,
      domainId: body.locationId,
      metadata: { category: body.category, amount: body.amount, description: body.description },
    });

    return NextResponse.json(cost, { status: 201 });
  } catch (e: any) {
    console.error("Costs POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
