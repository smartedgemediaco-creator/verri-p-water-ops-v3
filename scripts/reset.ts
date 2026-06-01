import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

async function reset() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const collections = await mongoose.connection.db!.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);

  // Drop everything except the admin user + staff link + user role
  const { User, Staff, StaffUserLink, UserRole } = await import("../src/lib/models");

  // Find and preserve the admin user
  const admin = await User.findOne({ email: "admin@verrip.com.ng" });
  let adminStaffLink = null;
  if (admin) {
    adminStaffLink = await StaffUserLink.findOne({ userId: admin._id });
    console.log(`Preserving admin user: ${admin.email} (${admin._id})`);
  } else {
    console.log("No admin user found — will create one after reset");
  }

  // Remove all non-user collections
  const skipCollections = new Set(["users", "staff", "staffuserlinks", "userroles"]);
  for (const name of collectionNames) {
    if (skipCollections.has(name)) {
      console.log(`Skipping collection: ${name}`);
      continue;
    }
    await mongoose.connection.db!.dropCollection(name);
    console.log(`Dropped collection: ${name}`);
  }

  // Delete non-admin users + their links + roles
  const allUsers = await User.find({});
  for (const u of allUsers) {
    if (u.email === "admin@verrip.com.ng") continue;
    await StaffUserLink.deleteMany({ userId: u._id });
    await UserRole.deleteMany({ userId: u._id });
    await u.deleteOne();
    console.log(`Removed user: ${u.email}`);
  }

  // Ensure admin exists with full setup
  if (!admin) {
    const { hashPassword } = await import("../src/lib/auth");
    const adminStaff = await Staff.create({
      name: "Admin User",
      employmentType: "full-time",
      startDate: new Date(),
      isActive: true,
    });
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@verrip.com.ng",
      password: await hashPassword("admin123"),
    });
    await Promise.all([
      StaffUserLink.create({ staffId: adminStaff._id, userId: adminUser._id }),
      UserRole.create({ userId: adminUser._id, role: "admin", isActive: true }),
    ]);
    console.log("Created default admin user with full setup");
  } else if (!adminStaffLink) {
    // Admin exists but no staff link — create one
    const adminStaff = await Staff.create({
      name: "Admin User",
      employmentType: "full-time",
      startDate: new Date(),
      isActive: true,
    });
    await Promise.all([
      StaffUserLink.create({ staffId: adminStaff._id, userId: admin._id }),
      UserRole.create({ userId: admin._id, role: "admin", isActive: true }),
    ]);
    console.log("Recreated admin staff link + role");
  }

  console.log("\nReset complete!");
  console.log("Login: admin@verrip.com.ng / admin123");
  console.log("All collections cleared except admin user + staff setup.");

  await mongoose.disconnect();
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
