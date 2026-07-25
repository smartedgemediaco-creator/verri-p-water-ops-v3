import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CommissionedStaffRecord, CommissionedStaff } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const month = searchParams.get("month");

  const filter: Record<string, unknown> = {};
  if (staffId) filter.staffId = staffId;

  if (startDate || endDate) {
    const range: Record<string, Date> = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      range.$lt = end;
    }
    filter.date = range;
  } else if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    filter.date = { $gte: start, $lt: end };
  }

  const records = await CommissionedStaffRecord.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate("staffId", "name phone dealPrice")
    .lean();

  const enriched = records.map((r) => ({
    ...r,
    staffName: (r.staffId as unknown as { name: string })?.name ?? "Unknown",
    staffPhone: (r.staffId as unknown as { phone: string })?.phone ?? "",
    staffDealPrice: (r.staffId as unknown as { dealPrice: number })?.dealPrice ?? 0,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();

  if (!body.staffId) return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
  if (!body.date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (!body.stockLoaded && body.stockLoaded !== 0) return NextResponse.json({ error: "Stock loaded is required" }, { status: 400 });

  const staff = await CommissionedStaff.findById(body.staffId).lean();
  if (!staff) return NextResponse.json({ error: "Commissioned staff not found" }, { status: 404 });

  const stockLoaded = Number(body.stockLoaded) || 0;
  const stockReturned = Number(body.stockReturned) || 0;
  const dealPrice = Number(staff.dealPrice);
  const bagsConsumed = stockLoaded - stockReturned;
  const expectedAmount = bagsConsumed * dealPrice;

  const transferredBy = Array.isArray(body.transferredBy)
    ? body.transferredBy
        .filter((t: { name?: string; amount?: number }) => t.name && t.name.trim())
        .map((t: { name: string; amount?: number }) => ({ name: t.name.trim(), amount: Number(t.amount) || 0 }))
    : [];
  const amountTransferred = transferredBy.reduce((sum: number, t: { name: string; amount: number }) => sum + t.amount, 0);
  const cashPaid = Number(body.cashPaid) || 0;
  const debtPaid = Number(body.debtPaid) || 0;
  const totalPaid = amountTransferred + cashPaid + debtPaid;
  const deficit = Math.max(0, expectedAmount - totalPaid);
  const debt = deficit;

  const record = await CommissionedStaffRecord.create({
    staffId: body.staffId,
    date: new Date(body.date),
    stockLoaded,
    stockReturned,
    dealPrice,
    expectedAmount,
    transferredBy,
    amountTransferred,
    cashPaid,
    deficit,
    debtPaid,
    debtPayer: body.debtPayer || "",
    debtors: Array.isArray(body.debtors) ? body.debtors.map((d: { name: string; amount: number; settled?: number }) => ({
      name: d.name, amount: Number(d.amount) || 0, settled: Number(d.settled) || 0,
    })) : [],
    debt,
    payments: [],
    totalPaid,
    totalOwed: debt,
    notes: body.notes || "",
    createdBy: user.userId,
  });

  await logActivity({
    action: "created",
    entity: "commissioned-staff-record",
    entityId: record._id.toString(),
    description: `Recorded outing for "${staff.name}": ${stockLoaded} bags loaded, ₦${expectedAmount.toLocaleString()} expected, ₦${totalPaid.toLocaleString()} paid`,
    userId: user.userId,
    metadata: { staffName: staff.name, stockLoaded, stockReturned, expectedAmount, totalPaid, debt },
  });

  return NextResponse.json(record, { status: 201 });
}
