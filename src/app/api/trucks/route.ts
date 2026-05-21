import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Truck, Factory, Depot } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const trucks = await Truck.find({}).sort({ createdAt: -1 }).lean();

  const enriched = await Promise.all(
    trucks.map(async (t) => {
      const obj = t as Record<string, unknown>;
      if (obj.assignedToType === "factory" && mongoose.Types.ObjectId.isValid(obj.assignedToId as string)) {
        const f = await Factory.findById(obj.assignedToId).select("name").lean();
        obj.assignedToName = (f as { name?: string } | null)?.name ?? null;
      } else if (obj.assignedToType === "depot" && mongoose.Types.ObjectId.isValid(obj.assignedToId as string)) {
        const d = await Depot.findById(obj.assignedToId).select("name").lean();
        obj.assignedToName = (d as { name?: string } | null)?.name ?? null;
      }
      return obj;
    })
  );

  return NextResponse.json(enriched);
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
    description: `Added truck "${body.plateNumber}" driven by ${body.driverName}`,
    userId: user.userId,
    metadata: { plateNumber: body.plateNumber, driverName: body.driverName },
  });

  return NextResponse.json(truck, { status: 201 });
}
