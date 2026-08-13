import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStock, DailyStockColumn } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { dailyStockDeletedEmail } from "@/lib/emailTemplates";

const SKIP_KEYS = new Set(["date", "locationType", "locationId", "_id", "__v", "createdAt", "updatedAt"]);
const STRING_FIELDS = new Set(["staffName", "debtStatus"]);
const ARRAY_FIELDS = new Set(["debtors"]);
const SHORTAGE_LABEL_RE = /^shortages?$/i;

function calcEndStock(record: Record<string, unknown>, shortageKeys: string[] = []) {
  const shortageTotal = shortageKeys.reduce((sum, k) => sum + (Number(record[k]) || 0), 0);
  return (Number(record.startStock) || 0)
    + (Number(record.bagsProduced) || 0)
    - (Number(record.factorySale) || 0)
    - (Number(record.bigTruck) || 0)
    - (Number(record.leakages) || 0)
    - shortageTotal;
}

async function getDepotShortageKeys(locationType: string, locationId: string): Promise<string[]> {
  if (locationType !== "depot") return [];
  const columns = await DailyStockColumn.find({ locationType, locationId, type: "custom" }).lean();
  return columns.filter((c) => SHORTAGE_LABEL_RE.test(c.label.trim())).map((c) => c.key);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const record = await DailyStock.findById(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  for (const [key, val] of Object.entries(body)) {
    if (SKIP_KEYS.has(key)) continue;
    if (ARRAY_FIELDS.has(key)) {
      (record as unknown as Record<string, unknown>)[key] = Array.isArray(val)
        ? (val as { name?: unknown; amount?: unknown }[]).map((d) => ({ name: String(d?.name ?? "").trim(), amount: Number(d?.amount) || 0 }))
        : [];
    } else if (STRING_FIELDS.has(key)) {
      (record as unknown as Record<string, string>)[key] = String(val ?? "");
    } else {
      (record as unknown as Record<string, number>)[key] = Number(val) || 0;
    }
  }

  const shortageKeys = await getDepotShortageKeys(record.locationType, record.locationId);
  record.endStock = calcEndStock(record.toObject(), shortageKeys);

  await record.save();
  return NextResponse.json(record);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await connectDB();
  const record = await DailyStock.findById(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snapshot = record.toObject();
  const locationFilter = { locationType: record.locationType, locationId: record.locationId };
  await record.deleteOne();

  const notifyEmail = process.env.DAILY_STOCK_NOTIFY_EMAIL;
  if (notifyEmail) {
    DailyStockColumn.find(locationFilter).lean().then((columns) => {
      const customColumns = columns.map((c) => ({ key: c.key, label: c.label }));
      const locLabel = snapshot.locationType === "factory" ? "Factory" : "Depot";
      sendEmail({
        to: notifyEmail,
        subject: `⚠ Daily Stock DELETED — ${snapshot.date} (${locLabel})`,
        html: dailyStockDeletedEmail({ deletedBy: user.email, date: snapshot.date, data: snapshot as unknown as Record<string, number | string>, customColumns }),
      }).catch(() => {});
    }).catch(() => {});
  }

  return NextResponse.json({ message: "Deleted" });
}
