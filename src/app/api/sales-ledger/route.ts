import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { SalesLedger } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

function parseLocation(searchParams: URLSearchParams): { locationType: "factory" | "depot"; locationId: string } | null {
  const loc = searchParams.get("location");
  if (!loc) return null;
  try {
    const parsed = JSON.parse(loc);
    if (parsed.type && parsed.id) return { locationType: parsed.type, locationId: parsed.id };
  } catch { /* ignore */ }
  return null;
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
  const records = await SalesLedger.find(filter).sort({ date: -1 }).lean();
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();

  if (!body.date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (!body.locationType || !body.locationId) return NextResponse.json({ error: "Location is required" }, { status: 400 });

  const existing = await SalesLedger.findOne({ date: body.date, locationType: body.locationType, locationId: body.locationId });
  if (existing) return NextResponse.json({ error: "A record for this date already exists at this location" }, { status: 409 });

  const record = await SalesLedger.create({
    date: body.date,
    locationType: body.locationType,
    locationId: body.locationId,
    stockLoaded: Number(body.stockLoaded) || 0,
    returnedStock: Number(body.returnedStock) || 0,
    cashDelivered: Number(body.cashDelivered) || 0,
    transferBy: body.transferBy || "",
    amountTransferred: Number(body.amountTransferred) || 0,
    debtors: Array.isArray(body.debtors) ? body.debtors : [],
    debts: Number(body.debts) || 0,
    debtStatus: body.debtStatus || "pending",
    notes: body.notes || "",
  });

  return NextResponse.json(record, { status: 201 });
}
