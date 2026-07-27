import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, RawMaterialBatch, PurchaseOrder } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const materials = await RawMaterial.find().lean();
  const totalMaterials = materials.length;
  const lowStockCount = materials.filter((m) => m.currentStock < m.minimumStock).length;
  const outOfStockCount = materials.filter((m) => m.currentStock <= 0).length;
  const totalStockValue = materials.reduce((s, m) => {
    const stock = m.totalBatchStock ?? m.currentStock ?? 0;
    const cost = m.averageCost ?? m.unitCost ?? 0;
    return s + stock * cost;
  }, 0);

  const batchAgg = await RawMaterialBatch.aggregate([
    { $match: { status: { $in: ["received", "partially-received"] } } },
    { $group: { _id: null, totalAvailable: { $sum: "$availableQuantity" }, totalConsumed: { $sum: "$consumedQuantity" }, totalBatches: { $sum: 1 } } },
  ]);

  const totalReceived = batchAgg[0]?.totalAvailable
    ? await RawMaterialBatch.aggregate([
        { $group: { _id: null, total: { $sum: "$receivedQuantity" } } },
      ]).then((r: Array<{ total: number }>) => r[0]?.total ?? 0)
    : materials.reduce((s, m) => s + (m.totalReceived ?? 0), 0);

  const totalConsumed = await RawMaterialBatch.aggregate([
    { $group: { _id: null, total: { $sum: "$consumedQuantity" } } },
  ]).then((r: Array<{ total: number }>) => r[0]?.total ?? 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pendingOrders = await PurchaseOrder.countDocuments({ status: { $in: ["sent", "confirmed"] } });
  const unpaidOrders = await PurchaseOrder.countDocuments({
    status: { $in: ["confirmed", "partially-received", "received"] },
    paymentStatus: { $in: ["unpaid", "partial"] },
  });
  const receivedThisMonth = await PurchaseOrder.countDocuments({
    status: { $in: ["partially-received", "received"] },
    receivedDate: { $gte: startOfMonth },
  });

  const totalOrderValue = await PurchaseOrder.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  const totalPaidValue = await PurchaseOrder.aggregate([
    { $match: { paymentStatus: { $in: ["partial", "paid"] } } },
    { $group: { _id: null, total: { $sum: "$amountPaid" } } },
  ]);

  return NextResponse.json({
    totalMaterials,
    lowStockCount,
    outOfStockCount,
    totalStockValue,
    totalReceived,
    totalConsumed,
    pendingOrders,
    unpaidOrders,
    receivedThisMonth,
    totalOrderValue: totalOrderValue[0]?.total ?? 0,
    totalPaidValue: totalPaidValue[0]?.total ?? 0,
    totalUnpaidValue: (totalOrderValue[0]?.total ?? 0) - (totalPaidValue[0]?.total ?? 0),
  });
}
