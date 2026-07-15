import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStock } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

function calcTotals(day: Record<string, number>) {
  const totalSold = (day.factorySale ?? 0) + (day.bigTruck ?? 0) + (day.smallTruck1 ?? 0) + (day.smallTruck2 ?? 0) + (day.depot ?? 0) + (day.tricycle ?? 0);
  const totalReturned = (day.returnedBigTruck ?? 0) + (day.returnedSmallTruck1 ?? 0) + (day.returnedSmallTruck2 ?? 0);
  const endStock = (day.startStock ?? 0) + (day.bagsProduced ?? 0) + totalReturned - totalSold - (day.shortage ?? 0) - (day.wastage ?? 0);
  return { totalSold, totalReturned, endStock };
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const records = await DailyStock.find({}).sort({ date: 1 }).lean();
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();

  if (!body.date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const existing = await DailyStock.findOne({ date: body.date });
  if (existing) return NextResponse.json({ error: "A record for this date already exists" }, { status: 409 });

  const totals = calcTotals(body);
  const record = await DailyStock.create({ ...body, ...totals });
  return NextResponse.json(record, { status: 201 });
}
