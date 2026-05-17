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

  // Drop everything except the admin user
  const { User } = await import("../src/lib/models/User");

  // Find and preserve the admin user
  const admin = await User.findOne({ email: "admin@verripwater.com" });
  if (admin) {
    console.log(`Preserving admin user: ${admin.email} (${admin._id})`);
  } else {
    console.log("No admin user found — will create one after reset");
  }

  // Remove all non-user collections
  const skipCollections = new Set(["users"]);
  for (const name of collectionNames) {
    if (skipCollections.has(name)) {
      console.log(`Skipping collection: ${name}`);
      continue;
    }
    await mongoose.connection.db!.dropCollection(name);
    console.log(`Dropped collection: ${name}`);
  }

  // Delete non-admin users
  const deleted = await User.deleteMany({ role: { $ne: "admin" } });
  console.log(`Deleted ${deleted.deletedCount} non-admin users`);

  // Ensure admin exists
  if (!admin) {
    const { hashPassword } = await import("../src/lib/auth");
    await User.create({
      name: "Admin User",
      email: "admin@verripwater.com",
      password: await hashPassword("admin123"),
      role: "admin",
    });
    console.log("Created default admin user");
  }

  console.log("\nReset complete!");
  console.log("Login: admin@verripwater.com / admin123");
  console.log("All collections cleared except users (admin preserved).");

  await mongoose.disconnect();
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
