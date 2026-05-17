import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET() {
  await connectDB();
  const products = await Product.find({}).sort({ createdAt: -1 });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  await connectDB();
  const body = await req.json();
  const product = await Product.create(body);

  await logActivity({
    action: "created",
    entity: "product",
    entityId: product._id.toString(),
    description: `Created product "${body.name}" (${body.category})`,
    userId: user?.userId,
    productId: product._id.toString(),
    metadata: { name: body.name, category: body.category, unit: body.unit },
  });

  return NextResponse.json(product, { status: 201 });
}
