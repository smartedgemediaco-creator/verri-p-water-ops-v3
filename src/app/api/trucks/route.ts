import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Truck, Staff, DriverAssignment } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const trucks = await Truck.find({}).sort({ createdAt: -1 }).lean();
  // Enrich with driver info for list view
  const enriched = await Promise.all(
    trucks.map(async (t) => {
      const assignment = await DriverAssignment.findOne({ truckId: t._id, isActive: true }).populate("staffId", "name phone email beneficiary").lean();
      const driver = assignment?.staffId as unknown as { _id: string; name: string; phone: string; email: string; beneficiary?: { name: string; phone: string; relationship: string } } | null;
      return {
        ...t,
        driver: driver ? { _id: driver._id, name: driver.name, phone: driver.phone, email: driver.email, beneficiary: driver.beneficiary } : null,
        driverAssignment: assignment ? { licenseNumber: (assignment as unknown as { licenseNumber: string }).licenseNumber, isActive: true } : null,
      };
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
  const { driverId, licenseNumber, ...truckData } = body;
  const truck = await Truck.create(truckData);

  // Optionally assign driver (staff) – must have beneficiary and contacts
  if (driverId) {
    const staff = await Staff.findById(driverId).lean();
    if (!staff) {
      await Truck.findByIdAndDelete(truck._id);
      return NextResponse.json({ error: "Driver staff not found" }, { status: 400 });
    }
    const beneficiary = (staff as unknown as { beneficiary?: { name?: string; phone?: string; relationship?: string } }).beneficiary;
    if (!beneficiary?.name?.trim() || !beneficiary?.phone?.trim() || !beneficiary?.relationship?.trim()) {
      await Truck.findByIdAndDelete(truck._id);
      return NextResponse.json({ error: "Driver must have a beneficiary with name, phone and relationship" }, { status: 400 });
    }
    if (!staff.phone?.trim() || !staff.email?.trim()) {
      await Truck.findByIdAndDelete(truck._id);
      return NextResponse.json({ error: "Driver must have phone and email" }, { status: 400 });
    }
    await DriverAssignment.create({
      staffId: driverId,
      truckId: truck._id,
      licenseNumber: licenseNumber || "",
      isActive: true,
    });
  }

  await logActivity({
    action: "created",
    entity: "truck",
    entityId: truck._id.toString(),
    description: `Added truck "${body.plateNumber}"${driverId ? ` with driver ${driverId}` : ""}`,
    userId: user.userId,
    metadata: { plateNumber: body.plateNumber, driverId },
  });

  return NextResponse.json(truck, { status: 201 });
}
