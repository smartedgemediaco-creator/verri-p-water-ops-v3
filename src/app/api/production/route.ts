import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Inventory, Production, Product } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "factory-manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();
  const factoryId = user.role === "factory-manager" ? user.factoryId : body.factoryId;

  if (!factoryId) {
    return NextResponse.json({ error: "No factory assigned" }, { status: 400 });
  }

  let prodDate = body.date;
  if (prodDate && typeof prodDate === "string") {
    const parts = prodDate.split("/");
    if (parts.length === 3) prodDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  const production = await Production.create({
    factoryId,
    productId: body.productId,
    quantity: body.quantity,
    date: prodDate || new Date(),
  });

  await Inventory.findOneAndUpdate(
    { locationType: "factory", locationId: factoryId, productId: body.productId },
    { $inc: { quantity: body.quantity } },
    { upsert: true }
  );

  const prod = await Product.findById(body.productId).select("name").lean();

  await logActivity({
    action: "created",
    entity: "production",
    entityId: production._id.toString(),
    description: `Produced ${body.quantity} units of ${(prod as { name?: string } | null)?.name ?? body.productId}`,
    userId: user.userId,
    domainType: "factory",
    domainId: factoryId,
    productId: body.productId,
    metadata: { quantity: body.quantity, date: body.date },
  });

  return NextResponse.json(production, { status: 201 });
}
