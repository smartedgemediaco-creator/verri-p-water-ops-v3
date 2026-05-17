import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  const product = await Product.findById(id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const product = await Product.findByIdAndUpdate(id, body, { new: true });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "product",
    entityId: id,
    description: `Updated product "${product.name}"`,
    userId: user?.userId,
    productId: id,
    metadata: { changes: body },
  });

  return NextResponse.json(product);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  const { id } = await params;
  await connectDB();
  const product = await Product.findByIdAndDelete(id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "product",
    entityId: id,
    description: `Deleted product "${product.name}"`,
    userId: user?.userId,
    productId: id,
  });

  return NextResponse.json({ message: "Deleted" });
}
