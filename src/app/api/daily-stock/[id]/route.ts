import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStock, DailyStockColumn } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { dailyStockDeletedEmail } from "@/lib/emailTemplates";
import { computeEndStock, flattenDay, getDailyStockColumns, syncStockToDailyStockEnd } from "@/lib/dailyStock";

const SKIP_KEYS = new Set(["date", "locationType", "locationId", "_id", "__v", "createdAt", "updatedAt"]);
const STRING_FIELDS = new Set(["staffName", "debtStatus"]);
const ARRAY_FIELDS = new Set(["debtors"]);

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
    // If field is an array or string typed field, or if it exists on the document schema, write to root.
    if (ARRAY_FIELDS.has(key)) {
      (record as unknown as Record<string, unknown>)[key] = Array.isArray(val)
        ? (val as { name?: unknown; amount?: unknown; settlements?: { amount?: unknown; date?: unknown; note?: unknown }[] }[]).map((d) => ({
            name: String(d?.name ?? "").trim(),
            amount: Number(d?.amount) || 0,
            settlements: Array.isArray(d?.settlements)
              ? (d.settlements as { amount?: unknown; date?: unknown; note?: unknown }[]).map((s) => ({
                  amount: Number(s?.amount) || 0,
                  date: s?.date ? String(s.date) : new Date().toISOString(),
                  note: s?.note ? String(s.note) : "",
                }))
              : [],
          }))
        : [];
    } else if (STRING_FIELDS.has(key)) {
      (record as unknown as Record<string, string>)[key] = String(val ?? "");
    } else {
      // if key is an existing schema path, write to root; otherwise treat as a custom column and store in `custom` map
      const rootObj = record.toObject();
      if (Object.prototype.hasOwnProperty.call(rootObj, key)) {
        (record as unknown as Record<string, number>)[key] = Number(val) || 0;
      } else {
        // custom columns are stored in the `custom` Map (per schema)
        if (!record.custom) record.custom = new Map<string, number>();
        (record.custom as Map<string, number>).set(key, Number(val) || 0);
      }
    }
  }

  const cols = await getDailyStockColumns(record.locationType, record.locationId);
  // flatten custom into an object copy for endStock calculation
  const obj = flattenDay(record.toObject());
  record.endStock = computeEndStock(obj, record.locationType, cols);

  await record.save();

  // Keep the inventory (Stock) aligned with the daily stock endStock.
  await syncStockToDailyStockEnd(record.locationType, record.locationId).catch(() => {});

  // return flattened object so client sees custom keys at top-level
  const out = record.toObject();
  if (out.custom && typeof out.custom === "object") Object.assign(out, out.custom as Record<string, unknown>);
  return NextResponse.json(out);
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
  const deletedLocationType = record.locationType;
  const deletedLocationId = record.locationId;
  await record.deleteOne();

  // Re-sync inventory to the new latest daily stock endStock for this location.
  await syncStockToDailyStockEnd(deletedLocationType, deletedLocationId).catch(() => {});

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
