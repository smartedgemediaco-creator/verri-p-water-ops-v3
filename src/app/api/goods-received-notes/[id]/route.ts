import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { GoodsReceivedNote } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const note = await GoodsReceivedNote.findById(id).populate({
    path: "purchaseOrderId",
    populate: { path: "supplierId", select: "name" },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}
