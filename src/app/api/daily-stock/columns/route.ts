import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStockColumn } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const columns = await DailyStockColumn.find({}).sort({ order: 1 }).lean();
  return NextResponse.json(columns);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await connectDB();
  const body = await req.json();

  if (!body.label || !body.type) {
    return NextResponse.json({ error: "Label and type are required" }, { status: 400 });
  }

  const key = body.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const existing = await DailyStockColumn.findOne({ key });
  if (existing) return NextResponse.json({ error: "A column with this name already exists" }, { status: 409 });

  const maxOrder = await DailyStockColumn.findOne({}).sort({ order: -1 }).lean();
  const column = await DailyStockColumn.create({
    key,
    label: body.label,
    type: body.type,
    order: (maxOrder?.order ?? 0) + 1,
  });

  return NextResponse.json(column, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await connectDB();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Column id is required" }, { status: 400 });

  const column = await DailyStockColumn.findByIdAndUpdate(id, updates, { new: true });
  if (!column) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(column);
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Column id is required" }, { status: 400 });

  const column = await DailyStockColumn.findByIdAndDelete(id);
  if (!column) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "Deleted" });
}
