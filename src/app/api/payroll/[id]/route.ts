/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PayrollRecord, Staff } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const record = await PayrollRecord.findById(id).lean();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const staff = await Staff.findById(record.staffId).select("name phone email salary employmentType").lean();
  return NextResponse.json({ ...record, staff });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const body = await req.json();

    const existing = await PayrollRecord.findById(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Recalculate net pay if deductions, bonus, base salary or previous debt changed
    // netPay = base salary + bonus − deductions − previous month's brought-forward debt
    if (body.deductions || body.bonus !== undefined || body.baseSalary !== undefined || body.previousDebt !== undefined) {
      const d = body.deductions ?? existing.deductions;
      const base = body.baseSalary ?? existing.baseSalary;
      const bonus = body.bonus ?? existing.bonus;
      const prevDebt = body.previousDebt ?? existing.previousDebt ?? 0;
      const totalDeductions = (d.absence || 0) + (d.lateness || 0) + (d.halfDay || 0) + (d.debt || 0) + (d.punishment || 0) + (d.other || 0);
      body.netPay = Math.round(base + bonus - totalDeductions - prevDebt);
    }

    const updated = await PayrollRecord.findByIdAndUpdate(id, body, { new: true });

    try {
      const staff = await Staff.findById(existing.staffId).select("name").lean();
      await logActivity({
        action: "updated",
        entity: "payroll",
        entityId: id,
        description: `Updated payroll for ${staff?.name ?? "staff"} (${existing.month})`,
        userId: user.userId,
        metadata: { changes: body },
      });
    } catch { /* ignore */ }

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await connectDB();
    const record = await PayrollRecord.findByIdAndDelete(id);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
      const staff = await Staff.findById(record.staffId).select("name").lean();
      await logActivity({
        action: "deleted",
        entity: "payroll",
        entityId: id,
        description: `Deleted payroll for ${staff?.name ?? "staff"} (${record.month})`,
        userId: user.userId,
      });
    } catch { /* ignore */ }

    return NextResponse.json({ message: "Deleted" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
