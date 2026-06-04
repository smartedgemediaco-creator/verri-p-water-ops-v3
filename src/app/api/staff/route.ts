import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Staff } from "@/lib/models";
import { StaffAssignment } from "@/lib/models/StaffAssignment";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

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
      return {
        ...s,
        role: assignment?.role ?? "other",
        department: assignment?.department ?? "administration",
        locationType: assignment?.locationType ?? null,
        locationId: assignment?.locationId ?? null,
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

  const staff = await Staff.create(staffFields);

  if (locationType && locationId) {
    await StaffAssignment.create({
      staffId: staff._id,
      locationType,
      locationId,
      role: role || "operator",
      department: department || "production",
      isActive: true,
    });
  }

  await logActivity({
    action: "created",
    entity: "staff",
    entityId: staff._id.toString(),
    description: `Created staff "${body.name}" as ${role || "operator"}`,
    userId: user.userId,
    metadata: { name: body.name, role },
  });
  return NextResponse.json(staff, { status: 201 });
}
