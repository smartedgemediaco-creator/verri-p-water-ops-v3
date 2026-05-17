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

  const { User } = await import("../src/lib/models/User");
  const { Factory } = await import("../src/lib/models/Factory");
  const { Depot } = await import("../src/lib/models/Depot");
  const { Truck } = await import("../src/lib/models/Truck");
  const { Product } = await import("../src/lib/models/Product");
  const { Inventory } = await import("../src/lib/models/Inventory");
  const { Sale } = await import("../src/lib/models/Sale");
  const { Cost } = await import("../src/lib/models/Cost");
  const { Transfer } = await import("../src/lib/models/Transfer");

  // Clear existing data
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
  ]);
  console.log("Cleared existing data");

  // Factories
  const factories = await Factory.insertMany([
    { name: "Verri P Main Factory", location: "Ikeja Industrial Area, Lagos", capacity: 50000 },
    { name: "Verri P Satellite Factory", location: "Ajah, Lagos", capacity: 25000 },
    { name: "Verri P North Hub", location: "Kaduna", capacity: 30000 },
  ]);
  console.log("Created factories");

  // Depots
  const depots = await Depot.insertMany([
    { name: "Mainland Depot", location: "Yaba, Lagos", manager: "John Okafor" },
    { name: "Island Depot", location: "Victoria Island, Lagos", manager: "Adaobi Nwosu" },
    { name: "Abuja Depot", location: "Wuse, Abuja", manager: "Musa Ibrahim" },
  ]);
  console.log("Created depots");

  // Users
  const admin = await User.create({
    name: "Admin User",
    email: "admin@verripwater.com",
    password: await hashPass("admin123"),
    role: "admin",
  });

  await User.create({
    name: "Factory Manager",
    email: "factory@verripwater.com",
    password: await hashPass("factory123"),
    role: "factory-manager",
    factoryId: factories[0]._id,
  });

  await User.create({
    name: "Depot Manager",
    email: "depot@verripwater.com",
    password: await hashPass("depot123"),
    role: "depot-manager",
    depotId: depots[0]._id,
  });

  console.log("Created users (admin@verripwater.com / admin123)");

  // Trucks
  const trucks = await Truck.insertMany([
    { plateNumber: "LAG-123-XY", driverName: "Emeka Obi", capacity: 5000, assignedToType: "factory", assignedToId: factories[0]._id },
    { plateNumber: "LAG-456-ZW", driverName: "Chidi Okonkwo", capacity: 4000, assignedToType: "depot", assignedToId: depots[0]._id },
    { plateNumber: "ABJ-789-AB", driverName: "Suleiman Musa", capacity: 6000, assignedToType: "factory", assignedToId: factories[2]._id },
    { plateNumber: "LAG-321-QR", driverName: "Femi Adeyemi", capacity: 3500 },
  ]);
  console.log("Created trucks");

  // Products
  const products = await Product.insertMany([
    { name: "Pure Water Sachet", unit: "bag", category: "sachet", description: "50cl pure water sachet, 20 per bag" },
    { name: "Verri P Table Water", unit: "carton", category: "bottle", description: "75cl bottle, 12 per carton" },
    { name: "Verri P Premium", unit: "carton", category: "bottle", description: "1.5L premium bottle, 6 per carton" },
  ]);
  console.log("Created products");

  // Inventory at factories
  await Inventory.insertMany([
    { locationType: "factory", locationId: factories[0]._id, productId: products[0]._id, quantity: 15000 },
    { locationType: "factory", locationId: factories[0]._id, productId: products[1]._id, quantity: 8000 },
    { locationType: "factory", locationId: factories[0]._id, productId: products[2]._id, quantity: 3000 },
    { locationType: "factory", locationId: factories[1]._id, productId: products[0]._id, quantity: 10000 },
    { locationType: "factory", locationId: factories[2]._id, productId: products[0]._id, quantity: 12000 },
  ]);

  // Inventory at depots
  await Inventory.insertMany([
    { locationType: "depot", locationId: depots[0]._id, productId: products[0]._id, quantity: 5000 },
    { locationType: "depot", locationId: depots[0]._id, productId: products[1]._id, quantity: 2000 },
    { locationType: "depot", locationId: depots[1]._id, productId: products[0]._id, quantity: 3000 },
    { locationType: "depot", locationId: depots[1]._id, productId: products[1]._id, quantity: 1500 },
  ]);
  console.log("Created inventory");

  // Transfers
  const now = new Date();
  const transfers = await Transfer.insertMany([
    { fromType: "factory", fromId: factories[0]._id, toType: "depot", toId: depots[0]._id, productId: products[0]._id, quantity: 2000, truckId: trucks[0]._id, status: "delivered", date: new Date(now.getTime() - 7 * 86400000) },
    { fromType: "factory", fromId: factories[0]._id, toType: "depot", toId: depots[1]._id, productId: products[1]._id, quantity: 1000, truckId: trucks[0]._id, status: "delivered", date: new Date(now.getTime() - 5 * 86400000) },
    { fromType: "factory", fromId: factories[2]._id, toType: "depot", toId: depots[2]._id, productId: products[0]._id, quantity: 1500, truckId: trucks[2]._id, status: "in-transit", date: new Date(now.getTime() - 2 * 86400000) },
  ]);
  console.log("Created transfers");

  // Sales (last 30 days)
  const salesData = [];
  for (let i = 0; i < 50; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const depot = depots[Math.floor(Math.random() * depots.length)];
    const maxQty = product.category === "sachet" ? 2000 : product.category === "bottle" ? 800 : 400;
    const minQty = product.category === "sachet" ? 500 : 100;
    const qty = Math.floor(Math.random() * (maxQty - minQty)) + minQty;
    const unitPrice = product.category === "sachet" ? 120 : product.category === "bottle" ? 350 : 600;
    salesData.push({
      depotId: depot._id,
      productId: product._id,
      quantity: qty,
      unitPrice,
      totalAmount: qty * unitPrice,
      customerName: ["Supermart Ltd", "Joe's Shop", "Mama Putty", "Green Grocer", "City Mart", "Alpha Stores"][Math.floor(Math.random() * 6)],
      date: new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000),
    });
  }
  await Sale.insertMany(salesData);
  console.log(`Created ${salesData.length} sales`);

  // Costs
  const costCategories = ["production", "transport", "maintenance", "salary", "utility", "other"];
  const costData = [];
  for (let i = 0; i < 25; i++) {
    const cat = costCategories[Math.floor(Math.random() * costCategories.length)];
    const isFactory = Math.random() > 0.5;
    costData.push({
      category: cat,
      amount: Math.floor(Math.random() * 140000) + 10000,
      description: `${cat} expense`,
      locationType: isFactory ? "factory" : "depot",
      locationId: isFactory ? factories[Math.floor(Math.random() * factories.length)]._id : depots[Math.floor(Math.random() * depots.length)]._id,
      date: new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000),
    });
  }
  await Cost.insertMany(costData);
  console.log(`Created ${costData.length} costs`);

  console.log("\nSeed complete!");
  console.log("Login: admin@verripwater.com / admin123");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
