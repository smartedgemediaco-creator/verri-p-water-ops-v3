import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyProduction } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.bagsProduced !== undefined) update.bagsProduced = Number(body.bagsProduced);
  if (body.rate !== undefined) update.rate = Number(body.rate);
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.productId !== undefined) update.productId = body.productId;
  if (body.date !== undefined) update.date = new Date(body.date);

  if (update.bagsProduced !== undefined || update.rate !== undefined) {
    const existing = await DailyProduction.findById(id).lean();
    if (existing) {
      const bags = update.bagsProduced !== undefined ? Number(update.bagsProduced) : existing.bagsProduced;
      const rate = update.rate !== undefined ? Number(update.rate) : existing.rate;
      update.totalEarned = bags * rate;
    }
  }

  const record = await DailyProduction.findByIdAndUpdate(id, update, { new: true });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "daily-production",
    entityId: id,
    description: `Updated daily production record`,
    userId: user.userId,
  });

  return NextResponse.json(record);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const record = await DailyProduction.findByIdAndDelete(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "daily-production",
    entityId: id,
    description: `Deleted daily production record`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
