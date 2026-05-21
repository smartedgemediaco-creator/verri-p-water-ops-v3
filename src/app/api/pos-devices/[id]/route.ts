import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PosDevice } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const device = await PosDevice.findByIdAndUpdate(id, body, { new: true });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "pos-device",
    entityId: id,
    description: `Updated POS device "${device.name}"`,
    userId: user.userId,
    domainType: device.locationType,
    domainId: device.locationId.toString(),
    metadata: body,
  });

  return NextResponse.json(device);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const device = await PosDevice.findByIdAndDelete(id);
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "pos-device",
    entityId: id,
    description: `Deleted POS device "${device.name}" (${device.terminalSerial})`,
    userId: user.userId,
    domainType: device.locationType,
    domainId: device.locationId.toString(),
    metadata: { terminalSerial: device.terminalSerial },
  });

  return NextResponse.json({ success: true });
}
