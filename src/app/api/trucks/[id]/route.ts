import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Truck, Staff, DriverAssignment } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const truck = await Truck.findById(id).lean();
  if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const assignment = await DriverAssignment.findOne({ truckId: id, isActive: true }).populate("staffId", "name phone email beneficiary addresses emergencyContacts").lean();
  const driver = assignment?.staffId as unknown as { _id: string; name: string; phone: string; email: string; beneficiary?: unknown; addresses?: unknown; emergencyContacts?: unknown } | null;
  return NextResponse.json({
    ...truck,
    driver: driver ? { _id: driver._id, name: driver.name, phone: driver.phone, email: driver.email, beneficiary: (driver as unknown as { beneficiary: unknown }).beneficiary, addresses: (driver as unknown as { addresses: unknown }).addresses, emergencyContacts: (driver as unknown as { emergencyContacts: unknown }).emergencyContacts } : null,
    driverAssignment: assignment ? { licenseNumber: (assignment as unknown as { licenseNumber: string }).licenseNumber, isActive: true } : null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const { driverId, licenseNumber, ...truckData } = body;
  const truck = await Truck.findByIdAndUpdate(id, truckData, { new: true });
  if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle optional driver assignment
  if (driverId !== undefined) {
    // Deactivate existing
    await DriverAssignment.updateMany({ truckId: id, isActive: true }, { $set: { isActive: false, endDate: new Date() } });
    if (driverId) {
      const staff = await Staff.findById(driverId).lean();
      if (!staff) return NextResponse.json({ error: "Driver staff not found" }, { status: 400 });
      const beneficiary = (staff as unknown as { beneficiary?: { name?: string; phone?: string; relationship?: string } }).beneficiary;
      if (!beneficiary?.name?.trim() || !beneficiary?.phone?.trim() || !beneficiary?.relationship?.trim()) {
        return NextResponse.json({ error: "Driver must have a beneficiary with name, phone and relationship" }, { status: 400 });
      }
      if (!staff.phone?.trim() || !staff.email?.trim()) {
        return NextResponse.json({ error: "Driver must have phone and email" }, { status: 400 });
      }
      await DriverAssignment.create({
        staffId: driverId,
        truckId: id,
        licenseNumber: licenseNumber || "",
        isActive: true,
      });
    }
  } else if (licenseNumber !== undefined) {
    await DriverAssignment.updateOne({ truckId: id, isActive: true }, { $set: { licenseNumber } });
  }

  await logActivity({
    action: "updated",
    entity: "truck",
    entityId: id,
    description: `Updated truck "${truck.plateNumber}"${driverId ? ` driver ${driverId}` : ""}`,
    userId: user.userId,
    metadata: { changes: body },
  });

  return NextResponse.json(truck);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const truck = await Truck.findByIdAndDelete(id);
  if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "truck",
    entityId: id,
    description: `Deleted truck "${truck.plateNumber}"`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
