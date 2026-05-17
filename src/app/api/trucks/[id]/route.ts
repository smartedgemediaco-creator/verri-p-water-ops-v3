import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Truck } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    userId: user?.userId,
    metadata: { changes: body },
  });

  return NextResponse.json(truck);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  const { id } = await params;
  await connectDB();
  const truck = await Truck.findByIdAndDelete(id);
  if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "truck",
    entityId: id,
    description: `Deleted truck "${truck.plateNumber}"`,
    userId: user?.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
