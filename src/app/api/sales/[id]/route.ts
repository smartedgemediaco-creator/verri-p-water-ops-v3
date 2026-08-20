import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, Stock } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const sale = await Sale.findById(id);
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCreditSettlement =
    body.isPaid === true && !body.totalAmount && !body.quantity && !body.productId && !body.date && !body.customerName;

  if (isCreditSettlement) {
    if (!isAdmin(user) && user.role !== "depot-manager" && user.role !== "factory-manager" && user.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role === "depot-manager" && sale.locationType !== "depot") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role === "factory-manager" && sale.locationType !== "factory") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role === "driver" && sale.locationType !== "truck") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    sale.isPaid = true;
    sale.paidAt = new Date();
    sale.paidAmount = sale.totalAmount;
    await sale.save();

    await logActivity({
      action: "updated",
      entity: "sale",
      entityId: id,
      description: `Settled credit sale for ${sale.customerName || "customer"} — ₦${sale.totalAmount?.toLocaleString()}`,
      userId: user.userId,
      domainType: sale.locationType,
      domainId: sale.locationId.toString(),
      productId: sale.productId?.toString(),
      metadata: { paymentMethod: "credit", isPaid: true, paidAmount: sale.totalAmount },
    });

    return NextResponse.json(sale);
  }

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Only admins can edit sale records" }, { status: 403 });
  }

  const oldAmount = sale.totalAmount;
  const oldQty = sale.quantity;
  const oldProduct = sale.productId?.toString();
  const isFactorySale = sale.locationType === "factory";

  if (body.productId) sale.productId = body.productId;
  if (body.quantity != null) sale.quantity = body.quantity;
  if (body.totalAmount != null) sale.totalAmount = body.totalAmount;
  if (body.unitPrice != null) sale.unitPrice = body.unitPrice;
  if (body.customerName != null) sale.customerName = body.customerName;
  if (body.date) sale.date = body.date;
  if (body.paymentMethod) sale.paymentMethod = body.paymentMethod;
  if (body.notes != null) sale.notes = body.notes;

  await sale.save();

  // Adjust stock for non-factory sales when quantity or product changed
  if (!isFactorySale && (oldQty !== sale.quantity || oldProduct !== sale.productId?.toString())) {
    // Restore old stock
    await Stock.findOneAndUpdate(
      { locationType: sale.locationType, locationId: sale.locationId, productId: oldProduct },
      { $inc: { quantity: oldQty } }
    );
    // Deduct new stock
    await Stock.findOneAndUpdate(
      { locationType: sale.locationType, locationId: sale.locationId, productId: sale.productId },
      { $inc: { quantity: -sale.quantity } },
      { upsert: true }
    );
  }

  const changes: string[] = [];
  if (oldAmount !== sale.totalAmount) changes.push(`amount ₦${oldAmount?.toLocaleString()}→₦${sale.totalAmount?.toLocaleString()}`);
  if (oldQty !== sale.quantity) changes.push(`qty ${oldQty}→${sale.quantity}`);
  if (oldProduct !== sale.productId?.toString()) changes.push("product changed");

  await logActivity({
    action: "updated",
    entity: "sale",
    entityId: id,
    description: `Admin edited sale: ${changes.join(", ") || "fields updated"}`,
    userId: user.userId,
    domainType: sale.locationType,
    domainId: sale.locationId.toString(),
    productId: sale.productId?.toString(),
    metadata: { changes: body, oldAmount, oldQty },
  });

  return NextResponse.json(sale);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Only admins can cancel sales" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const sale = await Sale.findById(id);
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sale.status === "cancelled") return NextResponse.json({ error: "Sale already cancelled" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const cancelReason = body?.reason || "";

  sale.status = "cancelled";
  sale.cancelledAt = new Date();
  sale.cancelledBy = user.userId;
  sale.cancelReason = cancelReason;
  await sale.save();

  // Only restore stock for non-factory sales
  if (sale.locationType !== "factory") {
    await Stock.findOneAndUpdate(
      { locationType: sale.locationType, locationId: sale.locationId, productId: sale.productId },
      { $inc: { quantity: sale.quantity } },
      { upsert: true }
    );
  }

  await logActivity({
    action: "deleted",
    entity: "sale",
    entityId: id,
    description: `Cancelled sale of ${sale.quantity} units from ${sale.locationType} — ₦${sale.totalAmount?.toLocaleString()}${cancelReason ? ` (${cancelReason})` : ""}`,
    userId: user.userId,
    domainType: sale.locationType,
    domainId: sale.locationId.toString(),
    productId: sale.productId?.toString(),
    metadata: { quantity: sale.quantity, totalAmount: sale.totalAmount, cancelReason },
  });

  return NextResponse.json({ success: true });
}
