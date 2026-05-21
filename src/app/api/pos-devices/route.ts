import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PosDevice } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const url = new URL(req.url);
  const locationType = url.searchParams.get("locationType");
  const locationId = url.searchParams.get("locationId");

  const filter: Record<string, unknown> = {};
  if (locationType) filter.locationType = locationType;
  if (locationId) filter.locationId = locationId;

  const devices = await PosDevice.find(filter)
    .populate("locationId", "name plateNumber")
    .sort({ createdAt: -1 });

  return NextResponse.json(devices);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();

  const existing = await PosDevice.findOne({ terminalSerial: body.terminalSerial });
  if (existing) {
    return NextResponse.json({ error: "A device with this terminal serial already exists" }, { status: 409 });
  }

  const device = await PosDevice.create(body);

  await logActivity({
    action: "created",
    entity: "pos-device",
    entityId: device._id.toString(),
    description: `Registered POS device "${body.name}" (${body.terminalSerial}) at ${body.locationType}`,
    userId: user.userId,
    domainType: body.locationType,
    domainId: body.locationId,
    metadata: { terminalSerial: body.terminalSerial, provider: body.provider, name: body.name },
  });

  return NextResponse.json(device, { status: 201 });
}
