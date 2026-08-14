import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStock, DailyStockColumn } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { dailyStockRecordedEmail } from "@/lib/emailTemplates";

function parseLocation(searchParams: URLSearchParams): { locationType: "factory" | "depot"; locationId: string } | null {
  const loc = searchParams.get("location");
  if (!loc) return null;
  try {
    const parsed = JSON.parse(loc);
    if (parsed.type && parsed.id) return { locationType: parsed.type, locationId: parsed.id };
  } catch { /* ignore */ }
  return null;
}

function calcEndStock(day: Record<string, unknown>) {
  return (Number(day.startStock) || 0)
    + (Number(day.bagsProduced) || 0)
    - (Number(day.factorySale) || 0)
    - (Number(day.bigTruck) || 0)
    - (Number(day.leakages) || 0);
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const location = parseLocation(req.nextUrl.searchParams);
  const filter: Record<string, string> = {};
  if (location) {
    filter.locationType = location.locationType;
    filter.locationId = location.locationId;
  }
  const records = await DailyStock.find(filter).sort({ date: -1 }).lean();
  // flatten custom map/object into top-level fields so UI can read custom column keys
  const out = records.map((r) => {
    if (r && (r as any).custom && typeof (r as any).custom === "object") {
      try { return Object.assign({}, r, (r as any).custom); } catch { /* ignore */ }
    }
    return r;
  });
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();

  if (!body.date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (!body.locationType || !body.locationId) return NextResponse.json({ error: "Location is required" }, { status: 400 });

  const existing = await DailyStock.findOne({ date: body.date, locationType: body.locationType, locationId: body.locationId });
  if (existing) return NextResponse.json({ error: "A record for this date already exists at this location" }, { status: 409 });

  const endStock = calcEndStock(body);
  // separate static fields from arbitrary custom columns
  const STATIC_KEYS = new Set([
    "date","locationType","locationId","startStock","bagsProduced","factorySale","bigTruck","returnedBigTruck","smallTruck1","returnedSmallTruck1","smallTruck2","returnedSmallTruck2","depot","tricycle","shortage","wastage","leakages","totalSold","totalReturned","endStock","staffName","debtors","debts","debtStatus","cashDelivered"
  ]);
  const staticData: Record<string, unknown> = {};
  const customData: Record<string, number> = {};
  for (const [k, v] of Object.entries(body)) {
    if (STATIC_KEYS.has(k)) staticData[k] = v;
    else if (k === "date" || k === "locationType" || k === "locationId") staticData[k] = v;
    else customData[k] = Number(v) || 0;
  }
  const record = await DailyStock.create({ ...staticData, custom: customData, endStock });

  const notifyEmail = process.env.DAILY_STOCK_NOTIFY_EMAIL;
  if (notifyEmail) {
    const locationFilter = { locationType: body.locationType, locationId: body.locationId };
    const customColumns = await DailyStockColumn.find(locationFilter).lean().then((cols) => cols.map((c) => ({ key: c.key, label: c.label })));
    const locLabel = body.locationType === "factory" ? "Factory" : "Depot";
    sendEmail({
      to: notifyEmail,
      subject: `Daily Stock Recorded — ${body.date} (${locLabel})`,
      html: dailyStockRecordedEmail({ recordedBy: user.email, date: body.date, data: { ...body, endStock }, customColumns, title: "New Day Created" }),
    }).catch(() => {});
  }

  return NextResponse.json(record, { status: 201 });
}
