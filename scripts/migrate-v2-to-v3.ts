/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Full migration: merge test (v3 operational) + water-ops-v2 (legacy)
 * into water-ops-prod.
 *
 * Usage: npx tsx scripts/migrate-v2-to-v3.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

const log = (msg: string) => console.log(`  ${msg}`);
const title = (msg: string) => console.log(`\n${msg}`);

const BASE_URI = "mongodb+srv://verrip_db_user:l3CJNgUug80Y2rNm@water-ops-cluster.18hzrlq.mongodb.net";

async function readAll(uri: string, label: string) {
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db!;
  const cols = await db.listCollections().toArray();
  const data: Record<string, any[]> = {};
  for (const c of cols) {
    if (c.name.startsWith("system.")) continue;
    data[c.name] = await db.collection(c.name).find({}).toArray();
  }
  log(`${label}: ${Object.keys(data).length} collections`);
  for (const [k, v] of Object.entries(data)) {
    log(`  ${k}: ${v.length} docs`);
  }
  await conn.close();
  return data;
}

async function main() {
  const targetUri = `${BASE_URI}/water-ops-prod?appName=water-ops-cluster`;
  const testUri = `${BASE_URI}/test?appName=water-ops-cluster`;
  const v2Uri = `${BASE_URI}/water-ops-v2?appName=water-ops-cluster`;

  // ── Step 1: Read ALL source data ──────────────────────
  title("Reading source databases…");
  const testData = await readAll(testUri, "test (v3 operational)");
  const v2Data = await readAll(v2Uri, "water-ops-v2 (legacy)");

  // ── Step 2: Connect to target ─────────────────────────
  title("Connecting to target: water-ops-prod…");
  const dst = await mongoose.createConnection(targetUri).asPromise();
  const ddb = dst.db!;

  // ── Step 3: Copy v3 operational collections from test ─
  title("Migrating v3 operational data (from test)…");

  const v3Collections = [
    "users", "factories", "depots", "trucks", "products",
    "costs", "disputes", "activitylogs", "inventories",
    "productions", "sales", "transfers", "truckloads",
    "wastages", "posdevices", "paymenttransactions",
    "customers", "staff", "suppliers", "rawmaterials",
    "servicerecords", "vigilitems",
  ];

  for (const colName of v3Collections) {
    const docs = testData[colName] || [];
    if (docs.length === 0) {
      log(`${colName}: 0 (skipped)`);
      continue;
    }
    // Strip Mongoose __v
    const clean = docs.map((d: any) => {
      const { _id, __v, ...rest } = d;
      return rest;
    });
    await ddb.collection(colName).insertMany(clean);
    log(`${colName}: ${clean.length} copied`);
  }

  // ── Step 4: Transform v2 legacy data ──────────────────
  title("Transforming water-ops-v2 legacy data…");

  // ── 4a. Products ──────────────────────────────────────
  const v2Products = v2Data["products"] || [];
  const v3ProductNames = (testData["products"] || []).map((p: any) => p.name.toLowerCase());
  let v2ProductsAdded = 0;
  for (const p of v2Products) {
    // Only add if name doesn't already exist
    if (v3ProductNames.includes((p.name || "").toLowerCase())) continue;
    await ddb.collection("products").insertOne({
      name: p.name,
      unit: p.unitType || p.unit || "bag",
      category: (p.category || "").startsWith("SACHET") ? "sachet" : "bottle",
      description: p.description || "",
      unitPrice: p.unitPrice ?? p.price ?? 0,
    });
    v2ProductsAdded++;
  }
  log(`products: ${v2ProductsAdded} added from v2 (non-duplicate)`);

  // ── 4b. Users ─────────────────────────────────────────
  const v2Users = v2Data["users"] || [];
  if (v2Users.length > 0) {
    log(`users: ${v2Users.length} in v2 (skipped — v3 admin already in target)`);
  }

  // ── 4c. Build location-name map from migrated factories/depots ──
  const insertedFactories = await ddb.collection("factories").find({}).toArray();
  const insertedDepots = await ddb.collection("depots").find({}).toArray();

  const nameToId = new Map<string, { id: mongoose.Types.ObjectId; type: string }>();
  for (const f of insertedFactories) {
    nameToId.set((f.name || "").trim().toLowerCase(), { id: f._id, type: "factory" });
  }
  for (const d of insertedDepots) {
    nameToId.set((d.name || "").trim().toLowerCase(), { id: d._id, type: "depot" });
  }

  // Also add legacy locations to map so v2 records can find them
  const v2Locs = v2Data["locations"] || [];
  for (const loc of v2Locs) {
    nameToId.set((loc.name || "").trim().toLowerCase(), {
      id: loc._id,
      type: (loc.type || "").toLowerCase() === "factory" ? "factory" : "depot",
    });
  }

  // ── 4d. Transform v2 sales ────────────────────────────
  const v2Sales = v2Data["sales"] || [];
  let salesAdded = 0;
  for (const s of v2Sales) {
    // Map location: try source field first, then locationId
    const locName = (s.source || "").trim().toLowerCase();
    const locInfo = nameToId.get(locName) || nameToId.get("factory");

    // Map product: try to find in migrated products by looking up
    // We'll just reference the ObjectId as-is (cross-db refs are OK if same cluster)
    const paymentMap: Record<string, string> = {
      "POS": "pos", "CASH": "cash", "TRANSFER": "transfer", "CREDIT": "credit",
    };

    await ddb.collection("sales").insertOne({
      locationType: locInfo?.type || "factory",
      locationId: locInfo?.id || s.locationId,
      productId: s.productId,
      quantity: s.quantity ?? 0,
      unitPrice: s.unitPrice ?? 0,
      totalAmount: s.totalAmount ?? (s.quantity ?? 0) * (s.unitPrice ?? 0),
      customerName: s.customerName || "",
      date: s.createdAt || new Date(),
      notes: `[v2] ${s.referenceId || ""}`,
      paymentMethod: paymentMap[s.paymentType] || "cash",
      isPaid: true,
      createdAt: s.createdAt || new Date(),
      updatedAt: s.updatedAt || new Date(),
    });
    salesAdded++;
  }
  log(`sales: ${salesAdded} migrated from v2`);

  // ── 4e. Transform v2 inventorytransactions → activitylogs ──
  const v2Txs = v2Data["inventorytransactions"] || [];
  if (v2Txs.length > 0) {
    const activityLogs = v2Txs.map((tx: any) => ({
      action: "inventory-migration",
      entity: "inventorytransaction",
      entityId: tx.referenceId || tx._id?.toString() || "",
      description: `[v2 archive] ${tx.type} — ${tx.quantity} units (ref: ${tx.referenceId || "none"})`,
      userId: undefined,
      metadata: {
        legacyType: tx.type,
        legacyRef: tx.referenceId,
        fromLocationId: tx.fromLocationId?.toString() || null,
        toLocationId: tx.toLocationId?.toString() || null,
      },
      createdAt: tx.createdAt || new Date(),
      updatedAt: tx.updatedAt || new Date(),
    }));
    await ddb.collection("activitylogs").insertMany(activityLogs);
    log(`activitylogs: ${activityLogs.length} archived from v2 inventorytransactions`);
  }

  // ── 4f. Transform v2 inventories (optional, legacy format) ──
  const v2Inventories = v2Data["inventories"] || [];
  if (v2Inventories.length > 0) {
    const invs = v2Inventories.map((inv: any) => {
      const loc = v2Locs.find((l: any) => l._id.toString() === inv.locationId?.toString());
      const locMatch = nameToId.get((loc?.name || "").trim().toLowerCase());
      return {
        locationType: locMatch?.type || "factory",
        locationId: locMatch?.id || inv.locationId,
        productId: inv.productId,
        quantity: inv.quantity ?? 0,
      };
    });
    await ddb.collection("inventories").insertMany(invs);
    log(`inventories: ${invs.length} migrated from v2`);
  }

  // ── Step 5: Ensure indexes ────────────────────────────
  title("Ensuring indexes…");
  const models = await import("../src/lib/models/index");
  for (const [name, model] of Object.entries(models)) {
    if (typeof model === "function" && (model as any).schema?.init) {
      try {
        await (model as any).init();
      } catch {
        // ignore index errors
      }
    }
  }

  // ── Summary ───────────────────────────────────────────
  title("=== Migration Complete ===");
  const summary: Record<string, number> = {};
  const finalCols = await ddb.listCollections().toArray();
  for (const c of finalCols) {
    summary[c.name] = await ddb.collection(c.name).countDocuments();
  }
  for (const [col, count] of Object.entries(summary).sort()) {
    log(`${col}: ${count}`);
  }

  await dst.close();
}

main().catch((e) => {
  console.error("\n[FATAL]", e);
  process.exit(1);
});
