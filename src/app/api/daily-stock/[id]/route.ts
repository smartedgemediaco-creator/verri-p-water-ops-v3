import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStock, DailyStockColumn } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

const BUILTIN_SALE_FIELDS = ["factorySale", "bigTruck", "smallTruck1", "smallTruck2", "depot", "tricycle"];
const BUILTIN_RETURN_FIELDS = ["returnedBigTruck", "returnedSmallTruck1", "returnedSmallTruck2"];

async function calcTotals(record: Record<string, unknown>) {
  const columns = await DailyStockColumn.find({}).lean();
  const saleKeys = columns.filter((c) => c.type === "sale").map((c) => c.key);
  const returnKeys = columns.filter((c) => c.type === "return").map((c) => c.key);

  const totalSold = [...BUILTIN_SALE_FIELDS, ...saleKeys].reduce((sum, k) => sum + (Number(record[k]) || 0), 0);
  const totalReturned = [...BUILTIN_RETURN_FIELDS, ...returnKeys].reduce((sum, k) => sum + (Number(record[k]) || 0), 0);
  const endStock = (Number(record.startStock) || 0) + (Number(record.bagsProduced) || 0) + totalReturned - totalSold - (Number(record.shortage) || 0) - (Number(record.wastage) || 0);
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

  // Also accept custom column values
  const customKeys = Object.keys(body).filter((k) => !editable.includes(k) && k !== "date");
  for (const key of customKeys) {
    (record as unknown as Record<string, number>)[key] = Number(body[key]) || 0;
  }

  const totals = await calcTotals(record.toObject());
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
