import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Staff, Attendance, Leave, StaffUserLink } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const staffId = new mongoose.Types.ObjectId(id);

  const [staff, attendanceAgg, leaveAgg, userLink] = await Promise.all([
    Staff.findById(staffId),
    Attendance.aggregate([
      { $match: { staffId } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]),
    Leave.aggregate([
      { $match: { staffId, status: "approved" } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]),
    StaffUserLink.findOne({ staffId }),
  ]);

  const salary = staff?.salary ?? 0;
  const department = staff?.department ?? "";
  const startDate = staff?.startDate ? new Date(staff.startDate) : null;
  const tenureMonths = startDate ? Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;
  const attendanceCount = attendanceAgg[0]?.count ?? 0;
  const approvedLeaveCount = leaveAgg[0]?.count ?? 0;
  const hasUserAccount = !!userLink;

  return NextResponse.json({
    salary,
    department,
    tenureMonths,
    attendanceCount,
    approvedLeaveCount,
    hasUserAccount,
  });
}
