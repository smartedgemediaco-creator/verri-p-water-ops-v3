import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Attendance, Staff, StaffAssignment } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const locationType = searchParams.get("locationType");
  const locationId = searchParams.get("locationId");

  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  // Find active staff at this location via StaffAssignment
  const assignmentFilter: Record<string, unknown> = { isActive: true };
  if (locationType) assignmentFilter.locationType = locationType;
  if (locationId) assignmentFilter.locationId = locationId;

  const assignments = await StaffAssignment.find(assignmentFilter).lean();
  const staffIds = assignments.map((a) => a.staffId);

  const staff = await Staff.find({ _id: { $in: staffIds }, isActive: true })
    .sort({ name: 1 })
    .lean();

  // Find existing attendance records for this date
  const dateStart = new Date(date + "T00:00:00.000Z");
  const dateEnd = new Date(date + "T23:59:59.999Z");
  const attendanceRecords = await Attendance.find({
    staffId: { $in: staffIds },
    date: { $gte: dateStart, $lte: dateEnd },
  }).lean();

  // Merge staff with attendance
  const attendanceMap = new Map<string, typeof attendanceRecords[0]>();
  for (const rec of attendanceRecords) {
    attendanceMap.set(rec.staffId.toString(), rec);
  }

  const result = staff.map((s) => {
    const att = attendanceMap.get(s._id.toString());
    const assignment = assignments.find((a) => a.staffId.toString() === s._id.toString());
    return {
      staffId: s._id,
      name: s.name,
      role: assignment?.role ?? "other",
      department: assignment?.department ?? "administration",
      attendanceId: att?._id ?? null,
      status: att?.status ?? "absent",
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

  const dateStart = new Date(date + "T00:00:00.000Z");

  const ops = records.map((r: { staffId: string; status: string; notes?: string }) => ({
    updateOne: {
      filter: { staffId: r.staffId, date: dateStart },
      update: {
        $set: {
          staffId: r.staffId,
          date: dateStart,
          status: r.status,
          notes: r.notes || "",
          clockIn: r.status !== "absent" ? dateStart : undefined,
        },
      },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(ops);
  return NextResponse.json({ success: true, count: records.length });
}
