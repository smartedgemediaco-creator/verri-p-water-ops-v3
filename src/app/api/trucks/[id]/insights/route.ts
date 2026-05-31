import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import {
  ServiceRecord,
  FuelLog,
  Trip,
  Cost,
  DriverAssignment,
  Staff,
} from "@/lib/models";
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

  const truckId = new mongoose.Types.ObjectId(id);

  const [
    serviceRecords,
    serviceAgg,
    fuelAgg,
    tripAgg,
    completedTripAgg,
    mileageAgg,
    costAgg,
    driver,
  ] = await Promise.all([
    ServiceRecord.find({ truckId }).sort({ date: -1 }).lean(),
    ServiceRecord.aggregate([
      { $match: { truckId } },
      { $group: { _id: null, totalCost: { $sum: "$cost" }, count: { $sum: 1 } } },
    ]),
    FuelLog.aggregate([
      { $match: { truckId } },
      { $group: { _id: null, totalCost: { $sum: "$cost" }, totalLiters: { $sum: "$liters" }, count: { $sum: 1 } } },
    ]),
    Trip.countDocuments({ truckId }),
    Trip.countDocuments({ truckId, status: "completed" }),
    Trip.aggregate([
      { $match: { truckId, endingMileage: { $ne: null }, startingMileage: { $ne: null } } },
      { $project: { distance: { $subtract: ["$endingMileage", "$startingMileage"] } } },
      { $group: { _id: null, total: { $sum: "$distance" } } },
    ]),
    Cost.aggregate([
      { $match: { locationType: "truck", locationId: truckId } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]),
    DriverAssignment.findOne({ truckId, isActive: true })
      .populate("staffId", "name phone")
      .lean(),
  ]);

  const lastService = serviceRecords.length > 0 ? serviceRecords[0] : null;

  const nextService = serviceRecords
    .filter((r) => r.nextServiceDate && new Date(r.nextServiceDate) > new Date())
    .sort(
      (a, b) =>
        new Date(a.nextServiceDate!).getTime() -
        new Date(b.nextServiceDate!).getTime()
    )[0] ?? null;

  const totalCostBreakdown = costAgg.map(
    (c: { _id: string; total: number }) => ({
      category: c._id,
      total: c.total,
    })
  );

  return NextResponse.json({
    serviceCount: serviceAgg[0]?.count ?? 0,
    totalServiceCost: serviceAgg[0]?.totalCost ?? 0,
    lastService: lastService
      ? {
          date: lastService.date,
          serviceType: lastService.serviceType,
          cost: lastService.cost,
          mileage: lastService.mileage,
          serviceCenter: lastService.serviceCenter,
        }
      : null,
    nextServiceDate: nextService?.nextServiceDate ?? null,
    totalFuelCost: fuelAgg[0]?.totalCost ?? 0,
    totalFuelLiters: fuelAgg[0]?.totalLiters ?? 0,
    fuelLogCount: fuelAgg[0]?.count ?? 0,
    tripCount: tripAgg,
    completedTrips: completedTripAgg,
    totalTripMileage: mileageAgg[0]?.total ?? 0,
    totalCosts: totalCostBreakdown.reduce((s, c) => s + c.total, 0),
    costBreakdown: totalCostBreakdown,
    driver: driver
      ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: (driver as any).staffId?.name ?? "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          phone: (driver as any).staffId?.phone ?? "",
          licenseNumber: driver.licenseNumber ?? "",
        }
      : null,
  });
}
