import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Inventory, Transfer } from "@/lib/models";

export async function GET() {
  await connectDB();

  const lowStock = await Inventory.find({ quantity: { $lte: 0 } })
    .populate("productId")
    .limit(10);

  const recentTransfers = await Transfer.find({ status: "in-transit" })
    .populate("productId")
    .populate("truckId")
    .limit(5);

  return NextResponse.json({
    lowStock: lowStock.map(i => ({
      product: (i as any).productId?.name ?? "Unknown",
      quantity: i.quantity,
      locationType: i.locationType,
      locationId: i.locationId,
    })),
    inTransit: recentTransfers.map(t => ({
      product: (t as any).productId?.name ?? "Unknown",
      truck: (t as any).truckId?.plateNumber ?? "Unknown",
      quantity: t.quantity,
    })),
  });
}
