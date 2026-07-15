import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStock } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

function calcTotals(day: Record<string, number>) {
  const totalSold = (day.factorySale ?? 0) + (day.bigTruck ?? 0) + (day.smallTruck1 ?? 0) + (day.smallTruck2 ?? 0) + (day.depot ?? 0) + (day.tricycle ?? 0);
  const totalReturned = (day.returnedBigTruck ?? 0) + (day.returnedSmallTruck1 ?? 0) + (day.returnedSmallTruck2 ?? 0);
  const endStock = (day.startStock ?? 0) + (day.bagsProduced ?? 0) + totalReturned - totalSold - (day.shortage ?? 0) - (day.wastage ?? 0);
  return { totalSold, totalReturned, endStock };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const record = await DailyStock.findById(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const editable = ["startStock", "bagsProduced", "factorySale", "bigTruck", "returnedBigTruck", "smallTruck1", "returnedSmallTruck1", "smallTruck2", "returnedSmallTruck2", "depot", "tricycle", "shortage", "wastage"];
  for (const key of editable) {
    if (body[key] != null) {
      (record as unknown as Record<string, number>)[key] = Number(body[key]) || 0;
    }
  }

  const totals = calcTotals(record.toObject());
  record.totalSold = totals.totalSold;
  record.totalReturned = totals.totalReturned;
  record.endStock = totals.endStock;

  await record.save();
  return NextResponse.json(record);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await connectDB();
  const record = await DailyStock.findByIdAndDelete(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "Deleted" });
}
