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
  const totalStockValue = materials.reduce((s, m) => s + m.currentStock * m.unitCost, 0);

  const batchAgg = await RawMaterialBatch.aggregate([
    { $group: { _id: null, totalReceived: { $sum: "$receivedQuantity" }, totalConsumed: { $sum: "$consumedQuantity" } } },
  ]);

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

  const supplierBreakdown = await RawMaterial.aggregate([
    {
      $group: {
        _id: "$supplierId",
        materialCount: { $sum: 1 },
        totalStockValue: { $sum: { $multiply: [{ $ifNull: ["$currentStock", 0] }, { $ifNull: ["$unitCost", 0] }] } },
      },
    },
    {
      $lookup: {
        from: "suppliers",
        localField: "_id",
        foreignField: "_id",
        as: "supplier",
      },
    },
    { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        supplierId: "$_id",
        supplierName: { $ifNull: ["$supplier.name", "Unassigned"] },
        materialCount: 1,
        totalStockValue: 1,
      },
    },
    { $sort: { materialCount: -1 } },
  ]);

  return NextResponse.json({
    totalMaterials,
    lowStockCount,
    outOfStockCount,
    totalStockValue,
    totalReceived: batchAgg[0]?.totalReceived ?? 0,
    totalConsumed: batchAgg[0]?.totalConsumed ?? 0,
    pendingOrders,
    unpaidOrders,
    receivedThisMonth,
    totalOrderValue: totalOrderValue[0]?.total ?? 0,
    totalPaidValue: totalPaidValue[0]?.total ?? 0,
    totalUnpaidValue: (totalOrderValue[0]?.total ?? 0) - (totalPaidValue[0]?.total ?? 0),
    supplierBreakdown,
  });
}
