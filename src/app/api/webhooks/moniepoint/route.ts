import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PaymentTransaction, PosDevice, Sale, Product } from "@/lib/models";

const MONIEPOINT_WEBHOOK_SECRET = process.env.MONIEPOINT_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const signature = req.headers.get("moniepoint-signature") || req.headers.get("x-moniepoint-signature");

  if (MONIEPOINT_WEBHOOK_SECRET) {
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
  }

  await connectDB();
  const payload = await req.json();

  const txn = payload.transaction || payload;
  const responseCode = txn.responseCode || "00";
  const terminalSerial = txn.terminalSerial || txn.terminalId;
  const transactionRef = txn.transactionReference || txn.transactionRef || txn.stan || `mp-${Date.now()}`;
  const amount = txn.amount || 0;
  const transactionType = txn.transactionType || txn.paymentMethod || "UNKNOWN";
  const transactionDate = txn.transactionDate || txn.date || new Date().toISOString();

  const existing = await PaymentTransaction.findOne({ transactionRef });
  if (existing) {
    return NextResponse.json({ status: "duplicate" });
  }

  const posDevice = terminalSerial
    ? await PosDevice.findOne({ terminalSerial, isActive: true })
    : null;

  let saleId: string | undefined;
  let createdSale = false;

  if (posDevice) {
    const candidateSale = await Sale.findOne({
      paymentMethod: "pos",
      posDeviceId: posDevice._id,
      totalAmount: amount,
      date: {
        $gte: new Date(new Date(transactionDate).getTime() - 5 * 60 * 1000),
        $lte: new Date(new Date(transactionDate).getTime() + 5 * 60 * 1000),
      },
    }).sort({ date: -1 });

    if (candidateSale) {
      saleId = candidateSale._id.toString();
      await Sale.findByIdAndUpdate(candidateSale._id, {
        posTransactionRef: transactionRef,
      });
    } else {
      const product = await Product.findOne().sort({ createdAt: 1 }).lean();
      if (product) {
        const locType = posDevice.locationType;
        const locId = posDevice.locationId;
        const qty = 1;
        const unitPrice = amount;
        const sale = await Sale.create({
          locationType: locType,
          locationId: locId,
          productId: product._id,
          quantity: qty,
          unitPrice,
          totalAmount: amount,
          customerName: "POS Transaction",
          date: new Date(transactionDate),
          paymentMethod: "pos",
          posDeviceId: posDevice._id,
          posTransactionRef: transactionRef,
          posAutoCreated: true,
          isPaid: true,
          notes: `Auto-created from ${posDevice.provider} POS terminal ${posDevice.name}`,
        });
        saleId = sale._id.toString();
        createdSale = true;
      }
    }
  }

  const paymentMethod = transactionType === "CARD_PURCHASE"
    ? "CARD_PURCHASE"
    : transactionType === "POS_TRANSFER" || transactionType === "TRANSFER"
      ? "POS_TRANSFER"
      : "UNKNOWN";

  const matchStatus = saleId ? "matched" : "unmatched";

  const pt = await PaymentTransaction.create({
    posDeviceId: posDevice?._id,
    terminalSerial: terminalSerial || "unknown",
    transactionRef,
    merchantReference: txn.merchantReference,
    amount,
    paymentMethod,
    responseCode,
    maskedPan: txn.maskedPan,
    cardScheme: txn.cardScheme,
    acquirer: txn.acquirer,
    transactionDate: new Date(transactionDate),
    saleId: saleId || undefined,
    status: matchStatus,
    rawPayload: payload,
  });

  return NextResponse.json({
    status: "received",
    matched: matchStatus === "matched",
    saleCreated: createdSale,
    saleId,
    transactionId: pt._id,
  });
}
