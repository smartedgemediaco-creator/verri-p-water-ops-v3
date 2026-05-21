import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Cost } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Only admins can edit cost records" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const old = await Cost.findById(id);
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldAmount = old.amount;
  const oldCategory = old.category;

  if (body.amount != null) old.amount = body.amount;
  if (body.category) old.category = body.category;
  if (body.description != null) old.description = body.description;
  if (body.date) old.date = body.date;

  await old.save();

  const changes: string[] = [];
  if (oldAmount !== old.amount) changes.push(`amount ₦${oldAmount?.toLocaleString()}→₦${old.amount?.toLocaleString()}`);
  if (oldCategory !== old.category) changes.push(`category ${oldCategory}→${old.category}`);

  await logActivity({
    action: "updated",
    entity: "cost",
    entityId: id,
    description: `Admin edited cost #${id.slice(-6)}: ${changes.join(", ") || "fields updated"}`,
    userId: user.userId,
    metadata: { changes: body, oldAmount, oldCategory },
  });

  return NextResponse.json(old);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Only admins can delete cost records" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const cost = await Cost.findByIdAndDelete(id);
  if (!cost) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "cost",
    entityId: id,
    description: `Admin deleted cost #${id.slice(-6)} — ${cost.category} ₦${cost.amount?.toLocaleString()}`,
    userId: user.userId,
    metadata: { category: cost.category, amount: cost.amount },
  });

  return NextResponse.json({ message: "Deleted" });
}
