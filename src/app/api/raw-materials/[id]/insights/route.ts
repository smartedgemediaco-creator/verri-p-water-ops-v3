import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial, PurchaseOrder } from "@/lib/models";
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

  const materialId = new mongoose.Types.ObjectId(id);

  const [material, poAgg] = await Promise.all([
    RawMaterial.findById(materialId),
    PurchaseOrder.aggregate([
      { $unwind: "$items" },
      { $match: { "items.rawMaterialId": materialId } },
      { $group: { _id: null, totalQty: { $sum: "$items.quantity" }, count: { $sum: 1 }, totalSpent: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } },
    ]),
  ]);

  const currentStock = material?.currentStock ?? 0;
  const minimumStock = material?.minimumStock ?? 0;
  const unitCost = material?.unitCost ?? 0;
  const stockValue = currentStock * unitCost;
  const totalOrdered = poAgg[0]?.totalQty ?? 0;
  const timesOrdered = poAgg[0]?.count ?? 0;
  const totalSpent = poAgg[0]?.totalSpent ?? 0;
  const needsReorder = currentStock <= minimumStock;

  return NextResponse.json({
    currentStock,
    minimumStock,
    unitCost,
    stockValue,
    totalOrdered,
    timesOrdered,
    totalSpent,
    needsReorder,
  });
}
