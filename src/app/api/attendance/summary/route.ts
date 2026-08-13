import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Attendance, Staff, StaffAssignment, Factory, Depot } from "@/lib/models";
import { getUserFromRequest, getScopeFilter } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const locationType = searchParams.get("locationType");
  const locationId = searchParams.get("locationId");

  if (!month) return NextResponse.json({ error: "Month is required (YYYY-MM)" }, { status: 400 });

  const scopeFilter = getScopeFilter(user);

  const assignmentFilter: Record<string, unknown> = { isActive: true };
  if (locationType && locationId) {
    assignmentFilter.locationType = locationType;
    assignmentFilter.locationId = locationId;
  } else if (scopeFilter.locationType && scopeFilter.locationId) {
    assignmentFilter.locationType = scopeFilter.locationType;
    assignmentFilter.locationId = scopeFilter.locationId;
  }

  const assignments = await StaffAssignment.find(assignmentFilter).lean();
  const staffIds = assignments.map((a) => a.staffId);

  const staff = await Staff.find({ _id: { $in: staffIds }, isActive: true })
    .sort({ name: 1 })
    .lean();

  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNum, 1));

  const attendanceRecords = await Attendance.find({
    staffId: { $in: staffIds },
    date: { $gte: monthStart, $lt: monthEnd },
  }).lean();

  const totalDaysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  let workingDays = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const day = new Date(year, monthNum - 1, d);
    const dow = day.getDay();
    if (dow !== 0 && dow !== 6) workingDays++;
  }

  const needLocationLabels = !locationType && !locationId && !scopeFilter.locationType;
  const locationLabelMap = new Map<string, string>();
  if (needLocationLabels) {
    const factoryIds = [...new Set(assignments.filter((a) => a.locationType === "factory").map((a) => a.locationId.toString()))];
    const depotIds = [...new Set(assignments.filter((a) => a.locationType === "depot").map((a) => a.locationId.toString()))];

    if (factoryIds.length > 0) {
      const factories = await Factory.find({ _id: { $in: factoryIds } }).select("name").lean();
      for (const f of factories) locationLabelMap.set(f._id.toString(), f.name);
    }
    if (depotIds.length > 0) {
      const depots = await Depot.find({ _id: { $in: depotIds } }).select("name").lean();
      for (const d of depots) locationLabelMap.set(d._id.toString(), d.name);
    }
  }

  const summary = staff.map((s) => {
    const staffRecords = attendanceRecords.filter((r) => r.staffId.toString() === s._id.toString());
    const counts = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0 };
    let totalLateAmount = 0;
    let totalAbsenceAmount = 0;
    let totalHalfDayAmount = 0;
    for (const rec of staffRecords) {
      if (rec.status === "present") counts.present++;
      else if (rec.status === "absent") { counts.absent++; totalAbsenceAmount += rec.absenceAmount || 0; }
      else if (rec.status === "late") { counts.late++; totalLateAmount += rec.lateAmount || 0; }
      else if (rec.status === "half-day") { counts.halfDay++; totalHalfDayAmount += rec.halfDayAmount || 0; }
      else if (rec.status === "leave") counts.leave++;
    }
    const totalRecorded = counts.present + counts.absent + counts.late + counts.halfDay + counts.leave;
    const assignment = assignments.find((a) => a.staffId.toString() === s._id.toString());
    const locationLabel = needLocationLabels && assignment
      ? locationLabelMap.get(assignment.locationId.toString()) ?? ""
      : undefined;
    return {
      staffId: s._id,
      name: s.name,
      salary: s.salary,
      locationLabel,
      ...counts,
      totalLateAmount,
      totalAbsenceAmount,
      totalHalfDayAmount,
      totalRecorded,
      workingDays,
      attendanceRate: totalRecorded > 0 ? Math.round((counts.present + counts.late + counts.halfDay) / totalRecorded * 100) : 0,
    };
  });

  return NextResponse.json({ month, workingDays, summary });
}
