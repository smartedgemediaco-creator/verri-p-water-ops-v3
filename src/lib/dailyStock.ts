import mongoose from "mongoose";
import { DailyStockColumn, DailyStock, Stock } from "@/lib/models";

// The product the daily-stock "bags" count represents (business decision).
export const SACHET_PRODUCT_ID = "6a2959459e0f35f77dabab9b";

const BUILTIN_SALE = ["factorySale", "bigTruck", "smallTruck1", "smallTruck2", "depot", "tricycle"];
const BUILTIN_RETURN = ["returnedBigTruck", "returnedSmallTruck1", "returnedSmallTruck2"];
const SHORTAGE_LABEL_RE = /^shortages?$/i;

export type DayColumns = { saleKeys: string[]; returnKeys: string[]; shortageKeys: string[] };

export async function getDailyStockColumns(locationType: string, locationId: string): Promise<DayColumns> {
  const cols = await DailyStockColumn.find({ locationType, locationId }).lean();
  return {
    saleKeys: cols.filter((c) => c.type === "sale").map((c) => c.key),
    returnKeys: cols.filter((c) => c.type === "return").map((c) => c.key),
    shortageKeys: cols
      .filter((c) => c.type !== "sale" && c.type !== "return" && SHORTAGE_LABEL_RE.test(c.label.trim()))
      .map((c) => c.key),
  };
}

export function flattenDay(day: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...day };
  const custom = day.custom;
  if (custom && typeof custom === "object") {
    const entries =
      custom instanceof Map ? (Array.from(custom.entries()) as [string, unknown][]) : (Object.entries(custom) as [string, unknown][]);
    for (const [k, v] of entries) flat[k] = v;
  }
  return flat;
}

// Mirrors the Daily Stock page's displayed endStock exactly.
export function computeEndStock(
  flat: Record<string, unknown>,
  locationType: string,
  cols: DayColumns
): number {
  const num = (v: unknown) => Number(v) || 0;
  if (locationType === "depot") {
    return (
      num(flat.startStock) +
      num(flat.bagsProduced) -
      num(flat.factorySale) -
      num(flat.bigTruck) -
      num(flat.leakages) -
      cols.shortageKeys.reduce((s, k) => s + num(flat[k]), 0)
    );
  }
  const totalSold = [...BUILTIN_SALE, ...cols.saleKeys].reduce((s, k) => s + num(flat[k]), 0);
  const totalReturned = [...BUILTIN_RETURN, ...cols.returnKeys].reduce((s, k) => s + num(flat[k]), 0);
  return (
    num(flat.startStock) +
    num(flat.bagsProduced) +
    totalReturned -
    totalSold -
    num(flat.shortage) -
    num(flat.wastage)
  );
}

// Set a location's inventory (Stock) to its latest DailyStock endStock.
export async function syncStockToDailyStockEnd(locationType: string, locationId: string, productId = SACHET_PRODUCT_ID) {
  const latest = await DailyStock.find({ locationType, locationId }).sort({ date: -1 }).limit(1).lean();
  if (!latest.length) return;
  const cols = await getDailyStockColumns(locationType, locationId);
  const endStock = computeEndStock(flattenDay(latest[0] as Record<string, unknown>), locationType, cols);
  await Stock.findOneAndUpdate(
    {
      locationType,
      locationId: new mongoose.Types.ObjectId(locationId),
      productId: new mongoose.Types.ObjectId(productId),
    },
    { $set: { quantity: endStock } },
    { upsert: true }
  );
}
