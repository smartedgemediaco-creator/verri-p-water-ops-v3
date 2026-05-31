import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Truck } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const trucks = await Truck.find({}).sort({ createdAt: -1 }).lean();
  return NextResponse.json(trucks);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const truck = await Truck.create(body);

  await logActivity({
    action: "created",
    entity: "truck",
    entityId: truck._id.toString(),
    description: `Added truck "${body.plateNumber}"`,
    userId: user.userId,
    metadata: { plateNumber: body.plateNumber },
  });

  return NextResponse.json(truck, { status: 201 });
}
