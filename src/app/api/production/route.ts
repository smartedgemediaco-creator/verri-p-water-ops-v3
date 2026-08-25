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

    // Production can happen at the factory or a depot, defaulting to factory.
    let locationType: "factory" | "depot" = body.locationType === "depot" ? "depot" : "factory";
    let locationId: string | undefined = body.locationId;

    if (user.role === "factory-manager") {
      locationType = "factory";
      const fid = user.factoryId as unknown as string | { _id?: unknown } | undefined;
      locationId = fid
        ? typeof fid === "string"
          ? fid
          : fid._id
          ? String(fid._id)
          : body.factoryId
        : body.factoryId;
    }

    if (!locationId) {
      return NextResponse.json({ error: "A production location is required" }, { status: 400 });
    }

    let prodDate = body.date;
    if (prodDate && typeof prodDate === "string") {
      const parts = prodDate.split("/");
      if (parts.length === 3) prodDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const production = await Production.create({
      factoryId: locationType === "factory" ? locationId : undefined,
      locationType,
      locationId,
      productId: body.productId,
      quantity: Number(body.quantity),
      date: prodDate || new Date(),
    });

    await Stock.findOneAndUpdate(
      { locationType, locationId, productId: body.productId },
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
      domainType: locationType,
      domainId: locationId,
      productId: body.productId,
      metadata: { quantity: body.quantity, date: body.date, locationType, locationId },
    });

    const locName = locationType === "factory"
      ? ((await (await import("@/lib/models")).Factory.findById(locationId).select("name").lean()) as { name?: string } | null)?.name
      : locationType === "depot"
      ? ((await (await import("@/lib/models")).Depot.findById(locationId).select("name").lean()) as { name?: string } | null)?.name
      : "Location";
    notifyProductionBatch(
      prodName,
      Number(body.quantity),
      locName ?? "Location"
    ).catch(() => {});

    return NextResponse.json(production, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
