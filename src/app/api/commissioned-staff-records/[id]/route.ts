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

  const existing = await CommissionedStaffRecord.findById(id).lean();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (body.date !== undefined) update.date = new Date(body.date);
  if (body.stockLoaded !== undefined) update.stockLoaded = Number(body.stockLoaded);
  if (body.stockReturned !== undefined) update.stockReturned = Number(body.stockReturned);
  if (body.transferredBy !== undefined) update.transferredBy = body.transferredBy;
  if (body.amountTransferred !== undefined) update.amountTransferred = Number(body.amountTransferred);
  if (body.cashPaid !== undefined) update.cashPaid = Number(body.cashPaid);
  if (body.debtPaid !== undefined) update.debtPaid = Number(body.debtPaid);
  if (body.debtPayer !== undefined) update.debtPayer = body.debtPayer;
  if (body.debtors !== undefined) update.debtors = body.debtors;
  if (body.notes !== undefined) update.notes = body.notes;

  const stockLoaded = update.stockLoaded !== undefined ? Number(update.stockLoaded) : existing.stockLoaded;
  const stockReturned = update.stockReturned !== undefined ? Number(update.stockReturned) : existing.stockReturned;
  const dealPrice = existing.dealPrice;
  const bagsConsumed = stockLoaded - stockReturned;
  const expectedAmount = bagsConsumed * dealPrice;
  const amountTransferred = update.amountTransferred !== undefined ? Number(update.amountTransferred) : existing.amountTransferred;
  const cashPaid = update.cashPaid !== undefined ? Number(update.cashPaid) : existing.cashPaid;
  const debtPaid = update.debtPaid !== undefined ? Number(update.debtPaid) : existing.debtPaid;
  const totalPaid = amountTransferred + cashPaid + debtPaid;
  const deficit = Math.max(0, expectedAmount - totalPaid);
  const debt = deficit;

  update.expectedAmount = expectedAmount;
  update.totalPaid = totalPaid;
  update.totalOwed = debt;
  update.deficit = deficit;
  update.debt = debt;

  const record = await CommissionedStaffRecord.findByIdAndUpdate(id, update, { new: true });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "commissioned-staff-record",
    entityId: id,
    description: `Updated record: ${stockLoaded} loaded, ${stockReturned} returned, ₦${expectedAmount.toLocaleString()} expected, ₦${debt.toLocaleString()} debt`,
    userId: user.userId,
  });

  return NextResponse.json(record);
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
