import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterialBatch, RawMaterial } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const locationType = searchParams.get("locationType");
  const locationId = searchParams.get("locationId");
  const rawMaterialId = searchParams.get("rawMaterialId");

  const matchStage: Record<string, unknown> = { status: { $in: ["received", "partially-received"] }, availableQuantity: { $gt: 0 } };
  if (locationType) matchStage.locationType = locationType;
  if (locationId) matchStage.locationId = new mongoose.Types.ObjectId(locationId);
  if (rawMaterialId) matchStage.rawMaterialId = new mongoose.Types.ObjectId(rawMaterialId);

  const result = await RawMaterialBatch.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          rawMaterialId: "$rawMaterialId",
          locationType: "$locationType",
          locationId: "$locationId",
        },
        totalAvailable: { $sum: "$availableQuantity" },
        totalValue: { $sum: { $multiply: ["$availableQuantity", "$unitPrice"] } },
        batchCount: { $sum: 1 },
        avgUnitCost: { $avg: "$unitPrice" },
      },
    },
    { $lookup: { from: "rawmaterials", localField: "_id.rawMaterialId", foreignField: "_id", as: "material" } },
    { $unwind: { path: "$material", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "factories",
        let: { locId: "$_id.locationId", locType: "$_id.locationType" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$locId"] } } },
        ],
        as: "location",
      },
    },
    { $unwind: { path: "$location", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        rawMaterialId: "$_id.rawMaterialId",
        materialName: "$material.name",
        materialUnit: "$material.unit",
        locationType: "$_id.locationType",
        locationId: "$_id.locationId",
        locationName: "$location.name",
        totalAvailable: 1,
        totalValue: 1,
        batchCount: 1,
        avgUnitCost: 1,
      },
    },
    { $sort: { materialName: 1 } },
  ]);

  const allMaterials = await RawMaterial.find().select("name unit currentStock minimumStock").lean();

  return NextResponse.json({ stockByLocation: result, allMaterials });
}
