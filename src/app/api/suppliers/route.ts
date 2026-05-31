import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Supplier } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(_req: NextRequest) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const suppliers = await Supplier.find().sort({ createdAt: -1 });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const supplier = await Supplier.create(body);
  await logActivity({
    action: "created",
    entity: "supplier",
    entityId: supplier._id.toString(),
    description: `Created supplier "${body.name}"`,
    userId: user.userId,
    metadata: { name: body.name },
  });
  return NextResponse.json(supplier, { status: 201 });
}
