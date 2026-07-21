import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Attendance, Staff, StaffAssignment, Factory, Depot } from "@/lib/models";
import { getUserFromRequest, getScopeFilter } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const locationType = searchParams.get("locationType");
  const locationId = searchParams.get("locationId");

  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

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

  const dateStart = new Date(date + "T00:00:00.000Z");
  const dateEnd = new Date(date + "T23:59:59.999Z");
  const attendanceRecords = await Attendance.find({
    staffId: { $in: staffIds },
    date: { $gte: dateStart, $lte: dateEnd },
  }).lean();

  const attendanceMap = new Map<string, typeof attendanceRecords[0]>();
  for (const rec of attendanceRecords) {
    attendanceMap.set(rec.staffId.toString(), rec);
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

  const result = staff.map((s) => {
    const att = attendanceMap.get(s._id.toString());
    const assignment = assignments.find((a) => a.staffId.toString() === s._id.toString());
    const locationLabel = needLocationLabels && assignment
      ? locationLabelMap.get(assignment.locationId.toString()) ?? ""
      : undefined;
    return {
      staffId: s._id,
      name: s.name,
      avatar: (s as Record<string, unknown>).avatar ?? null,
      role: assignment?.role ?? "other",
      department: assignment?.department ?? "administration",
      locationLabel,
      attendanceId: att?._id ?? null,
      status: att?.status ?? "absent",
      lateAmount: att?.lateAmount ?? 0,
      absenceAmount: att?.absenceAmount ?? 0,
      halfDayAmount: att?.halfDayAmount ?? 0,
      notes: att?.notes ?? "",
      clockIn: att?.clockIn ?? null,
      clockOut: att?.clockOut ?? null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const body = await req.json();
  const { date, records } = body;

  if (!date || !Array.isArray(records)) {
    return NextResponse.json({ error: "Date and records array are required" }, { status: 400 });
  }

  const scopeFilter = getScopeFilter(user);

  const dateStart = new Date(date + "T00:00:00.000Z");

  const ops = records.map((r: { staffId: string; status: string; notes?: string; lateAmount?: number; absenceAmount?: number; halfDayAmount?: number }) => ({
    updateOne: {
      filter: { staffId: r.staffId, date: dateStart },
      update: {
        $set: {
          staffId: r.staffId,
          date: dateStart,
          status: r.status,
          lateAmount: r.status === "late" ? (r.lateAmount || 0) : 0,
          absenceAmount: r.status === "absent" ? (r.absenceAmount || 0) : 0,
          halfDayAmount: r.status === "half-day" ? (r.halfDayAmount || 0) : 0,
          notes: r.notes || "",
          clockIn: r.status !== "absent" ? dateStart : undefined,
        },
      },
      upsert: true,
    },
  }));

  if (scopeFilter.locationType && scopeFilter.locationId) {
    const allowedAssignments = await StaffAssignment.find({
      isActive: true,
      locationType: scopeFilter.locationType,
      locationId: scopeFilter.locationId,
    }).select("staffId").lean();
    const allowedIds = new Set(allowedAssignments.map((a) => a.staffId.toString()));
    const filteredOps = ops.filter((op) => allowedIds.has(op.updateOne.filter.staffId));
    if (filteredOps.length === 0) {
      return NextResponse.json({ error: "No valid staff for your location" }, { status: 403 });
    }
    await Attendance.bulkWrite(filteredOps);
    return NextResponse.json({ success: true, count: filteredOps.length });
  }

  await Attendance.bulkWrite(ops);
  return NextResponse.json({ success: true, count: records.length });
}
