import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Factory } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const factory = await Factory.findById(id);
  if (!factory) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(factory);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const factory = await Factory.findByIdAndUpdate(id, body, { new: true });
  if (!factory) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "factory",
    entityId: id,
    description: `Updated factory "${factory.name}"`,
    userId: user?.userId,
    domainType: "factory",
    domainId: id,
    metadata: { changes: body },
  });

  return NextResponse.json(factory);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  const { id } = await params;
  await connectDB();
  const factory = await Factory.findByIdAndDelete(id);
  if (!factory) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "factory",
    entityId: id,
    description: `Deleted factory "${factory.name}"`,
    userId: user?.userId,
    domainType: "factory",
    domainId: id,
  });

  return NextResponse.json({ message: "Deleted" });
}
