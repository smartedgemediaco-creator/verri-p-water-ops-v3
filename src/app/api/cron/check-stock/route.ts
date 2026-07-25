import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, PurchaseOrder, Supplier } from "@/lib/models";
import { notifyBulkLowStock, notifyOverdueOrder, notifyPaymentReminder } from "@/lib/notifications";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const results: string[] = [];

  // 1. Check low stock materials
  const lowStockMaterials = await RawMaterial.find({
    $expr: { $lt: ["$currentStock", "$minimumStock"] },
    minimumStock: { $gt: 0 },
  }).lean();

  if (lowStockMaterials.length > 0) {
    await notifyBulkLowStock(
      lowStockMaterials.map((m) => ({
        name: m.name,
        current: m.currentStock,
        minimum: m.minimumStock,
        unit: m.unit,
      }))
    );
    results.push(`Low stock alerts sent for ${lowStockMaterials.length} materials`);
  }

  // 2. Check overdue purchase orders
  const now = new Date();
  const overdueOrders = await PurchaseOrder.find({
    status: { $in: ["sent", "confirmed"] },
    expectedDate: { $lt: now },
  })
    .populate("supplierId", "name")
    .lean();

  for (const order of overdueOrders) {
    const supplierName = (order.supplierId as unknown as { name: string })?.name || "Unknown";
    const expectedDate = order.expectedDate ? new Date(order.expectedDate) : new Date();
    const daysOverdue = Math.ceil((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 0) {
      await notifyOverdueOrder(order.orderNumber, supplierName, expectedDate.toLocaleDateString("en-NG"), daysOverdue);
    }
  }
  if (overdueOrders.length > 0) {
    results.push(`Overdue order alerts sent for ${overdueOrders.length} orders`);
  }

  // 3. Check unpaid orders older than 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const unpaidOrders = await PurchaseOrder.find({
    status: { $in: ["confirmed", "partially-received", "received"] },
    paymentStatus: { $in: ["unpaid", "partial"] },
    orderDate: { $lt: thirtyDaysAgo },
  })
    .populate("supplierId", "name")
    .lean();

  for (const order of unpaidOrders) {
    const supplierName = (order.supplierId as unknown as { name: string })?.name || "Unknown";
    const amountOwed = order.totalAmount - order.amountPaid;
    if (amountOwed > 0) {
      await notifyPaymentReminder(order.orderNumber, supplierName, amountOwed, order.totalAmount);
    }
  }
  if (unpaidOrders.length > 0) {
    results.push(`Payment reminder alerts sent for ${unpaidOrders.length} orders`);
  }

  await logActivity({
    action: "updated",
    entity: "general",
    entityId: "stock-check",
    description: `Stock check completed: ${results.join("; ") || "All clear"}`,
    userId: "system",
    metadata: { lowStock: lowStockMaterials.length, overdue: overdueOrders.length, unpaid: unpaidOrders.length },
  });

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    lowStock: lowStockMaterials.length,
    overdue: overdueOrders.length,
    unpaid: unpaidOrders.length,
    results,
  });
}
