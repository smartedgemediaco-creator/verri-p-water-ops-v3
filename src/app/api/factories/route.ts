import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Factory } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (user.role === "factory-manager" && user.factoryId) {
    filter._id = user.factoryId;
  }

  const factories = await Factory.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(factories);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const factory = await Factory.create(body);

  await logActivity({
    action: "created",
    entity: "factory",
    entityId: factory._id.toString(),
    description: `Created factory "${body.name}" at ${body.location}`,
    userId: user.userId,
    domainType: "factory",
    domainId: factory._id.toString(),
    metadata: { name: body.name, location: body.location },
  });

  return NextResponse.json(factory, { status: 201 });
}
