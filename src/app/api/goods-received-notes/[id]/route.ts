import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { GoodsReceivedNote } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const note = await GoodsReceivedNote.findById(id).populate({
    path: "purchaseOrderId",
    populate: { path: "supplierId", select: "name" },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const note = await GoodsReceivedNote.findByIdAndDelete(id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "goods-received-note",
    entityId: id,
    description: `Deleted goods received note for PO ${note.purchaseOrderId}`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
