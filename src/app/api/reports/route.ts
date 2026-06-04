/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import {
  Factory, Depot, Truck, Product, Stock,
  Sale, Cost, Transfer, Production, ActivityLog,
} from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const url = new URL(req.url);
  const domainType = url.searchParams.get("domainType");
  const domainId = url.searchParams.get("domainId");
  const productId = url.searchParams.get("productId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const dateFilter: Record<string, any> = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate + "T23:59:59.999Z");

  const dateMatch = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

  const scopeFilter: Record<string, any> = {};
  if (domainType && domainId) {
    scopeFilter.locationType = domainType;
    scopeFilter.locationId = domainId;
  } else {
    if (user.role === "factory-manager" && user.factoryId) {
      scopeFilter.locationType = "factory";
      scopeFilter.locationId = user.factoryId;
    } else if (user.role === "depot-manager" && user.depotId) {
      scopeFilter.locationType = "depot";
      scopeFilter.locationId = user.depotId;
    } else if (user.role === "driver" && user.truckId) {
      scopeFilter.locationType = "truck";
      scopeFilter.locationId = user.truckId;
    }
  }

  let saleFilter: Record<string, any> = { ...dateMatch };
  const costFilter: Record<string, any> = { ...dateMatch, ...scopeFilter };
  const productionFilter: Record<string, any> = { ...dateMatch };
  const transferFilter: Record<string, any> = { ...dateMatch };

  if (scopeFilter.locationType === "factory") {
    productionFilter.factoryId = scopeFilter.locationId;
    transferFilter.fromType = "factory";
    transferFilter.fromId = scopeFilter.locationId;
  } else if (scopeFilter.locationType === "depot") {
    saleFilter = { ...saleFilter, locationType: "depot", locationId: scopeFilter.locationId };
    transferFilter.toType = "depot";
    transferFilter.toId = scopeFilter.locationId;
  } else if (scopeFilter.locationType === "truck") {
    saleFilter = { ...saleFilter, locationType: "truck", locationId: scopeFilter.locationId };
    transferFilter.truckId = scopeFilter.locationId;
  }

  if (productId) {
    saleFilter.productId = productId;
    productionFilter.productId = productId;
    transferFilter.productId = productId;
  }

  // Role-based data access for sales
  const isAdmin = user.role === "admin";
  const isFactoryMgr = user.role === "factory-manager";
  const isDepotMgr = user.role === "depot-manager";
  const isDriver = user.role === "driver";

  if (isFactoryMgr) {
    saleFilter._id = null;
  } else if (isDepotMgr && user.depotId && !saleFilter.locationId) {
    saleFilter = { ...saleFilter, locationType: "depot", locationId: user.depotId };
  } else if (isDriver && user.truckId && !saleFilter.locationId) {
    saleFilter = { ...saleFilter, locationType: "truck", locationId: user.truckId };
  } else if (!isAdmin) {
    saleFilter._id = null;
  }

  const [
    factories,
    depots,
    trucks,
    products,
    stockData,
    sales,
    costs,
    production,
    transfers,
    activityLogs,
  ] = await Promise.all([
    scopeFilter.locationType === "factory"
      ? Factory.find({ _id: scopeFilter.locationId }).lean()
      : Factory.find({}).lean(),
    scopeFilter.locationType === "depot"
      ? Depot.find({ _id: scopeFilter.locationId }).lean()
      : Depot.find({}).lean(),
    Truck.find({}).lean(),
    Product.find({}).lean(),
    scopeFilter.locationType
      ? Stock.find(scopeFilter).populate("productId").lean()
      : Stock.find({}).populate("productId").lean(),
    Sale.find(saleFilter).populate("productId").sort({ date: -1 }).lean(),
    Cost.find(costFilter).sort({ date: -1 }).lean(),
    Production.find(productionFilter).populate("productId").populate("factoryId").sort({ date: -1 }).lean(),
    Transfer.find(transferFilter).populate("productId").populate("truckId").sort({ date: -1 }).lean(),
    ActivityLog.find({ ...(productId ? { productId } : {}) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const totalSalesAmount = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
  const totalCostsAmount = costs.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  const totalStockQty = stockData.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      generatedBy: user.email,
      role: user.role,
      filters: { domainType, domainId, productId, startDate, endDate },
    },
    entities: {
      factories: factories.map((f: any) => ({ _id: f._id.toString(), name: f.name, location: f.location, capacity: f.capacity, isActive: f.isActive })),
      depots: depots.map((d: any) => ({ _id: d._id.toString(), name: d.name, location: d.location, isActive: d.isActive })),
      trucks: trucks.map((t: any) => ({ _id: t._id.toString(), plateNumber: t.plateNumber, isActive: t.isActive })),
      products: products.map((p: any) => ({ _id: p._id.toString(), name: p.name, category: p.category, unit: p.unit })),
    },
    stock: stockData.map((i: any) => ({
      product: (i.productId as any)?.name ?? "Unknown",
      productId: (i.productId as any)?._id?.toString(),
      locationType: i.locationType,
      locationId: i.locationId.toString(),
      quantity: i.quantity,
    })),
    sales: sales.map((s: any) => ({
      _id: s._id.toString(),
      location: `${s.locationType}:${s.locationId?.toString().slice(-6) ?? "N/A"}`,
      product: (s.productId as any)?.name ?? "Unknown",
      productId: (s.productId as any)?._id?.toString(),
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      totalAmount: s.totalAmount,
      customerName: s.customerName,
      date: s.date,
    })),
    costs: costs.map((c: any) => ({
      _id: c._id.toString(),
      category: c.category,
      amount: c.amount,
      description: c.description,
      locationType: c.locationType,
      locationId: c.locationId?.toString(),
      date: c.date,
    })),
    production: production.map((p: any) => ({
      _id: p._id.toString(),
      factory: (p.factoryId as any)?.name ?? "Unknown",
      product: (p.productId as any)?.name ?? "Unknown",
      productId: (p.productId as any)?._id?.toString(),
      quantity: p.quantity,
      date: p.date,
    })),
    transfers: transfers.map((t: any) => ({
      _id: t._id.toString(),
      fromType: t.fromType,
      toType: t.toType,
      product: (t.productId as any)?.name ?? "Unknown",
      productId: (t.productId as any)?._id?.toString(),
      quantity: t.quantity,
      truck: (t.truckId as any)?.plateNumber ?? "Unknown",
      status: t.status,
      date: t.date,
    })),
    activityLogs: activityLogs.map((a: any) => ({
      _id: a._id.toString(),
      action: a.action,
      entity: a.entity,
      description: a.description,
      createdAt: a.createdAt,
    })),
    totals: {
      sales: totalSalesAmount,
      costs: totalCostsAmount,
      profit: totalSalesAmount - totalCostsAmount,
      stock: totalStockQty,
      production: production.length,
      transfers: transfers.length,
    },
  });
}
