import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Wastage } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Only admins can edit wastage records" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const old = await Wastage.findById(id);
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldQty = old.quantity;
  const oldSource = old.source;

  if (body.quantity != null) old.quantity = body.quantity;
  if (body.source) old.source = body.source;
  if (body.description != null) old.description = body.description;
  if (body.date) old.date = body.date;

  await old.save();

  const changes: string[] = [];
  if (oldQty !== old.quantity) changes.push(`qty ${oldQty}→${old.quantity}`);
  if (oldSource !== old.source) changes.push(`source ${oldSource}→${old.source}`);

  await logActivity({
    action: "updated",
    entity: "wastage",
    entityId: id,
    description: `Admin edited wastage (${old.source}): ${changes.join(", ") || "fields updated"}`,
    userId: user.userId,
    metadata: { changes: body, oldQty, oldSource },
  });

  return NextResponse.json(old);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Only admins can delete wastage records" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const wastage = await Wastage.findByIdAndDelete(id);
  if (!wastage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "wastage",
    entityId: id,
    description: `Admin deleted wastage — ${wastage.source} x${wastage.quantity}`,
    userId: user.userId,
    metadata: { source: wastage.source, quantity: wastage.quantity },
  });

  return NextResponse.json({ message: "Deleted" });
}
