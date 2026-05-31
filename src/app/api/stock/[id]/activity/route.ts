import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Stock, Production, Sale, Transfer, Wastage, Factory, Depot } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const item = await Stock.findById(id).populate("productId", "name").lean();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { locationType, locationId } = item;
  const rawProductId = typeof item.productId === "string" ? item.productId : (item.productId as { _id: string })?._id ?? item.productId;
  const oid = new mongoose.Types.ObjectId(locationId as string);
  const pid = new mongoose.Types.ObjectId(rawProductId as string);

  const results: {
    productions: Record<string, unknown>[];
    sales: Record<string, unknown>[];
    transfers: Record<string, unknown>[];
    wastages: Record<string, unknown>[];
  } = {
    productions: [],
    sales: [],
    transfers: [],
    wastages: [],
  };

  if (locationType === "factory") {
    results.productions = await Production.find({ factoryId: oid, productId: pid })
      .populate("productId", "name")
      .sort({ date: -1 })
      .limit(50)
      .lean();
  }

  results.sales = await Sale.find({ locationType, locationId: oid, productId: pid })
    .populate("productId", "name")
    .sort({ date: -1 })
    .limit(50)
    .lean();

  const rawTransfers = await Transfer.find({
    productId: pid,
    $or: [{ fromId: oid }, { toId: oid }],
  })
    .populate("productId", "name")
    .populate("truckId", "plateNumber")
    .sort({ date: -1 })
    .limit(50)
    .lean();

  results.transfers = await Promise.all(rawTransfers.map(async (t) => {
    const fromName = t.fromType === "factory"
      ? (await Factory.findById(t.fromId).select("name").lean())?.name ?? null
      : (await Depot.findById(t.fromId).select("name").lean())?.name ?? null;
    const toName = t.toType === "factory"
      ? (await Factory.findById(t.toId).select("name").lean())?.name ?? null
      : (await Depot.findById(t.toId).select("name").lean())?.name ?? null;
    return { ...t, fromName, toName };
  }));

  results.wastages = await Wastage.find({ locationType, locationId: oid, productId: pid })
    .populate("productId", "name")
    .sort({ date: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(results);
}
