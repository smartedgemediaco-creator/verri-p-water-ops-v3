import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ServiceRecord } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const truckId = searchParams.get("truckId");
  const filter: Record<string, unknown> = {};
  if (truckId) filter.truckId = truckId;
  const records = await ServiceRecord.find(filter).populate("truckId", "plateNumber").sort({ date: -1 });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const record = await ServiceRecord.create(body);
  await logActivity({
    action: "created",
    entity: "service-record",
    entityId: record._id.toString(),
    description: `Service record for truck: ${body.serviceType}`,
    userId: user.userId,
    metadata: { truckId: body.truckId, serviceType: body.serviceType },
  });
  return NextResponse.json(record, { status: 201 });
}
