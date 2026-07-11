import dotenv from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// Load .env.local if it exists (user's local overrides), fall back to env-specific
const envLocal = resolve(".env.local");
const envFile = existsSync(envLocal)
  ? ".env.local"
  : process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });
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
    Stock, Sale, Cost, Transfer, TruckLoad,
    Production, Wastage, ActivityLog,
    PaymentTransaction, PosDevice,
    Customer, Staff, Supplier, RawMaterial, ServiceRecord,
    StaffAssignment, DriverAssignment, UserRole, StaffUserLink,
    CustomerAccount, PosDeviceAssignment, SupplierContract,
    Asset, Batch, DeliveryRoute, NAFDACRecord,
    PurchaseOrder, GoodsReceivedNote, BillOfMaterials,
    QualityCheck, Invoice, PaymentReceipt,
    FuelLog, Attendance, Leave, Trip,
    Dispute, ScheduledOperation,
  } = await import("../src/lib/models");

  // Clear every collection (StaffUserLink first since it references both)
  await Promise.all([
    StaffUserLink.deleteMany({}),
    User.deleteMany({}),
    Factory.deleteMany({}),
    Depot.deleteMany({}),
    Truck.deleteMany({}),
    Product.deleteMany({}),
    Stock.deleteMany({}),
    Sale.deleteMany({}),
    Cost.deleteMany({}),
    Transfer.deleteMany({}),
    TruckLoad.deleteMany({}),
    Production.deleteMany({}),
    Wastage.deleteMany({}),
    ActivityLog.deleteMany({}),
    PaymentTransaction.deleteMany({}),
    PosDevice.deleteMany({}),
    Customer.deleteMany({}),
    Staff.deleteMany({}),
    Supplier.deleteMany({}),
    RawMaterial.deleteMany({}),
    ServiceRecord.deleteMany({}),
    Dispute.deleteMany({}),
    ScheduledOperation.deleteMany({}),
    StaffAssignment.deleteMany({}),
    DriverAssignment.deleteMany({}),
    UserRole.deleteMany({}),
    CustomerAccount.deleteMany({}),
    PosDeviceAssignment.deleteMany({}),
    SupplierContract.deleteMany({}),
    Asset.deleteMany({}),
    Batch.deleteMany({}),
    DeliveryRoute.deleteMany({}),
    NAFDACRecord.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    GoodsReceivedNote.deleteMany({}),
    BillOfMaterials.deleteMany({}),
    QualityCheck.deleteMany({}),
    Invoice.deleteMany({}),
    PaymentReceipt.deleteMany({}),
    FuelLog.deleteMany({}),
    Attendance.deleteMany({}),
    Leave.deleteMany({}),
    Trip.deleteMany({}),
  ]);
  console.log("Cleared all collections");

  // Create admin staff record
  const adminStaff = await Staff.create({
    name: "Admin User",
    employmentType: "full-time",
    startDate: new Date(),
    isActive: true,
  });

  // Create only the admin user + role + staff link
  const adminUser = await User.create({
    name: "Admin User",
    email: "admin@verrip.com.ng",
    password: await hashPass("admin123"),
  });

  await Promise.all([
    StaffUserLink.create({ staffId: adminStaff._id, userId: adminUser._id }),
    UserRole.create({ userId: adminUser._id, role: "admin", isActive: true }),
  ]);

  console.log("\nSeed complete! Login: admin@verrip.com.ng / admin123");
  console.log("Only admin user created — all other data cleared.\n");
  console.log("Next steps — admin can now create via UI:");
  console.log("  Factories → Depots → Trucks → Products");
  console.log("  Then: Record Production → Transfer → Sales / Costs");
  console.log("\nAll 42 models cleared and ready.");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
