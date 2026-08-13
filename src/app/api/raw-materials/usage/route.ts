import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterialConsumption, RawMaterial } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const rawMaterialId = searchParams.get("rawMaterialId");
  const purpose = searchParams.get("purpose");
  const batchId = searchParams.get("batchId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

  const filter: Record<string, unknown> = {};
  if (rawMaterialId) filter.rawMaterialId = rawMaterialId;
  if (purpose) filter.purpose = purpose;
  if (batchId) filter["allocations.batchId"] = batchId;
  if (from || to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000);
    filter.date = dateFilter;
  }

  if (search) {
    const nameMatch = await RawMaterial.find({ name: { $regex: search, $options: "i" } }).distinct("_id");
    filter.$or = [{ rawMaterialId: { $in: nameMatch } }, { notes: { $regex: search, $options: "i" } }];
  }

  const records = await RawMaterialConsumption.find(filter)
    .populate("rawMaterialId", "name unit category")
    .populate("allocations.batchId", "batchNumber unit unitPrice supplierName")
    .populate("createdBy", "name")
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(records);
}
