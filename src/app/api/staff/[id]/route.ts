import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { Staff } from "@/lib/models";
import { StaffAssignment } from "@/lib/models/StaffAssignment";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const staff = await Staff.findById(id).lean();
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignment = await StaffAssignment.findOne({ staffId: staff._id, isActive: true }).lean();
  return NextResponse.json({
    ...staff,
    role: assignment?.role ?? "other",
    department: assignment?.department ?? "administration",
    locationType: assignment?.locationType ?? null,
    locationId: assignment?.locationId ?? null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const { role, department, locationType, locationId, ...staffFields } = body;

  const staff = await Staff.findByIdAndUpdate(id, staffFields, { new: true });
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role || department || locationType || locationId) {
    if (locationType && locationId) {
      await StaffAssignment.updateOne(
        { staffId: new mongoose.Types.ObjectId(id), isActive: true },
        { $set: { role: role || "operator", department: department || "production", locationType, locationId } },
        { upsert: true }
      );
    }
  }

  await logActivity({
    action: "updated",
    entity: "staff",
    entityId: id,
    description: `Updated staff "${staff.name}"`,
    userId: user.userId,
  });
  return NextResponse.json(staff);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await connectDB();
  const staff = await Staff.findByIdAndDelete(id);
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await StaffAssignment.deleteMany({ staffId: id });

  await logActivity({
    action: "deleted",
    entity: "staff",
    entityId: id,
    description: `Deleted staff "${staff.name}"`,
    userId: user.userId,
  });
  return NextResponse.json({ message: "Deleted" });
}
