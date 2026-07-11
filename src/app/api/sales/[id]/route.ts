import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale } from "@/lib/models";
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

  if (body.productId) sale.productId = body.productId;
  if (body.quantity != null) sale.quantity = body.quantity;
  if (body.totalAmount != null) sale.totalAmount = body.totalAmount;
  if (body.unitPrice != null) sale.unitPrice = body.unitPrice;
  if (body.customerName != null) sale.customerName = body.customerName;
  if (body.date) sale.date = body.date;
  if (body.paymentMethod) sale.paymentMethod = body.paymentMethod;
  if (body.notes != null) sale.notes = body.notes;

  await sale.save();

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
