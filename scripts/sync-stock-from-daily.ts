import connectDB from "@/lib/db";
import { DailyStock, Stock } from "@/lib/models";
import { computeEndStock, flattenDay, getDailyStockColumns, syncStockToDailyStockEnd, SACHET_PRODUCT_ID } from "@/lib/dailyStock";
import mongoose from "mongoose";

async function main() {
  await connectDB();

  // 1) Backfill the stored DailyStock.endStock using the correct (page-matching) formula.
  const records = await DailyStock.find({}).lean();
  let backfilled = 0;
  for (const rec of records) {
    const r = rec as Record<string, unknown>;
    const cols = await getDailyStockColumns(r.locationType as string, r.locationId as string);
    const correct = computeEndStock(flattenDay(r), r.locationType as string, cols);
    const stored = Number((r as { endStock?: number }).endStock) || 0;
    if (correct !== stored) {
      await DailyStock.updateOne({ _id: r._id }, { $set: { endStock: correct } });
      backfilled++;
    }
  }
  console.log(`Backfilled ${backfilled} DailyStock endStock values to the correct formula.`);

  // 2) Re-align Stock inventory to the latest daily stock endStock per location.
  const locations = await DailyStock.aggregate([
    { $group: { _id: { locationType: "$locationType", locationId: "$locationId" } } },
  ]);
  for (const loc of locations) {
    const { locationType, locationId } = loc._id;
    await syncStockToDailyStockEnd(locationType, locationId, SACHET_PRODUCT_ID);
    console.log(`  Synced Stock for ${locationType} ${locationId}`);
  }

  const total = await Stock.aggregate([{ $group: { _id: null, t: { $sum: "$quantity" } } }]);
  console.log(`Total inventory now: ${total[0]?.t ?? 0}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
