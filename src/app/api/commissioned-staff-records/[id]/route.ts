import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CommissionedStaffRecord } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const record = await CommissionedStaffRecord.findById(id)
    .populate("staffId", "name phone dealPrice")
    .lean();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(record);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const record = await CommissionedStaffRecord.findById(id);
  if (!record) return NextResponse.json({ error: "Not found", status: 404 });

  if (body.transferredBy !== undefined) {
    record.transferredBy = Array.isArray(body.transferredBy) ? body.transferredBy : body.transferredBy ? [body.transferredBy] : [];
  }

  if (body.date !== undefined) record.date = new Date(body.date);
  if (body.stockLoaded !== undefined) record.stockLoaded = Number(body.stockLoaded);
  if (body.stockReturned !== undefined) record.stockReturned = Number(body.stockReturned);
  if (body.amountTransferred !== undefined) record.amountTransferred = Number(body.amountTransferred);
  if (body.cashPaid !== undefined) record.cashPaid = Number(body.cashPaid);
  if (body.debtPaid !== undefined) record.debtPaid = Number(body.debtPaid);
  if (body.debtPayer !== undefined) record.debtPayer = body.debtPayer;
  if (body.notes !== undefined) record.notes = body.notes;

  if (body.debtors !== undefined) {
    record.debtors = body.debtors.map((d: { name: string; amount: number; settled?: number }) => ({
      name: d.name, amount: Number(d.amount) || 0, settled: Number(d.settled) || 0,
    }));
  }

  if (body.settleDebtor && typeof body.settleDebtor === "object") {
    const { debtorName, amount, type, senderName } = body.settleDebtor;
    const settleAmount = Number(amount) || 0;
    if (debtorName && settleAmount > 0) {
      const debtor = record.debtors.find((d: { name: string; amount: number; settled: number }) => d.name === debtorName);
      if (debtor) {
        debtor.settled = (debtor.settled || 0) + settleAmount;
      }
      record.payments.push({
        type: type || "cash",
        amount: settleAmount,
        senderName: senderName || debtorName,
        addAsCustomer: false,
        date: new Date(),
        notes: `Settled by ${debtorName}`,
      } as never);
      if (type === "transfer") {
        record.amountTransferred = (record.amountTransferred || 0) + settleAmount;
      } else {
        record.cashPaid = (record.cashPaid || 0) + settleAmount;
      }
    }
  }

  const bagsConsumed = record.stockLoaded - record.stockReturned;
  record.expectedAmount = bagsConsumed * record.dealPrice;
  record.totalPaid = (record.amountTransferred || 0) + (record.cashPaid || 0) + (record.debtPaid || 0);
  record.deficit = Math.max(0, record.expectedAmount - record.totalPaid);
  record.debt = record.deficit;
  record.totalOwed = record.debt;

  await record.save();

  await logActivity({
    action: "updated",
    entity: "commissioned-staff-record",
    entityId: id,
    description: body.settleDebtor
      ? `Settled ₦${(Number(body.settleDebtor.amount) || 0).toLocaleString()} for "${body.settleDebtor.debtorName}" on record`
      : `Updated record: ${record.stockLoaded} loaded, ${record.stockReturned} returned, ₦${record.expectedAmount.toLocaleString()} expected, ₦${record.debt.toLocaleString()} debt`,
    userId: user.userId,
  });

  const updated = await CommissionedStaffRecord.findById(id).lean();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const record = await CommissionedStaffRecord.findByIdAndDelete(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "commissioned-staff-record",
    entityId: id,
    description: `Deleted commissioned staff record`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
