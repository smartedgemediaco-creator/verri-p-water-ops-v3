import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Supplier } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const supplier = await Supplier.findById(id)
    .select("name totalOwedToUs totalWeOwe netBalance")
    .lean();

  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    supplierId: supplier._id,
    name: supplier.name,
    totalOwedToUs: supplier.totalOwedToUs ?? 0,
    totalWeOwe: supplier.totalWeOwe ?? 0,
    netBalance: supplier.netBalance ?? 0,
  });
}
