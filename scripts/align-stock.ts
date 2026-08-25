import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { Stock, DailyStock } from "@/lib/models";

// The product the daily-stock "bags" count represents, per business decision.
const SACHET_PRODUCT_ID = "6a2959459e0f35f77dabab9b"; // Sachet Water (16 pieces - bag) - Ordinary

async function main() {
  await connectDB();

  // 1) Back up existing inventory before clearing it.
  const existing = await Stock.find({}).lean();
  if (existing.length > 0) {
    await mongoose.connection.collection("StockBackup").deleteMany({});
    await mongoose.connection.collection("StockBackup").insertMany(
      existing.map((d) => ({ ...d, _backupAt: new Date() }))
    );
    console.log(`Backed up ${existing.length} stock records to StockBackup.`);
  }

  // 2) Clear current inventory (do NOT touch DailyStock).
  await Stock.deleteMany({});
  console.log("Cleared Stock inventory.");

  // 3) Rebuild inventory from the latest DailyStock.endStock per location.
  const latest = await DailyStock.aggregate([
    { $sort: { date: 1 } },
    {
      $group: {
        _id: { locationType: "$locationType", locationId: "$locationId" },
        endStock: { $last: "$endStock" },
        date: { $last: "$date" },
      },
    },
  ]);

  let created = 0;
  for (const row of latest) {
    const locationType = row._id.locationType; // "factory" | "depot"
    const locationId = row._id.locationId;
    const quantity = Number(row.endStock) || 0;
    if (!mongoose.Types.ObjectId.isValid(locationId)) continue;
    await Stock.findOneAndUpdate(
      {
        locationType,
        locationId: new mongoose.Types.ObjectId(locationId),
        productId: new mongoose.Types.ObjectId(SACHET_PRODUCT_ID),
      },
      { $set: { quantity } },
      { upsert: true }
    );
    created++;
    console.log(`  ${locationType} ${locationId} (as of ${row.date}): ${quantity}`);
  }

  console.log(`Rebuilt ${created} stock records from DailyStock endStock.`);
  const total = await Stock.aggregate([
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  console.log(`Total inventory now: ${total[0]?.total ?? 0}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
