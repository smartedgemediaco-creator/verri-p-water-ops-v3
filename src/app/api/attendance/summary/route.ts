import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Attendance, Staff, StaffAssignment } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "2026-07"
  const locationType = searchParams.get("locationType");
  const locationId = searchParams.get("locationId");

  if (!month) return NextResponse.json({ error: "Month is required (YYYY-MM)" }, { status: 400 });

  // Find active staff at this location
  const assignmentFilter: Record<string, unknown> = { isActive: true };
  if (locationType) assignmentFilter.locationType = locationType;
  if (locationId) assignmentFilter.locationId = locationId;

  const assignments = await StaffAssignment.find(assignmentFilter).lean();
  const staffIds = assignments.map((a) => a.staffId);

  const staff = await Staff.find({ _id: { $in: staffIds }, isActive: true })
    .sort({ name: 1 })
    .lean();

  // Get all attendance records for this month
  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setMilliseconds(-1);

  const attendanceRecords = await Attendance.find({
    staffId: { $in: staffIds },
    date: { $gte: monthStart, $lte: monthEnd },
  }).lean();

  // Calculate working days in month (exclude weekends)
  const totalDaysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const day = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
    const dow = day.getDay();
    if (dow !== 0 && dow !== 6) workingDays++;
  }

  // Aggregate per staff
  const summary = staff.map((s) => {
    const staffRecords = attendanceRecords.filter((r) => r.staffId.toString() === s._id.toString());
    const counts = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0 };
    for (const rec of staffRecords) {
      if (rec.status === "present") counts.present++;
      else if (rec.status === "absent") counts.absent++;
      else if (rec.status === "late") counts.late++;
      else if (rec.status === "half-day") counts.halfDay++;
      else if (rec.status === "leave") counts.leave++;
    }
    const totalRecorded = counts.present + counts.absent + counts.late + counts.halfDay + counts.leave;
    return {
      staffId: s._id,
      name: s.name,
      salary: s.salary,
      ...counts,
      totalRecorded,
      workingDays,
      attendanceRate: totalRecorded > 0 ? Math.round((counts.present + counts.late + counts.halfDay) / totalRecorded * 100) : 0,
    };
  });

  return NextResponse.json({ month, workingDays, summary });
}
