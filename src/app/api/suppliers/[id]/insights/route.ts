import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PurchaseOrder, GoodsReceivedNote, SupplierContract, RawMaterial, Supplier } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const supplierId = new mongoose.Types.ObjectId(id);
  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const [poAgg, poStatusAgg, contract, materialAgg, recentPOs, recentGRNs] =
    await Promise.all([
      PurchaseOrder.aggregate([
        { $match: { supplierId } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
      PurchaseOrder.aggregate([
        { $match: { supplierId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      SupplierContract.findOne({ supplierId }).lean(),
      RawMaterial.aggregate([
        {
          $lookup: {
            from: "purchaseorders",
            let: { matId: "$_id" },
            pipeline: [
              { $match: { supplierId } },
              { $unwind: "$items" },
              { $match: { $expr: { $eq: ["$items.rawMaterialId", "$$matId"] } } },
            ],
            as: "orders",
          },
        },
        { $match: { "orders.0": { $exists: true } } },
        { $project: { name: 1, category: 1, currentStock: 1, minimumStock: 1, unit: 1, unitCost: 1 } },
      ]),
      PurchaseOrder.find({ supplierId })
        .sort({ orderDate: -1 })
        .limit(5)
        .lean(),
      GoodsReceivedNote.find()
        .populate("purchaseOrderId")
        .sort({ receivedDate: -1 })
        .limit(5)
        .lean(),
    ]);

  const statusBreakdown = poStatusAgg.map(
    (s: { _id: string; count: number }) => ({
      status: s._id,
      count: s.count,
    })
  );

  const avgOrderValue =
    poAgg[0]?.count > 0
      ? (poAgg[0]?.totalSpent ?? 0) / (poAgg[0]?.count ?? 1)
      : 0;

  return NextResponse.json({
    totalOrders: poAgg[0]?.count ?? 0,
    totalSpent: poAgg[0]?.totalSpent ?? 0,
    averageOrderValue: avgOrderValue,
    statusBreakdown,
    materials: materialAgg.map((m) => ({
      _id: m._id,
      name: m.name,
      category: m.category,
      currentStock: m.currentStock,
      minimumStock: m.minimumStock,
      unit: m.unit,
      unitCost: m.unitCost,
      needsReorder: m.currentStock <= m.minimumStock,
    })),
    materialsNeedingReorder: materialAgg.filter(
      (m) => m.currentStock <= m.minimumStock
    ).length,
    contract: contract
      ? {
          contractStart: contract.contractStart,
          contractEnd: contract.contractEnd,
          paymentTerms: contract.paymentTerms,
          leadTimeDays: contract.leadTimeDays,
          isActive: contract.isActive,
        }
      : null,
    recentOrders: recentPOs.map((po) => ({
      _id: po._id,
      orderNumber: po.orderNumber,
      totalAmount: po.totalAmount,
      status: po.status,
      orderDate: po.orderDate,
      itemCount: po.items?.length ?? 0,
    })),
    recentGRNs: recentGRNs
      .filter(
        (grn) =>
          (grn.purchaseOrderId as unknown as Record<string, string>)
            ?.supplierId
            ?.toString() === id
      )
      .map((grn) => ({
        _id: grn._id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orderNumber: (grn as any).purchaseOrderId?.orderNumber ?? "—",
        receivedDate: grn.receivedDate,
        receivedBy: grn.receivedBy,
        itemCount: grn.items?.length ?? 0,
      })),
    createdDate: supplier.createdAt,
  });
}
