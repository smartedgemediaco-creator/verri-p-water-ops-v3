import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Truck } from "@/lib/models";
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
  const truck = await Truck.findById(id);
  if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(truck);
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
  const truck = await Truck.findByIdAndUpdate(id, body, { new: true });
  if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "truck",
    entityId: id,
    description: `Updated truck "${truck.plateNumber}"`,
    userId: user.userId,
    metadata: { changes: body },
  });

  return NextResponse.json(truck);
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
  const truck = await Truck.findByIdAndDelete(id);
  if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "truck",
    entityId: id,
    description: `Deleted truck "${truck.plateNumber}"`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
