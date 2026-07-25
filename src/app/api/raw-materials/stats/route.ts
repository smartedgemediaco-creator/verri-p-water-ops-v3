import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, PurchaseOrder } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const materials = await RawMaterial.find().lean();

  const totalMaterials = materials.length;
  const lowStockCount = materials.filter((m) => m.currentStock < m.minimumStock).length;
  const outOfStockCount = materials.filter((m) => m.currentStock <= 0).length;
  const totalStockValue = materials.reduce((s, m) => s + (m.currentStock ?? 0) * (m.unitCost ?? 0), 0);
  const totalReceived = materials.reduce((s, m) => s + (m.totalReceived ?? 0), 0);
  const totalConsumed = materials.reduce((s, m) => s + (m.totalConsumed ?? 0), 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pendingOrders = await PurchaseOrder.countDocuments({
    status: { $in: ["sent", "confirmed"] },
  });

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
