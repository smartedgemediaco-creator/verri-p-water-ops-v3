import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Factory, Depot, Truck, Stock, Sale, Cost, Transfer, Wastage, DashboardReset, DailyStock, SalesLedger, TruckLoad } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const resetDoc = await DashboardReset.findOne({ key: "stats" }).lean();
  const resetAt = resetDoc?.resetAt ? new Date(resetDoc.resetAt) : null;
  const resetDateStr = resetAt ? resetAt.toISOString().slice(0, 10) : null;

  const isFactoryMgr = user.role === "factory-manager";
  const isDepotMgr = user.role === "depot-manager";
  const toObj = (id: string) => new mongoose.Types.ObjectId(id);

  // Build role-scoped filters
  const factoryFilter = (isFactoryMgr && user.factoryId) ? { _id: user.factoryId } : {};
  const depotFilter = (isDepotMgr && user.depotId) ? { _id: user.depotId } : {};
  const truckFilter: Record<string, unknown> = {};
  if (isFactoryMgr && user.factoryId) {
    truckFilter._id = user.factoryId;
  } else if (isDepotMgr && user.depotId) {
    truckFilter._id = user.depotId;
  }

  const isDriver = user.role === "driver";
  const saleCostFilter: Record<string, unknown> = {};
  const invFilter: Record<string, unknown> = {};
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

  // Apply reset baseline to Sale filters (date field is Date)
  if (resetAt) {
    const cur = (saleCostFilter.date as Record<string, Date> | undefined);
    const merged: Record<string, Date> = { ...(cur || {}) };
    if (!cur?.["$gte"] || resetAt > new Date(cur["$gte"])) merged["$gte"] = resetAt;
    saleCostFilter.date = merged;
  }

  // DailyStock and SalesLedger filters (date is string YYYY-MM-DD)
  const dailyFilter: Record<string, unknown> = {};
  const ledgerFilter: Record<string, unknown> = {};
  if (isDriver) {
    dailyFilter._id = null;
    ledgerFilter._id = null;
  } else if (isFactoryMgr && user.factoryId) {
    dailyFilter.locationType = "factory";
    dailyFilter.locationId = user.factoryId;
    ledgerFilter.locationType = "factory";
    ledgerFilter.locationId = user.factoryId;
  } else if (isDepotMgr && user.depotId) {
    dailyFilter.locationType = "depot";
    dailyFilter.locationId = user.depotId;
    ledgerFilter.locationType = "depot";
    ledgerFilter.locationId = user.depotId;
  }
  if (resetDateStr) {
    dailyFilter.date = { $gte: resetDateStr };
    ledgerFilter.date = { $gte: resetDateStr };
  }

  // Fetch all entities and aggregated data in parallel
  const [factories, depots, trucks, saleAgg, costAgg, invAgg, transAgg, truckLoadAgg, wasteAgg, dailyAgg, ledgerAgg] = await Promise.all([
    isDriver ? [] : Factory.find(factoryFilter).lean(),
    isDriver ? [] : Depot.find(depotFilter).lean(),
    isDriver ? [] : Truck.find(truckFilter).lean(),
    // Sales grouped by locationType + locationId (only after reset)
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
    Stock.aggregate([
      { $match: { quantity: { $gt: 0 }, ...invFilter } },
      {
        $group: {
          _id: { locationType: "$locationType", locationId: "$locationId" },
          total: { $sum: "$quantity" },
        },
      },
    ]),
    // Active transfers grouped by truckId (Transfer)
    Transfer.aggregate([
      { $match: { status: "in-transit", truckId: { $ne: null } } },
      {
        $group: {
          _id: "$truckId",
          count: { $sum: 1 },
        },
      },
    ]),
    // Active truck loads grouped by truckId
    TruckLoad.aggregate([
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
    // DailyStock sales grouped by locationType + locationId (cashDelivered + debts)
    isDriver ? Promise.resolve([]) : DailyStock.aggregate([
      { $match: dailyFilter },
      {
        $group: {
          _id: { locationType: "$locationType", locationId: "$locationId" },
          total: { $sum: { $add: ["$cashDelivered", { $ifNull: ["$debts", 0] }] } },
          count: { $sum: 1 },
        },
      },
    ]),
    // SalesLedger grouped by locationType + locationId
    isDriver ? Promise.resolve([]) : SalesLedger.aggregate([
      { $match: ledgerFilter },
      {
        $group: {
          _id: { locationType: "$locationType", locationId: "$locationId" },
          total: { $sum: { $ifNull: ["$amountSold", 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Build lookup maps - combine Sale + DailyStock + SalesLedger for total sales
  const saleMap: Record<string, number> = {};
  for (const s of saleAgg) {
    const key = `${s._id.locationType}:${s._id.locationId.toString()}`;
    saleMap[key] = (saleMap[key] ?? 0) + s.total;
  }
  for (const d of dailyAgg) {
    const key = `${d._id.locationType}:${d._id.locationId.toString()}`;
    saleMap[key] = (saleMap[key] ?? 0) + d.total;
  }
  for (const l of ledgerAgg) {
    const key = `${l._id.locationType}:${l._id.locationId.toString()}`;
    saleMap[key] = (saleMap[key] ?? 0) + l.total;
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
    transferMap[t._id.toString()] = (transferMap[t._id.toString()] ?? 0) + t.count;
  }
  for (const tl of truckLoadAgg) {
    transferMap[tl._id.toString()] = (transferMap[tl._id.toString()] ?? 0) + tl.count;
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
      stock: invMap[key] ?? 0,
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
      stock: invMap[key] ?? 0,
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
      driverName: "",
      sales,
      costs,
      profit: sales - costs,
      stock: invMap[key] ?? 0,
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
