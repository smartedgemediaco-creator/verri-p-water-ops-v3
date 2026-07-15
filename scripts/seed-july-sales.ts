import dotenv from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const envLocal = resolve(".env.local");
const envFile = existsSync(envLocal)
  ? ".env.local"
  : process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });
import mongoose from "mongoose";

const dailyData = [
  { date: "2026-07-01", start: 1364, produced: 1080, factory: 11, bigTruck: 302, smallTruck1: 200, smallTruck2: 393, car: 0, tricycle: 276, returnedBigTruck: 33, returnedSmallTruck1: 33, returnedSmallTruck2: 12, totalReturned: 78, totalSold: 1182, shortage: 4, endStock: 1336 },
  { date: "2026-07-02", start: 1336, produced: 1600, factory: 0, bigTruck: 452, smallTruck1: 160, smallTruck2: 590, car: 20, tricycle: 340, returnedBigTruck: 1, returnedSmallTruck1: 5, returnedSmallTruck2: 10, totalReturned: 16, totalSold: 1573, shortage: 12, endStock: 1367 },
  { date: "2026-07-03", start: 1367, produced: 1200, factory: 0, bigTruck: 402, smallTruck1: 432, smallTruck2: 460, car: 0, tricycle: 480, returnedBigTruck: 0, returnedSmallTruck1: 0, returnedSmallTruck2: 153, totalReturned: 153, totalSold: 1774, shortage: 1, endStock: 945 },
  { date: "2026-07-04", start: 945, produced: 2071, factory: 5, bigTruck: 530, smallTruck1: 552, smallTruck2: 529, car: 0, tricycle: 481, returnedBigTruck: 0, returnedSmallTruck1: 8, returnedSmallTruck2: 22, totalReturned: 30, totalSold: 2097, shortage: 22, endStock: 927 },
  { date: "2026-07-05", start: 927, produced: 0, factory: 4, bigTruck: 0, smallTruck1: 121, smallTruck2: 0, car: 0, tricycle: 0, returnedBigTruck: 0, returnedSmallTruck1: 0, returnedSmallTruck2: 0, totalReturned: 0, totalSold: 125, shortage: 0, endStock: 802 },
  { date: "2026-07-06", start: 802, produced: 2270, factory: 7, bigTruck: 682, smallTruck1: 450, smallTruck2: 532, car: 0, tricycle: 669, returnedBigTruck: 4, returnedSmallTruck1: 11, returnedSmallTruck2: 2, totalReturned: 17, totalSold: 2340, shortage: 32, endStock: 717 },
  { date: "2026-07-07", start: 717, produced: 1802, factory: 5, bigTruck: 400, smallTruck1: 513, smallTruck2: 468, car: 0, tricycle: 248, returnedBigTruck: 6, returnedSmallTruck1: 10, returnedSmallTruck2: 4, totalReturned: 20, totalSold: 1634, shortage: 0, endStock: 905 },
  { date: "2026-07-08", start: 905, produced: 1410, factory: 3, bigTruck: 405, smallTruck1: 467, smallTruck2: 0, car: 0, tricycle: 245, returnedBigTruck: 3, returnedSmallTruck1: 0, returnedSmallTruck2: 0, totalReturned: 3, totalSold: 1120, shortage: 5, endStock: 1193 },
  { date: "2026-07-09", start: 1193, produced: 1200, factory: 9, bigTruck: 250, smallTruck1: 665, smallTruck2: 0, car: 0, tricycle: 200, returnedBigTruck: 0, returnedSmallTruck1: 0, returnedSmallTruck2: 0, totalReturned: 0, totalSold: 1124, shortage: 0, endStock: 1269 },
  { date: "2026-07-10", start: 1269, produced: 1200, factory: 0, bigTruck: 352, smallTruck1: 0, smallTruck2: 704, car: 0, tricycle: 250, returnedBigTruck: 0, returnedSmallTruck1: 0, returnedSmallTruck2: 0, totalReturned: 0, totalSold: 1306, shortage: 8, endStock: 1155 },
  { date: "2026-07-11", start: 1155, produced: 1400, factory: 0, bigTruck: 440, smallTruck1: 814, smallTruck2: 0, car: 0, tricycle: 352, returnedBigTruck: 1, returnedSmallTruck1: 44, returnedSmallTruck2: 0, totalReturned: 45, totalSold: 1606, shortage: 9, endStock: 985 },
  { date: "2026-07-12", start: 985, produced: 0, factory: 17, bigTruck: 0, smallTruck1: 0, smallTruck2: 0, car: 0, tricycle: 100, returnedBigTruck: 0, returnedSmallTruck1: 0, returnedSmallTruck2: 0, totalReturned: 0, totalSold: 117, shortage: 0, endStock: 868 },
  { date: "2026-07-13", start: 868, produced: 1700, factory: 5, bigTruck: 503, smallTruck1: 358, smallTruck2: 239, car: 0, tricycle: 431, returnedBigTruck: 41, returnedSmallTruck1: 4, returnedSmallTruck2: 0, totalReturned: 45, totalSold: 1536, shortage: 4, endStock: 1073 },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const { Factory, Product, Production, Sale, Stock, Wastage } = await import("../src/lib/models");

  // Find existing factory
  const factory = await Factory.findOne();
  if (!factory) { console.error("No factory found in DB. Create one first."); process.exit(1); }
  console.log(`Using factory: ${factory.name} (${factory._id})`);

  // Find or create Sachet Water product
  let product = await Product.findOne({ name: "Sachet Water" });
  if (!product) {
    product = await Product.create({ name: "Sachet Water", unit: "bag", category: "sachet", description: "Pure sachet water", unitPrice: 100 });
    console.log("Created Sachet Water product");
  } else {
    console.log(`Using product: ${product.name} (${product._id})`);
  }

  // Clear existing July 2026 data
  const julyStart = new Date("2026-07-01");
  const julyEnd = new Date("2026-07-31T23:59:59.999Z");
  await Production.deleteMany({ date: { $gte: julyStart, $lte: julyEnd } });
  await Sale.deleteMany({ date: { $gte: julyStart, $lte: julyEnd } });
  await Wastage.deleteMany({ date: { $gte: julyStart, $lte: julyEnd } });
  console.log("Cleared existing July 2026 records");

  let totalProduced = 0;
  let totalSoldAll = 0;
  let totalShortage = 0;

  for (const day of dailyData) {
    const date = new Date(day.date);

    // 1. Production record
    if (day.produced > 0) {
      await Production.create({
        factoryId: factory._id,
        productId: product._id,
        quantity: day.produced,
        date,
      });
      totalProduced += day.produced;
    }

    // 2. Sale record (one per day, totalSold)
    if (day.totalSold > 0) {
      const notes = [
        day.bigTruck > 0 ? `BigTruck: ${day.bigTruck}` : "",
        day.smallTruck1 > 0 ? `SmallTruck1: ${day.smallTruck1}` : "",
        day.smallTruck2 > 0 ? `SmallTruck2: ${day.smallTruck2}` : "",
        day.car > 0 ? `Car: ${day.car}` : "",
        day.tricycle > 0 ? `Tricycle: ${day.tricycle}` : "",
        day.factory > 0 ? `Factory-gate: ${day.factory}` : "",
        day.totalReturned > 0 ? `Returns: ${day.totalReturned}` : "",
      ].filter(Boolean).join(" | ");

      await Sale.create({
        locationType: "factory",
        locationId: factory._id,
        productId: product._id,
        quantity: day.totalSold,
        unitPrice: product.unitPrice,
        totalAmount: day.totalSold * product.unitPrice,
        customerName: "Daily Dispatch",
        date,
        paymentMethod: "cash",
        isPaid: true,
        condition: "ordinary",
        notes,
      });
      totalSoldAll += day.totalSold;
    }

    // 3. Wastage record for shortage
    if (day.shortage > 0) {
      await Wastage.create({
        locationType: "factory",
        locationId: factory._id,
        productId: product._id,
        quantity: day.shortage,
        source: "other",
        description: `Daily shortage for ${day.date}`,
        date,
      });
      totalShortage += day.shortage;
    }

    console.log(`${day.date}: produced ${day.produced}, sold ${day.totalSold}, returned ${day.totalReturned}, shortage ${day.shortage} → stock ${day.endStock}`);
  }

  // Set final stock at factory
  const lastDay = dailyData[dailyData.length - 1];
  await Stock.findOneAndUpdate(
    { locationType: "factory", locationId: factory._id, productId: product._id },
    { quantity: lastDay.endStock },
    { upsert: true }
  );

  console.log("\n=== Summary ===");
  console.log(`Days seeded: ${dailyData.length}`);
  console.log(`Total produced: ${totalProduced}`);
  console.log(`Total sold: ${totalSoldAll}`);
  console.log(`Total shortage: ${totalShortage}`);
  console.log(`Final stock at factory: ${lastDay.endStock}`);

  await mongoose.disconnect();
  console.log("Done");
}

seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
