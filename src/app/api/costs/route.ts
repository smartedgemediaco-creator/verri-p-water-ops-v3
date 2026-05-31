import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cost, Factory, Depot, Truck } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

import { Staff } from "@/lib/models/Staff";

interface CostDoc {
  _id: string;
  locationType: string;
  locationId: string;
  locationName?: string;
  staffId?: string;
  staffName?: string;
  category: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

async function populateLocation(cost: CostDoc) {
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
  if (cost.category === "salary" && cost.staffId) {
    const s = await Staff.findById(cost.staffId).select("name").lean();
    cost.staffName = s?.name ?? "Unknown Staff";
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

  const { searchParams } = new URL(req.url);
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

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const category = searchParams.get("category");
  const locType = searchParams.get("locationType");
  const locId = searchParams.get("locationId");
  const search = searchParams.get("search");

  if (startDate) {
    filter.date = { ...(filter.date as object || {}), $gte: new Date(startDate) };
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.date = { ...(filter.date as object || {}), $lte: end };
  }
  if (category) filter.category = category;
  if (locType) filter.locationType = locType;
  if (locId) filter.locationId = locId;
  if (search) {
    filter.description = { $regex: search, $options: "i" };
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
  } catch (e: unknown) {
    console.error("Costs POST error:", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
