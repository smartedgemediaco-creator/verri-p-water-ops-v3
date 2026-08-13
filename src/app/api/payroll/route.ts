/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PayrollRecord, Staff, StaffAssignment, Factory, Depot, Truck } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

// Company policy: brought-forward debt looks ONE month back only.
// Returns the "YYYY-MM" immediately before the given month, or "" if invalid.
function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return "";
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function enrichRecord(record: any) {
  if (!record) return record;
  const staff = await Staff.findById(record.staffId).select("name phone email salary employmentType").lean();
  const assignment = await StaffAssignment.findOne({ staffId: record.staffId, isActive: true })
    .select("role department locationType locationId")
    .lean();
  let locationName = "";
  if (assignment) {
    if (assignment.locationType === "factory") {
      const loc = await Factory.findById(assignment.locationId).select("name").lean();
      locationName = loc?.name ?? "";
    } else if (assignment.locationType === "depot") {
      const loc = await Depot.findById(assignment.locationId).select("name").lean();
      locationName = loc?.name ?? "";
    } else if (assignment.locationType === "truck") {
      const loc = await Truck.findById(assignment.locationId).select("plateNumber").lean();
      locationName = loc ? `Truck ${loc.plateNumber}` : "";
    }
  }
  return {
    ...record,
    staff: staff ? { _id: staff._id, name: staff.name, phone: staff.phone, email: staff.email, salary: staff.salary, employmentType: staff.employmentType } : null,
    role: assignment?.role ?? "",
    department: assignment?.department ?? "",
    locationName,
  };
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  const staffId = url.searchParams.get("staffId");
  const status = url.searchParams.get("status");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (month) filter.month = month;
  if (staffId) filter.staffId = staffId;
  if (status) filter.status = status;

  const [records, total] = await Promise.all([
    PayrollRecord.find(filter)
      .sort({ month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PayrollRecord.countDocuments(filter),
  ]);

  const enriched = await Promise.all(records.map(enrichRecord));

  // Previous-month data = the staff's own debt & net pay from the immediately previous month (company policy: one month back).
  if (month) {
    const staffIds = [...new Set(enriched.map((r) => r.staffId))];
    const prevMonth = previousMonth(month);
    if (staffIds.length > 0 && prevMonth) {
      const prevRecords = await PayrollRecord.find({
        staffId: { $in: staffIds },
        month: prevMonth,
      })
        .select("staffId status deductions.debt netPay bonus")
        .lean();
      const prevMap = new Map(prevRecords.map((r) => [r.staffId.toString(), r]));
      for (const r of enriched) {
        const prev = prevMap.get(r.staffId.toString());
        r.previousMonth = prev
          ? {
              debt: prev.deductions?.debt ?? 0,
              netPay: prev.netPay ?? 0,
              bonus: prev.bonus ?? 0,
              month: prevMonth,
              status: prev.status ?? "",
            }
          : { debt: 0, netPay: 0, bonus: 0, month: prevMonth, status: "" };
      }
    }
  }

  // Compute summary stats for the given month (or all time)
  const summaryMatch: any = {};
  if (month) summaryMatch.month = month;

  const summaryAgg = await PayrollRecord.aggregate([
    { $match: summaryMatch },
    {
      $group: {
        _id: null,
        totalStaff: { $sum: 1 },
        totalBaseSalary: { $sum: "$baseSalary" },
        totalDeductions: {
          $sum: {
            $add: ["$deductions.absence", "$deductions.lateness", "$deductions.halfDay", "$deductions.debt", "$deductions.punishment", "$deductions.other"],
          },
        },
        totalBonus: { $sum: "$bonus" },
        totalNetPay: { $sum: "$netPay" },
        totalPaid: { $sum: "$paidAmount" },
        pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
        partialCount: { $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] } },
      },
    },
  ]);

  const summary = summaryAgg[0] || {
    totalStaff: 0, totalBaseSalary: 0, totalDeductions: 0, totalBonus: 0,
    totalNetPay: 0, totalPaid: 0, pendingCount: 0, paidCount: 0, partialCount: 0,
  };

  // Per-month isolation: one entry per month (never cumulative)
  const monthAgg = await PayrollRecord.aggregate([
    { $group: {
      _id: "$month",
      count: { $sum: 1 },
      totalBaseSalary: { $sum: "$baseSalary" },
      totalDeductions: { $sum: { $add: ["$deductions.absence", "$deductions.lateness", "$deductions.halfDay", "$deductions.debt", "$deductions.punishment", "$deductions.other"] } },
      totalBonus: { $sum: "$bonus" },
      totalNetPay: { $sum: "$netPay" },
      totalPaid: { $sum: "$paidAmount" },
      pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
      paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
      partialCount: { $sum: { $cond: [{ $eq: ["$status", "partial"] }, 1, 0] } },
    } },
    { $sort: { _id: -1 } },
  ]);

  // Get distinct months for filter dropdown
  const months = await PayrollRecord.distinct("month").sort().lean();

  return NextResponse.json({
    records: enriched,
    summary,
    monthSummary: monthAgg,
    months,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();

    if (!body.staffId || !body.month) {
      return NextResponse.json({ error: "staffId and month are required" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await PayrollRecord.findOne({ staffId: body.staffId, month: body.month });
    if (existing) {
      return NextResponse.json({ error: "Payroll record already exists for this staff in this month" }, { status: 409 });
    }

    // Get staff salary if not provided
    if (!body.baseSalary) {
      const staff = await Staff.findById(body.staffId).select("salary").lean();
      body.baseSalary = staff?.salary ?? 0;
    }

    // Compute net pay
    const d = body.deductions || {};
    const totalDeductions = (d.absence || 0) + (d.lateness || 0) + (d.halfDay || 0) + (d.debt || 0) + (d.punishment || 0) + (d.other || 0);
    body.netPay = (body.baseSalary || 0) + (body.bonus || 0) - totalDeductions;

    body.createdBy = user.userId;

    const record = await PayrollRecord.create(body);

    try {
      const staff = await Staff.findById(body.staffId).select("name").lean();
      await logActivity({
        action: "created",
        entity: "payroll",
        entityId: record._id.toString(),
        description: `Created payroll for ${staff?.name ?? "staff"} (${body.month}): ₦${body.netPay?.toLocaleString()}`,
        userId: user.userId,
        metadata: { staffId: body.staffId, month: body.month, netPay: body.netPay },
      });
    } catch { /* ignore */ }

    return NextResponse.json(record, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
