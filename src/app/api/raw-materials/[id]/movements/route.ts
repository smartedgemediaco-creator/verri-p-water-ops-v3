import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterialStockMovement } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  const filter: Record<string, unknown> = { rawMaterialId: id };
  if (type) filter.type = type;

  const movements = await RawMaterialStockMovement.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(movements);
}
