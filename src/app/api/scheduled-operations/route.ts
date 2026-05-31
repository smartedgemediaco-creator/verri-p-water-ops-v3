import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ScheduledOperation } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");

  const filter: Record<string, unknown> = {};

  if (status === "active") filter.isActive = true;
  else if (status === "completed") filter.completedAt = { $ne: null };
  else if (status === "overdue") {
    filter.isActive = true;
    filter.completedAt = null;
    filter.dueDate = { $lt: new Date() };
  }

  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (priority) filter.priority = priority;
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const items = await ScheduledOperation.find(filter).sort({ dueDate: 1 }).lean();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const item = await ScheduledOperation.create({ ...body, createdBy: user.userId });

  await logActivity({
    action: "created",
    entity: "scheduled-operation",
    entityId: item._id.toString(),
    description: `Created scheduled operation "${body.title}"`,
    userId: user.userId,
    metadata: { title: body.title, entityType: body.entityType, priority: body.priority },
  });

  return NextResponse.json(item, { status: 201 });
}
