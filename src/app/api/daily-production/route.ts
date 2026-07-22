import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyProduction, Staff } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const staffId = searchParams.get("staffId");
  const month = searchParams.get("month");

  const filter: Record<string, unknown> = {};

  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    filter.date = { $gte: d, $lt: next };
  } else if (startDate || endDate) {
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

  if (staffId) filter.staffId = staffId;

  if (user.role === "factory-manager" && user.factoryId) {
    filter.locationType = "factory";
    filter.locationId = user.factoryId;
  } else if (user.role === "depot-manager" && user.depotId) {
    filter.locationType = "depot";
    filter.locationId = user.depotId;
  }

  const records = await DailyProduction.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate("staffId", "name")
    .populate("productId", "name")
    .lean();

  const enriched = records.map((r) => ({
    ...r,
    staffName: (r.staffId as unknown as { name: string })?.name ?? "Unknown",
    productName: (r.productId as unknown as { name: string })?.name ?? "Unknown",
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();

  const { records } = body as {
    records: { staffId: string; date: string; productId: string; bagsProduced: number; rate: number; notes?: string }[];
  };

  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "No records provided" }, { status: 400 });
  }

  const created = [];
  for (const rec of records) {
    if (!rec.staffId || !rec.date || !rec.productId) continue;
    const bags = Number(rec.bagsProduced) || 0;
    const rate = Number(rec.rate) || 0;
    const doc = await DailyProduction.create({
      staffId: rec.staffId,
      date: new Date(rec.date),
      productId: rec.productId,
      bagsProduced: bags,
      rate,
      totalEarned: bags * rate,
      notes: rec.notes || "",
      createdBy: user.userId,
    });
    created.push(doc);
  }

  if (created.length > 0) {
    await logActivity({
      action: "created",
      entity: "daily-production",
      entityId: created[0]._id.toString(),
      description: `Recorded daily production for ${created.length} worker(s)`,
      userId: user.userId,
      metadata: { count: created.length, date: records[0].date },
    });
  }

  return NextResponse.json(created, { status: 201 });
}
