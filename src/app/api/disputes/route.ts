import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Dispute } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;

  if (user.role !== "admin" && user.role !== "factory-manager" && user.role !== "depot-manager") {
    filter.createdBy = user.userId;
  }

  const disputes = await Dispute.find(filter)
    .populate("createdBy", "name email")
    .populate("resolvedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(disputes);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();

  if (!body.entity || !body.entityId || !body.reason) {
    return NextResponse.json({ error: "Missing required fields: entity, entityId, reason" }, { status: 400 });
  }

  const dispute = await Dispute.create({
    entity: body.entity,
    entityId: body.entityId,
    entityLabel: body.entityLabel || "",
    reason: body.reason,
    description: body.description || "",
    createdBy: user.userId,
  });

  await logActivity({
    action: "created",
    entity: "dispute",
    entityId: dispute._id.toString(),
    description: `Dispute filed: ${body.reason} on ${body.entity}${body.entityLabel ? ` (${body.entityLabel})` : ""}`,
    userId: user.userId,
    metadata: { entity: body.entity, entityId: body.entityId, reason: body.reason },
  });

  return NextResponse.json(dispute, { status: 201 });
}
