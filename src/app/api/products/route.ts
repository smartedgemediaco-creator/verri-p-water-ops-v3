import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const products = await Product.find({}).sort({ createdAt: -1 });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  if (!body.unitPrice && !body.chilledPrice) {
    return NextResponse.json({ error: "At least one price (Ordinary or Cold) is required" }, { status: 400 });
  }
  if (body.chilledPrice !== undefined && body.chilledPrice !== null && body.chilledPrice !== "") {
    body.chilledPrice = Number(body.chilledPrice);
  } else {
    body.chilledPrice = null;
  }
  const product = await Product.create(body);

  await logActivity({
    action: "created",
    entity: "product",
    entityId: product._id.toString(),
    description: `Created product "${body.name}" (${body.category})`,
    userId: user.userId,
    productId: product._id.toString(),
    metadata: { name: body.name, category: body.category, unit: body.unit },
  });

  return NextResponse.json(product, { status: 201 });
}
