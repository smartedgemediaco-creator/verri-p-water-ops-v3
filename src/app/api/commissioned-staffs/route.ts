import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CommissionedStaff, CommissionedStaffRecord } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const staff = await CommissionedStaff.find().sort({ createdAt: -1 }).lean();

  const enriched = await Promise.all(
    staff.map(async (s) => {
      const records = await CommissionedStaffRecord.find({ staffId: s._id }).lean();
      const totalOwed = records.reduce((sum, r) => sum + (r.totalOwed || 0), 0);
      const totalLoaded = records.reduce((sum, r) => sum + (r.stockLoaded || 0), 0);
      const totalReturned = records.reduce((sum, r) => sum + (r.stockReturned || 0), 0);
      const totalPaid = records.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
      const totalExpected = records.reduce((sum, r) => sum + (r.expectedAmount || 0), 0);
      return {
        ...s,
        totalOwed,
        totalLoaded,
        totalReturned,
        totalPaid,
        totalExpected,
        totalRecords: records.length,
      };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();

  if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!body.dealPrice && body.dealPrice !== 0) return NextResponse.json({ error: "Deal price is required" }, { status: 400 });

  const staff = await CommissionedStaff.create({
    name: body.name,
    phone: body.phone || "",
    email: body.email || "",
    dealPrice: Number(body.dealPrice),
    isActive: body.isActive !== false,
    notes: body.notes || "",
  });

  await logActivity({
    action: "created",
    entity: "commissioned-staff",
    entityId: staff._id.toString(),
    description: `Created commissioned staff "${body.name}" at ₦${body.dealPrice}/bag`,
    userId: user.userId,
    metadata: { name: body.name, dealPrice: body.dealPrice },
  });

  return NextResponse.json(staff, { status: 201 });
}
