// Run: npx tsx scripts/migrate-daily-stock-location.ts
// Migrates all existing DailyStock and DailyStockColumn records to have locationType/locationId (Akobo Factory)

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://verrip_db_user:l3CJNgUug80Y2rNm@water-ops-cluster.18hzrlq.mongodb.net/water-ops-prod?appName=water-ops-cluster";
const AKOBO_FACTORY_ID = "6a295e6ccdd91fcbe1b7f4b8";

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;
  const stockResult = await db.collection("dailystocks").updateMany(
    { locationType: { $exists: false } },
    { $set: { locationType: "factory", locationId: AKOBO_FACTORY_ID } }
  );
  console.log(`DailyStock: ${stockResult.modifiedCount} records migrated to Akobo Factory`);

  const colResult = await db.collection("dailystockcolumns").updateMany(
    { locationType: { $exists: false } },
    { $set: { locationType: "factory", locationId: AKOBO_FACTORY_ID } }
  );
  console.log(`DailyStockColumn: ${colResult.modifiedCount} columns migrated to Akobo Factory`);

  // Drop the old unique index on `date` if it exists, and create compound unique indexes
  try {
    await db.collection("dailystocks").dropIndex("date_1");
    console.log("Dropped old unique index on date");
  } catch {
    console.log("No old date_1 index to drop (expected)");
  }

  try {
    await db.collection("dailystocks").createIndex(
      { date: 1, locationType: 1, locationId: 1 },
      { unique: true, name: "date_location_unique" }
    );
    console.log("Created compound unique index on (date, locationType, locationId)");
  } catch (e: unknown) {
    console.log("Compound index already exists or error:", e instanceof Error ? e.message : e);
  }

  try {
    await db.collection("dailystockcolumns").createIndex(
      { key: 1, locationType: 1, locationId: 1 },
      { unique: true, name: "key_location_unique" }
    );
    console.log("Created compound unique index on (key, locationType, locationId) for columns");
  } catch (e: unknown) {
    console.log("Column compound index already exists or error:", e instanceof Error ? e.message : e);
  }

  // Verify
  const count = await db.collection("dailystocks").countDocuments({ locationType: "factory" });
  console.log(`Verification: ${count} factory records now have locationType`);

  await mongoose.disconnect();
  console.log("Done");
}

migrate().catch(console.error);
