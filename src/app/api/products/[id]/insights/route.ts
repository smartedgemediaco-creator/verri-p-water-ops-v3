import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, Stock, Wastage, Production } from "@/lib/models";
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

  const productId = new mongoose.Types.ObjectId(id);

  const [saleAgg, stockAgg, wasteAgg, productionAgg] = await Promise.all([
    Sale.aggregate([
      { $match: { productId } },
      { $group: { _id: null, totalQty: { $sum: "$quantity" }, totalAmount: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    Stock.aggregate([
      { $match: { productId } },
      { $group: { _id: null, total: { $sum: "$quantity" }, locations: { $addToSet: { locationType: "$locationType", locationId: "$locationId" } } } },
    ]),
    Wastage.aggregate([
      { $match: { productId } },
      { $group: { _id: null, total: { $sum: "$quantity" }, count: { $sum: 1 } } },
    ]),
    Production.aggregate([
      { $match: { productId } },
      { $group: { _id: null, totalQty: { $sum: "$quantity" }, count: { $sum: 1 } } },
    ]),
  ]);

  const totalSold = saleAgg[0]?.totalQty ?? 0;
  const totalRevenue = saleAgg[0]?.totalAmount ?? 0;
  const saleCount = saleAgg[0]?.count ?? 0;
  const totalStock = stockAgg[0]?.total ?? 0;
  const locationCount = (stockAgg[0]?.locations as unknown[] | undefined)?.length ?? 0;
  const totalWastage = wasteAgg[0]?.total ?? 0;
  const wastageCount = wasteAgg[0]?.count ?? 0;
  const totalProduced = productionAgg[0]?.totalQty ?? 0;
  const productionCount = productionAgg[0]?.count ?? 0;

  return NextResponse.json({
    totalStock,
    totalSold,
    totalRevenue,
    totalProduced,
    locationCount,
    totalWastage,
    wastageCount,
    saleCount,
    productionCount,
  });
}
