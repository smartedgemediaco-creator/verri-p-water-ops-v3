import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

async function hashPass(password: string): Promise<string> {
  const mod = await import("../src/lib/auth");
  return mod.hashPassword(password);
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const {
    User, Factory, Depot, Truck, Product,
    Inventory, Sale, Cost, Transfer,
    Production, Wastage, ActivityLog,
    PaymentTransaction, PosDevice,
  } = await import("../src/lib/models");

  // Clear every collection — including ones added after initial seed
  await Promise.all([
    User.deleteMany({}),
    Factory.deleteMany({}),
    Depot.deleteMany({}),
    Truck.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    Sale.deleteMany({}),
    Cost.deleteMany({}),
    Transfer.deleteMany({}),
    Production.deleteMany({}),
    Wastage.deleteMany({}),
    ActivityLog.deleteMany({}),
    PaymentTransaction.deleteMany({}),
    PosDevice.deleteMany({}),
  ]);
  console.log("Cleared all collections");

  // Create only the admin user
  await User.create({
    name: "Admin User",
    email: "admin@verripwater.com",
    password: await hashPass("admin123"),
    role: "admin",
  });

  console.log("\nSeed complete! Login: admin@verripwater.com / admin123");
  console.log("Only admin user created — all other data cleared.\n");
  console.log("Next steps — admin can now create via UI:");
  console.log("  Factories → Depots → Trucks → Products");
  console.log("  Then: Record Production → Transfer → Sales / Costs");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
