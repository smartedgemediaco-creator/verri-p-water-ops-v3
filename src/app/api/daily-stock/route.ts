import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStock, DailyStockColumn } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { dailyStockRecordedEmail } from "@/lib/emailTemplates";

const BUILTIN_SALE = ["factorySale", "bigTruck", "smallTruck1", "smallTruck2", "depot", "tricycle"];
const BUILTIN_RETURN = ["returnedBigTruck", "returnedSmallTruck1", "returnedSmallTruck2"];

function parseLocation(searchParams: URLSearchParams): { locationType: "factory" | "depot"; locationId: string } | null {
  const loc = searchParams.get("location");
  if (!loc) return null;
  try {
    const parsed = JSON.parse(loc);
    if (parsed.type && parsed.id) return { locationType: parsed.type, locationId: parsed.id };
  } catch { /* ignore */ }
  return null;
}

async function calcTotals(day: Record<string, unknown>, locationFilter: Record<string, string>) {
  const columns = await DailyStockColumn.find(locationFilter).lean();
  const saleKeys = [...BUILTIN_SALE, ...columns.filter((c) => c.type === "sale").map((c) => c.key)];
  const returnKeys = [...BUILTIN_RETURN, ...columns.filter((c) => c.type === "return").map((c) => c.key)];
  const totalSold = saleKeys.reduce((sum, k) => sum + (Number(day[k]) || 0), 0);
  const totalReturned = returnKeys.reduce((sum, k) => sum + (Number(day[k]) || 0), 0);
  const endStock = (Number(day.startStock) || 0) + (Number(day.bagsProduced) || 0) + totalReturned - totalSold - (Number(day.shortage) || 0) - (Number(day.wastage) || 0);
  return { totalSold, totalReturned, endStock };
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
  return NextResponse.json(records);
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

  const locationFilter = { locationType: body.locationType, locationId: body.locationId };
  const totals = await calcTotals(body, locationFilter);
  const record = await DailyStock.create({ ...body, ...totals });

  const notifyEmail = process.env.DAILY_STOCK_NOTIFY_EMAIL;
  if (notifyEmail) {
    const customColumns = await DailyStockColumn.find(locationFilter).lean().then((cols) => cols.map((c) => ({ key: c.key, label: c.label })));
    const locLabel = body.locationType === "factory" ? "Factory" : "Depot";
    sendEmail({
      to: notifyEmail,
      subject: `Daily Stock Recorded — ${body.date} (${locLabel})`,
      html: dailyStockRecordedEmail({ recordedBy: user.email, date: body.date, data: { ...body, ...totals }, customColumns, title: "New Day Created" }),
    }).catch(() => {});
  }

  return NextResponse.json(record, { status: 201 });
}
