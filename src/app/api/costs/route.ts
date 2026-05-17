import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cost } from "@/lib/models";
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

  const costs = await Cost.find(filter).sort({ date: -1 });
  return NextResponse.json(costs);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();

  if (user.role === "factory-manager" && user.factoryId) {
    body.locationType = "factory";
    body.locationId = user.factoryId;
  } else if (user.role === "depot-manager" && user.depotId) {
    body.locationType = "depot";
    body.locationId = user.depotId;
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
}
