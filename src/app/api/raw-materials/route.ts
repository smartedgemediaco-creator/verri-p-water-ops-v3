import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(_req: NextRequest) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const materials = await RawMaterial.find().populate("supplierId", "name").sort({ name: 1 });
  return NextResponse.json(materials);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const material = await RawMaterial.create(body);
  await logActivity({
    action: "created",
    entity: "raw-material",
    entityId: material._id.toString(),
    description: `Created raw material "${body.name}"`,
    userId: user.userId,
    metadata: { name: body.name },
  });
  return NextResponse.json(material, { status: 201 });
}
