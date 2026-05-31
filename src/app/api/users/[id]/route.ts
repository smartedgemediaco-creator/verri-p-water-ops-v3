import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { User, Staff } from "@/lib/models";
import { UserRole } from "@/lib/models/UserRole";
import { StaffUserLink } from "@/lib/models/StaffUserLink";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const { role, factoryId, depotId, truckId, staffId, ...userFields } = body;

  const updated = await User.findByIdAndUpdate(id, userFields, { new: true }).select("-password").lean();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (staffId) {
    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return NextResponse.json({ error: "Invalid staffId" }, { status: 400 });
    }
    const existingStaff = await Staff.findById(staffId);
    if (!existingStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }
    const existingLink = await StaffUserLink.findOne({ staffId, userId: { $ne: id } });
    if (existingLink) {
      return NextResponse.json({ error: "Staff member already linked to another user" }, { status: 409 });
    }
    await StaffUserLink.updateOne(
      { userId: id },
      { $set: { staffId } },
      { upsert: true }
    );
  }

  if (role) {
    let scopeType: string | undefined;
    let scopeId: string | undefined;
    if (factoryId) { scopeType = "factory"; scopeId = factoryId; }
    else if (depotId) { scopeType = "depot"; scopeId = depotId; }
    else if (truckId) { scopeType = "truck"; scopeId = truckId; }

    await UserRole.updateOne(
      { userId: id, isActive: true },
      { $set: { role, scopeType, scopeId } },
      { upsert: true }
    );
  }

  await logActivity({
    action: "updated",
    entity: "user",
    entityId: id,
    description: `Updated user "${updated.name}" (${updated.email})`,
    userId: currentUser.userId,
    metadata: { changes: body },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = getUserFromRequest(_req);
  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Promise.all([
    UserRole.deleteMany({ userId: id }),
    StaffUserLink.deleteMany({ userId: id }),
  ]);

  await logActivity({
    action: "deleted",
    entity: "user",
    entityId: id,
    description: `Deleted user "${deleted.name}" (${deleted.email})`,
    userId: currentUser.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
