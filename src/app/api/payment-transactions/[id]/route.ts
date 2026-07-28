import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PaymentTransaction, Sale, Product } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const body = await _req.json();

  const txn = await PaymentTransaction.findById(id);
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (body.status) {
    txn.status = body.status;
  }
  if (body.saleId !== undefined) {
    txn.saleId = body.saleId || undefined;
    if (body.saleId) txn.status = "matched";
  }

  await txn.save();

  await logActivity({
    action: "updated",
    entity: "payment-transaction",
    entityId: id,
    description: `POS transaction ${txn.transactionRef.slice(-12)} status → ${txn.status}`,
    userId: user.userId,
  });

  return NextResponse.json(txn);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const body = await _req.json();

  const txn = await PaymentTransaction.findById(id);
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (txn.status === "matched" && txn.saleId) {
    return NextResponse.json({ error: "Transaction is already matched to a sale" }, { status: 400 });
  }

  if (!body.productId) {
    return NextResponse.json({ error: "Product is required" }, { status: 400 });
  }

  const product = await Product.findById(body.productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const quantity = Number(body.quantity) || 1;
  const unitPrice = Number(body.unitPrice) || txn.amount;

  const sale = await Sale.create({
    locationType: body.locationType || "depot",
    locationId: body.locationId,
    productId: product._id,
    quantity,
    unitPrice,
    totalAmount: txn.amount,
    customerName: body.customerName || "POS Transaction",
    date: txn.transactionDate,
    paymentMethod: "pos",
    posDeviceId: txn.posDeviceId,
    posTransactionRef: txn.transactionRef,
    posAutoCreated: false,
    isPaid: true,
    notes: `Converted from POS transaction ${txn.transactionRef.slice(-12)}`,
  });

  txn.saleId = sale._id;
  txn.status = "matched";
  await txn.save();

  await logActivity({
    action: "created",
    entity: "sale",
    entityId: sale._id.toString(),
    description: `Sale created from POS transaction ${txn.transactionRef.slice(-12)} — ₦${txn.amount.toLocaleString()}`,
    userId: user.userId,
    domainType: body.locationType,
    domainId: body.locationId,
    productId: product._id.toString(),
    metadata: { posTransactionRef: txn.transactionRef, amount: txn.amount },
  });

  return NextResponse.json({ sale, transaction: txn });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const txn = await PaymentTransaction.findByIdAndDelete(id);
  if (!txn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "deleted",
    entity: "payment-transaction",
    entityId: id,
    description: `Deleted POS transaction ${txn.transactionRef.slice(-12)} (₦${txn.amount.toLocaleString()})`,
    userId: user.userId,
  });

  return NextResponse.json({ message: "Deleted" });
}
