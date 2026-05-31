import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, Cost, Stock, Wastage, Transfer } from "@/lib/models";
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

  const depotId = new mongoose.Types.ObjectId(id);

  const [saleAgg, costAgg, stockAgg, wasteAgg, transferAgg] =
    await Promise.all([
      Sale.aggregate([
        { $match: { locationType: "depot", locationId: depotId } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Cost.aggregate([
        { $match: { locationType: "depot", locationId: depotId } },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
          },
        },
      ]),
      Stock.aggregate([
        { $match: { locationType: "depot", locationId: depotId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$quantity" },
            products: { $addToSet: "$productId" },
          },
        },
      ]),
      Wastage.aggregate([
        { $match: { locationType: "depot", locationId: depotId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$quantity" },
            count: { $sum: 1 },
          },
        },
      ]),
      Transfer.countDocuments({
        $or: [
          { fromType: "depot", fromId: depotId, status: { $in: ["pending", "in-transit"] } },
          { toType: "depot", toId: depotId, status: { $in: ["pending", "in-transit"] } },
        ],
      }),
    ]);

  const totalSales = saleAgg[0]?.totalAmount ?? 0;
  const totalCostValue = costAgg.reduce(
    (s: number, c: { total: number }) => s + c.total,
    0
  );
  const totalStock = stockAgg[0]?.total ?? 0;
  const productCount = (stockAgg[0]?.products as string[] | undefined)?.length ?? 0;
  const totalWastage = wasteAgg[0]?.total ?? 0;
  const wastageCount = wasteAgg[0]?.count ?? 0;
  const activeTransfers = transferAgg;

  const costBreakdown = costAgg.map(
    (c: { _id: string; total: number }) => ({
      category: c._id,
      total: c.total,
    })
  );

  return NextResponse.json({
    totalSales,
    totalCosts: totalCostValue,
    profit: totalSales - totalCostValue,
    totalStock,
    productCount,
    totalWastage,
    wastageCount,
    activeTransfers,
    costBreakdown,
    saleCount: saleAgg[0]?.count ?? 0,
  });
}
