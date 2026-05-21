import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Depot } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (user.role === "depot-manager" && user.depotId) {
    filter._id = user.depotId;
  }

  const depots = await Depot.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(depots);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const depot = await Depot.create(body);

  await logActivity({
    action: "created",
    entity: "depot",
    entityId: depot._id.toString(),
    description: `Created depot "${body.name}" at ${body.location}`,
    userId: user.userId,
    domainType: "depot",
    domainId: depot._id.toString(),
    metadata: { name: body.name, location: body.location },
  });

  return NextResponse.json(depot, { status: 201 });
}
