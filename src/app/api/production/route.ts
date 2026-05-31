import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Stock, Production, Product } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyProductionBatch } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "factory-manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    if (!body.productId || !body.quantity || Number(body.quantity) <= 0) {
      return NextResponse.json({ error: "Product and valid quantity are required" }, { status: 400 });
    }

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
      quantity: Number(body.quantity),
      date: prodDate || new Date(),
    });

    await Stock.findOneAndUpdate(
      { locationType: "factory", locationId: factoryId, productId: body.productId },
      { $inc: { quantity: Number(body.quantity) } },
      { upsert: true }
    );

    const prod = await Product.findById(body.productId).select("name").lean();

    const prodName = (prod as { name?: string } | null)?.name ?? body.productId;

    await logActivity({
      action: "created",
      entity: "production",
      entityId: production._id.toString(),
      description: `Produced ${body.quantity} units of ${prodName}`,
      userId: user.userId,
      domainType: "factory",
      domainId: factoryId,
      productId: body.productId,
      metadata: { quantity: body.quantity, date: body.date },
    });

    const factory = await (await import("@/lib/models")).Factory.findById(factoryId).select("name").lean();
    notifyProductionBatch(
      prodName,
      Number(body.quantity),
      (factory as { name?: string } | null)?.name ?? "Factory"
    ).catch(() => {});

    return NextResponse.json(production, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
