import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Factory, Depot, Truck, Inventory, Sale, Cost, Transfer } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const isAdmin = user.role === "admin";
  const isFactoryMgr = user.role === "factory-manager";
  const isDepotMgr = user.role === "depot-manager";

  const factoriesQ = isFactoryMgr && user.factoryId
    ? Factory.countDocuments({ _id: user.factoryId })
    : isAdmin
    ? Factory.countDocuments()
    : Promise.resolve(0);

  const depotsQ = isDepotMgr && user.depotId
    ? Depot.countDocuments({ _id: user.depotId })
    : isAdmin
    ? Depot.countDocuments()
    : Promise.resolve(0);

  const truckFilter: Record<string, any> = {};
  if (isFactoryMgr && user.factoryId) {
    truckFilter.assignedToType = "factory";
    truckFilter.assignedToId = user.factoryId;
  } else if (isDepotMgr && user.depotId) {
    truckFilter.assignedToType = "depot";
    truckFilter.assignedToId = user.depotId;
  }
  const trucksQ = isAdmin ? Truck.countDocuments() : Truck.countDocuments(truckFilter);

  const inventoryFilter: Record<string, any> = {};
  if (isFactoryMgr && user.factoryId) {
    inventoryFilter.locationType = "factory";
    inventoryFilter.locationId = user.factoryId;
  } else if (isDepotMgr && user.depotId) {
    inventoryFilter.locationType = "depot";
    inventoryFilter.locationId = user.depotId;
  }

  const costFilter: Record<string, any> = {};
  if (isFactoryMgr && user.factoryId) {
    costFilter.locationType = "factory";
    costFilter.locationId = user.factoryId;
  } else if (isDepotMgr && user.depotId) {
    costFilter.locationType = "depot";
    costFilter.locationId = user.depotId;
  }

  const saleFilter: Record<string, any> = {};
  if (isAdmin) {
    // no filter — all sales
  } else if (isDepotMgr && user.depotId) {
    saleFilter.locationType = "depot";
    saleFilter.locationId = user.depotId;
  } else {
    // factory manager — no access to sales
    saleFilter._id = null; // forces empty result
  }

  const transferFilter: Record<string, any> = { status: "in-transit" };
  if (isFactoryMgr && user.factoryId) {
    transferFilter.fromType = "factory";
    transferFilter.fromId = user.factoryId;
  } else if (isDepotMgr && user.depotId) {
    transferFilter.toType = "depot";
    transferFilter.toId = user.depotId;
  }

  const [factories, depots, trucks, inventory, salesAgg, costsAgg, transfers] =
    await Promise.all([
      factoriesQ,
      depotsQ,
      trucksQ,
      Inventory.find(inventoryFilter),
      Sale.aggregate([
        { $match: saleFilter },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      ]),
      Cost.aggregate([
        { $match: costFilter },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Transfer.countDocuments(transferFilter),
    ]);

  const totalInventory = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalSales = salesAgg[0]?.total ?? 0;
  const totalCosts = costsAgg[0]?.total ?? 0;

  return NextResponse.json({
    factories,
    depots,
    trucks,
    totalInventory,
    totalSales,
    totalCosts,
    profit: totalSales - totalCosts,
    activeTransfers: transfers,
  });
}
