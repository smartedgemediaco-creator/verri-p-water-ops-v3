import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ScheduledOperation } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

const FREQUENCY_DAYS: Record<string, number> = {
  "one-time": 0,
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

function calcNextDueDate(currentDue: Date, frequency: string, customDays?: number): Date {
  const days = frequency === "custom" ? (customDays ?? 30) : (FREQUENCY_DAYS[frequency] ?? 30);
  if (days === 0) return currentDue;
  const next = new Date(currentDue);
  next.setDate(next.getDate() + days);
  return next;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const item = await ScheduledOperation.findById(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  if (body.completedAt && body.autoReschedule !== false) {
    const current = await ScheduledOperation.findById(id);
    if (current && body.autoReschedule !== false) {
      body.dueDate = calcNextDueDate(
        current.dueDate,
        body.frequency ?? current.frequency,
        body.customDays ?? current.customDays
      );
      body.completedAt = new Date(body.completedAt);
    }
  }

  const item = await ScheduledOperation.findByIdAndUpdate(id, body, { new: true });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "scheduled-operation",
    entityId: id,
    description: `Updated maintenance record "${item.title}"`,
    userId: user.userId,
    metadata: { changes: body },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const item = await ScheduledOperation.findByIdAndDelete(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "scheduled-operation",
    entityId: id,
    description: `Deleted maintenance record "${item.title}"`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
