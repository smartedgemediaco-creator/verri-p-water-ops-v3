import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Factory, Depot, Truck, Inventory, Sale, Cost, Transfer, Wastage } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const isAdmin = user.role === "admin";
  const isFactoryMgr = user.role === "factory-manager";
  const isDepotMgr = user.role === "depot-manager";
  const toObj = (id: string) => new mongoose.Types.ObjectId(id);

  // Build role-scoped filters
  const factoryFilter = (isFactoryMgr && user.factoryId) ? { _id: user.factoryId } : {};
  const depotFilter = (isDepotMgr && user.depotId) ? { _id: user.depotId } : {};
  const truckFilter: Record<string, any> = {};
  if (isFactoryMgr && user.factoryId) {
    truckFilter.assignedToType = "factory";
    truckFilter.assignedToId = user.factoryId;
  } else if (isDepotMgr && user.depotId) {
    truckFilter.assignedToType = "depot";
    truckFilter.assignedToId = user.depotId;
  }

  const isDriver = user.role === "driver";
  const saleCostFilter: Record<string, any> = {};
  const invFilter: Record<string, any> = {};
  if (isDriver) {
    saleCostFilter._id = null;
    invFilter._id = null;
  } else if (isFactoryMgr && user.factoryId) {
    saleCostFilter.locationType = "factory";
    saleCostFilter.locationId = toObj(user.factoryId);
    invFilter.locationType = "factory";
    invFilter.locationId = toObj(user.factoryId);
  } else if (isDepotMgr && user.depotId) {
    saleCostFilter.locationType = "depot";
    saleCostFilter.locationId = toObj(user.depotId);
    invFilter.locationType = "depot";
    invFilter.locationId = toObj(user.depotId);
  }

  // Fetch all entities and aggregated data in parallel
  const [factories, depots, trucks, saleAgg, costAgg, invAgg, transAgg, wasteAgg] = await Promise.all([
    isDriver ? [] : Factory.find(factoryFilter).lean(),
    isDriver ? [] : Depot.find(depotFilter).lean(),
    isDriver ? [] : Truck.find(truckFilter).lean(),
    // Sales grouped by locationType + locationId
    isDriver
      ? Promise.resolve([])
      : Sale.aggregate([
          { $match: saleCostFilter },
          {
            $group: {
              _id: { locationType: "$locationType", locationId: "$locationId" },
              total: { $sum: "$totalAmount" },
              count: { $sum: 1 },
            },
          },
        ]),
    // Costs grouped by locationType + locationId
    isDriver
      ? Promise.resolve([])
      : Cost.aggregate([
          { $match: saleCostFilter },
          {
            $group: {
              _id: { locationType: "$locationType", locationId: "$locationId" },
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ]),
    // Inventory grouped by locationType + locationId
    Inventory.aggregate([
      { $match: { quantity: { $gt: 0 }, ...invFilter } },
      {
        $group: {
          _id: { locationType: "$locationType", locationId: "$locationId" },
          total: { $sum: "$quantity" },
        },
      },
    ]),
    // Active transfers grouped by truckId
    Transfer.aggregate([
      { $match: { status: "in-transit", truckId: { $ne: null } } },
      {
        $group: {
          _id: "$truckId",
          count: { $sum: 1 },
        },
      },
    ]),
    // Wastage grouped by locationType + locationId
    isDriver
      ? Promise.resolve([])
      : Wastage.aggregate([
          { $match: saleCostFilter },
          {
            $group: {
              _id: { locationType: "$locationType", locationId: "$locationId" },
              total: { $sum: "$quantity" },
              count: { $sum: 1 },
            },
          },
        ]),
  ]);

  // Build lookup maps
  const saleMap: Record<string, number> = {};
  for (const s of saleAgg) {
    const key = `${s._id.locationType}:${s._id.locationId.toString()}`;
    saleMap[key] = s.total;
  }

  const costMap: Record<string, number> = {};
  for (const c of costAgg) {
    const key = `${c._id.locationType}:${c._id.locationId.toString()}`;
    costMap[key] = c.total;
  }

  const invMap: Record<string, number> = {};
  for (const i of invAgg) {
    const key = `${i._id.locationType}:${i._id.locationId.toString()}`;
    invMap[key] = i.total;
  }

  const transferMap: Record<string, number> = {};
  for (const t of transAgg) {
    transferMap[t._id.toString()] = t.count;
  }

  const wasteMap: Record<string, { quantity: number; count: number }> = {};
  for (const w of wasteAgg) {
    const key = `${w._id.locationType}:${w._id.locationId.toString()}`;
    wasteMap[key] = { quantity: w.total, count: w.count };
  }

  // Map factories
  const factoryRows = factories.map((f) => {
    const key = `factory:${f._id.toString()}`;
    const sales = saleMap[key] ?? 0;
    const costs = costMap[key] ?? 0;
    const w = wasteMap[key];
    return {
      _id: f._id,
      name: f.name,
      location: f.location,
      sales,
      costs,
      profit: sales - costs,
      inventory: invMap[key] ?? 0,
      wastage: w?.quantity ?? 0,
      wastageCount: w?.count ?? 0,
    };
  });

  const depotRows = depots.map((d) => {
    const key = `depot:${d._id.toString()}`;
    const sales = saleMap[key] ?? 0;
    const costs = costMap[key] ?? 0;
    const w = wasteMap[key];
    return {
      _id: d._id,
      name: d.name,
      location: d.location,
      sales,
      costs,
      profit: sales - costs,
      inventory: invMap[key] ?? 0,
      wastage: w?.quantity ?? 0,
      wastageCount: w?.count ?? 0,
    };
  });

  const truckRows = trucks.map((t) => {
    const key = `truck:${t._id.toString()}`;
    const sales = saleMap[key] ?? 0;
    const costs = costMap[key] ?? 0;
    const w = wasteMap[key];
    return {
      _id: t._id,
      plateNumber: t.plateNumber,
      driverName: t.driverName,
      sales,
      costs,
      profit: sales - costs,
      inventory: invMap[key] ?? 0,
      activeTransfers: transferMap[t._id.toString()] ?? 0,
      wastage: w?.quantity ?? 0,
      wastageCount: w?.count ?? 0,
    };
  });

  return NextResponse.json({
    factories: factoryRows,
    depots: depotRows,
    trucks: truckRows,
  });
}
