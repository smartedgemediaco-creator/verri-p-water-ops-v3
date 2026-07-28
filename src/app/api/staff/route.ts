import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { Staff, Factory, Depot, Truck } from "@/lib/models";
import { StaffAssignment } from "@/lib/models/StaffAssignment";
import { DriverAssignment } from "@/lib/models/DriverAssignment";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

const locationModels: Record<string, typeof Factory | typeof Depot | typeof Truck> = {
  factory: Factory,
  depot: Depot,
  truck: Truck,
};

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const locationType = searchParams.get("locationType");
  const locationId = searchParams.get("locationId");

  const staff = await Staff.find({}).sort({ createdAt: -1 }).lean();

  const enriched = await Promise.all(
    staff.map(async (s) => {
      const assignment = await StaffAssignment.findOne({ staffId: s._id, isActive: true }).lean();
      let locationName: string | null = null;
      if (assignment?.locationType && assignment?.locationId) {
        const Model = locationModels[assignment.locationType];
        if (Model) {
          const loc = await Model.findById(assignment.locationId).lean();
          if (loc) {
            locationName = "plateNumber" in loc ? (loc as { plateNumber: string }).plateNumber : (loc as { name: string }).name;
          }
        }
      }
      return {
        ...s,
        role: assignment?.role ?? "other",
        department: assignment?.department ?? "administration",
        locationType: assignment?.locationType ?? null,
        locationId: assignment?.locationId ?? null,
        locationName,
      };
    })
  );

  let filtered = enriched;
  if (locationType) {
    filtered = filtered.filter((s) => s.locationType === locationType);
  }
  if (locationId) {
    filtered = filtered.filter((s) => s.locationId?.toString() === locationId);
  }
  if (user.role === "factory-manager" && user.factoryId) {
    filtered = filtered.filter((s) => s.locationType === "factory" && s.locationId?.toString() === user.factoryId);
  } else if (user.role === "depot-manager" && user.depotId) {
    filtered = filtered.filter((s) => s.locationType === "depot" && s.locationId?.toString() === user.depotId);
  } else if (user.role === "driver" && user.truckId) {
    filtered = filtered.filter((s) => s.locationType === "truck" && s.locationId?.toString() === user.truckId);
  }

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const { role, department, locationType, locationId, ...staffFields } = body;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [staff] = await Staff.create([staffFields], { session });

    if (locationType && locationId) {
      await StaffAssignment.create([{
        staffId: staff._id,
        locationType,
        locationId,
        role: role || "operator",
        department: department || "production",
        isActive: true,
      }], { session });

      if (role === "driver" && locationType === "truck") {
        await DriverAssignment.create([{
          staffId: staff._id,
          truckId: locationId,
          isActive: true,
        }], { session });
      }
    }

    await session.commitTransaction();

    await logActivity({
      action: "created",
      entity: "staff",
      entityId: staff._id.toString(),
      description: `Created staff "${body.name}" as ${role || "operator"}`,
      userId: user.userId,
      metadata: { name: body.name, role },
    });
    return NextResponse.json(staff, { status: 201 });
  } catch (err: unknown) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
