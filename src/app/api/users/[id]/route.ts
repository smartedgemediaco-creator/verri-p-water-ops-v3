import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const updated = await User.findByIdAndUpdate(id, body, { new: true }).select("-password");
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "user",
    entityId: id,
    description: `Updated user "${updated.name}" (${updated.email})`,
    userId: currentUser.userId,
    metadata: { changes: body },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(_req);
  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "user",
    entityId: id,
    description: `Deleted user "${deleted.name}" (${deleted.email})`,
    userId: currentUser.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
