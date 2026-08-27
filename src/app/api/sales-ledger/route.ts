import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { SalesLedger } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

const VALID_TYPES = new Set(["factory", "depot", "truck"]);

function parseLocation(searchParams: URLSearchParams): { locationType: "factory" | "depot" | "truck"; locationId: string } | null {
  const loc = searchParams.get("location");
  if (!loc) return null;
  try {
    const parsed = JSON.parse(loc);
    if (parsed.type && parsed.id && VALID_TYPES.has(parsed.type)) {
      return { locationType: parsed.type, locationId: parsed.id };
    }
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
  if (!VALID_TYPES.has(body.locationType)) return NextResponse.json({ error: "Invalid location type" }, { status: 400 });

  const existing = await SalesLedger.findOne({ date: body.date, locationType: body.locationType, locationId: body.locationId });
  if (existing) return NextResponse.json({ error: "A record for this date already exists at this location" }, { status: 409 });

  const sanitizedDebtors = Array.isArray(body.debtors)
    ? body.debtors.map((d: { name?: unknown; amount?: unknown; bags?: unknown; settlements?: unknown; bagSettlements?: unknown }) => ({
        name: String(d?.name ?? "").trim(),
        amount: Number(d?.amount) || 0,
        bags: Number((d as { bags?: unknown })?.bags) || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settlements: Array.isArray(d?.settlements) ? (d.settlements as any[]).map((s: any) => ({
          amount: Number(s?.amount) || 0,
          date: s?.date ? String(s.date) : new Date().toISOString(),
          note: s?.note ? String(s.note) : "",
        })) : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bagSettlements: Array.isArray((d as any)?.bagSettlements) ? ((d as any).bagSettlements as any[]).map((s: any) => ({
          amount: Number(s?.amount) || 0,
          date: s?.date ? String(s.date) : new Date().toISOString(),
          note: s?.note ? String(s.note) : "",
        })) : [],
      }))
    : [];

  const record = await SalesLedger.create({
    date: body.date,
    locationType: body.locationType,
    locationId: body.locationId,
    productId: body.productId ? String(body.productId) : "",
    unitPrice: Number(body.unitPrice) || 0,
    amountSold: Number(body.amountSold) || 0,
    stockLoaded: Number(body.stockLoaded) || 0,
    returnedStock: Number(body.returnedStock) || 0,
    leakages: Number(body.leakages) || 0,
    cashDelivered: Number(body.cashDelivered) || 0,
    transfers: Array.isArray(body.transfers)
      ? body.transfers.map((t: { name?: unknown; amount?: unknown }) => ({
          name: String(t?.name ?? "").trim(),
          amount: Number(t?.amount) || 0,
        }))
      : [],
    debtors: sanitizedDebtors,
    debts: sanitizedDebtors.reduce((sum: number, d: { amount: number }) => sum + (Number(d.amount) || 0), 0),
    debtStatus: body.debtStatus || "pending",
    notes: body.notes || "",
  });

  return NextResponse.json(record, { status: 201 });
}
