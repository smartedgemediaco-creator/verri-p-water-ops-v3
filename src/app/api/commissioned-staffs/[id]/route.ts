import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CommissionedStaff, CommissionedStaffRecord } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const staff = await CommissionedStaff.findById(id).lean();
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const records = await CommissionedStaffRecord.find({ staffId: id })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const totalOwed = records.reduce((sum, r) => sum + (r.totalOwed || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
  const totalLoaded = records.reduce((sum, r) => sum + (r.stockLoaded || 0), 0);
  const totalReturned = records.reduce((sum, r) => sum + (r.stockReturned || 0), 0);
  const totalExpected = records.reduce((sum, r) => sum + (r.expectedAmount || 0), 0);

  return NextResponse.json({
    ...staff,
    records,
    totalOwed,
    totalPaid,
    totalLoaded,
    totalReturned,
    totalExpected,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.phone !== undefined) update.phone = body.phone;
  if (body.email !== undefined) update.email = body.email;
  if (body.dealPrice !== undefined) update.dealPrice = Number(body.dealPrice);
  if (body.isActive !== undefined) update.isActive = body.isActive;
  if (body.notes !== undefined) update.notes = body.notes;

  const staff = await CommissionedStaff.findByIdAndUpdate(id, update, { new: true });
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "commissioned-staff",
    entityId: id,
    description: `Updated commissioned staff "${staff.name}"`,
    userId: user.userId,
    metadata: { name: staff.name },
  });

  return NextResponse.json(staff);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const staff = await CommissionedStaff.findByIdAndDelete(id);
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await CommissionedStaffRecord.deleteMany({ staffId: id });

  await logActivity({
    action: "deleted",
    entity: "commissioned-staff",
    entityId: id,
    description: `Deleted commissioned staff "${staff.name}"`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
