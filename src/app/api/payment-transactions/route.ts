import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PaymentTransaction, PosDevice } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const terminalSerial = url.searchParams.get("terminalSerial");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (terminalSerial) filter.terminalSerial = terminalSerial;
  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) (filter.transactionDate as Record<string, unknown>).$gte = new Date(startDate);
    if (endDate) (filter.transactionDate as Record<string, unknown>).$lte = new Date(endDate + "T23:59:59.999Z");
  }

  const [transactions, total] = await Promise.all([
    PaymentTransaction.find(filter)
      .populate("posDeviceId")
      .populate("saleId")
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentTransaction.countDocuments(filter),
  ]);

  return NextResponse.json({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();

  if (!body.terminalSerial || !body.amount) {
    return NextResponse.json({ error: "Terminal serial and amount are required" }, { status: 400 });
  }

  const posDevice = body.posDeviceId
    ? await PosDevice.findById(body.posDeviceId)
    : body.terminalSerial
      ? await PosDevice.findOne({ terminalSerial: body.terminalSerial, isActive: true })
      : null;

  const transactionRef = body.transactionRef || `manual-${Date.now()}`;

  const existing = await PaymentTransaction.findOne({ transactionRef });
  if (existing) {
    return NextResponse.json({ error: "Transaction reference already exists" }, { status: 409 });
  }

  const txn = await PaymentTransaction.create({
    posDeviceId: posDevice?._id,
    terminalSerial: body.terminalSerial,
    transactionRef,
    merchantReference: body.merchantReference,
    amount: Number(body.amount),
    paymentMethod: body.paymentMethod || "CARD_PURCHASE",
    responseCode: body.responseCode || "00",
    maskedPan: body.maskedPan,
    cardScheme: body.cardScheme,
    acquirer: body.acquirer || posDevice?.provider,
    transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
    status: body.saleId ? "matched" : "unmatched",
    saleId: body.saleId || undefined,
    rawPayload: body.rawPayload,
  });

  await logActivity({
    action: "created",
    entity: "payment-transaction",
    entityId: txn._id.toString(),
    description: `Manual POS transaction ₦${Number(body.amount).toLocaleString()} from ${body.terminalSerial}`,
    userId: user.userId,
    metadata: { terminalSerial: body.terminalSerial, amount: body.amount },
  });

  return NextResponse.json(txn, { status: 201 });
}
