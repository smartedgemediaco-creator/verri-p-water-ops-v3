import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Depot } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const depot = await Depot.findById(id);
  if (!depot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(depot);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const depot = await Depot.findByIdAndUpdate(id, body, { new: true });
  if (!depot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "depot",
    entityId: id,
    description: `Updated depot "${depot.name}"`,
    userId: user.userId,
    domainType: "depot",
    domainId: id,
    metadata: { changes: body },
  });

  return NextResponse.json(depot);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const depot = await Depot.findByIdAndDelete(id);
  if (!depot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "depot",
    entityId: id,
    description: `Deleted depot "${depot.name}"`,
    userId: user.userId,
    domainType: "depot",
    domainId: id,
  });

  return NextResponse.json({ message: "Deleted" });
}
