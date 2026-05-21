import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PaymentTransaction, PosDevice, Sale, Product } from "@/lib/models";

function parseMoniepoint(payload: Record<string, unknown>) {
  const t = (payload.transaction as Record<string, unknown>) || payload;
  return {
    terminalSerial: (t.terminalSerial || t.terminalId || "") as string,
    transactionRef: (t.transactionReference || t.transactionRef || t.stan || `mp-${Date.now()}`) as string,
    amount: Number(t.amount || 0),
    transactionType: (t.transactionType || t.paymentMethod || "UNKNOWN") as string,
    transactionDate: (t.transactionDate || t.date || new Date().toISOString()) as string,
    responseCode: (t.responseCode || "00") as string,
    merchantReference: (t.merchantReference || "") as string,
    maskedPan: (t.maskedPan || "") as string,
    cardScheme: (t.cardScheme || "") as string,
    acquirer: (t.acquirer || "") as string,
  };
}

function parseOpay(payload: Record<string, unknown>) {
  return {
    terminalSerial: (payload.terminalId || payload.terminalSerial || "") as string,
    transactionRef: (payload.reference || payload.transactionRef || `op-${Date.now()}`) as string,
    amount: Number(payload.amount || 0),
    transactionType: "CARD_PURCHASE",
    transactionDate: (payload.transactionDate || payload.date || new Date().toISOString()) as string,
    responseCode: (payload.status === "success" ? "00" : payload.responseCode || "99") as string,
    merchantReference: (payload.merchantReference || "") as string,
    maskedPan: (payload.pan || payload.maskedPan || "") as string,
    cardScheme: (payload.cardType || payload.cardScheme || "") as string,
    acquirer: "Opay",
  };
}

function parsePalmpay(payload: Record<string, unknown>) {
  return {
    terminalSerial: (payload.terminalId || payload.terminalSerial || "") as string,
    transactionRef: (payload.orderNo || payload.transactionRef || `pp-${Date.now()}`) as string,
    amount: Number(payload.amount || payload.totalAmount || 0),
    transactionType: "CARD_PURCHASE",
    transactionDate: (payload.transactionTime || payload.transactionDate || payload.date || new Date().toISOString()) as string,
    responseCode: (payload.code === "0" || payload.status === "SUCCESS" ? "00" : payload.responseCode || "99") as string,
    merchantReference: (payload.merchantOrderNo || "") as string,
    maskedPan: (payload.pan || payload.maskedPan || "") as string,
    cardScheme: (payload.cardType || "") as string,
    acquirer: "Palmpay",
  };
}

const PARSERS: Record<string, (p: Record<string, unknown>) => ReturnType<typeof parseMoniepoint>> = {
  moniepoint: parseMoniepoint,
  opay: parseOpay,
  palmpay: parsePalmpay,
};

export async function POST(req: NextRequest) {
  await connectDB();
  const payload = await req.json();

  const provider = (payload.provider || req.headers.get("x-pos-provider") || "moniepoint").toLowerCase();
  const parser = PARSERS[provider];
  if (!parser) {
    return NextResponse.json({ error: `Unsupported provider: ${provider}. Supported: ${Object.keys(PARSERS).join(", ")}` }, { status: 400 });
  }

  const parsed = parser(payload);

  const existing = await PaymentTransaction.findOne({ transactionRef: parsed.transactionRef });
  if (existing) {
    return NextResponse.json({ status: "duplicate" });
  }

  const posDevice = parsed.terminalSerial
    ? await PosDevice.findOne({ terminalSerial: parsed.terminalSerial, isActive: true })
    : null;

  let saleId: string | undefined;
  let createdSale = false;

  if (posDevice) {
    const candidateSale = await Sale.findOne({
      paymentMethod: "pos",
      posDeviceId: posDevice._id,
      totalAmount: parsed.amount,
      date: {
        $gte: new Date(new Date(parsed.transactionDate).getTime() - 5 * 60 * 1000),
        $lte: new Date(new Date(parsed.transactionDate).getTime() + 5 * 60 * 1000),
      },
    }).sort({ date: -1 });

    if (candidateSale) {
      saleId = candidateSale._id.toString();
      await Sale.findByIdAndUpdate(candidateSale._id, { posTransactionRef: parsed.transactionRef });
    } else {
      const product = await Product.findOne().sort({ createdAt: 1 }).lean();
      if (product) {
        const sale = await Sale.create({
          locationType: posDevice.locationType,
          locationId: posDevice.locationId,
          productId: product._id,
          quantity: 1,
          unitPrice: parsed.amount,
          totalAmount: parsed.amount,
          customerName: "POS Transaction",
          date: new Date(parsed.transactionDate),
          paymentMethod: "pos",
          posDeviceId: posDevice._id,
          posTransactionRef: parsed.transactionRef,
          posAutoCreated: true,
          isPaid: true,
          notes: `Auto-created from ${posDevice.provider} POS terminal ${posDevice.name}`,
        });
        saleId = sale._id.toString();
        createdSale = true;
      }
    }
  }

  const pm = parsed.transactionType === "CARD_PURCHASE" ? "CARD_PURCHASE" : "UNKNOWN";

  const pt = await PaymentTransaction.create({
    posDeviceId: posDevice?._id,
    terminalSerial: parsed.terminalSerial || "unknown",
    transactionRef: parsed.transactionRef,
    merchantReference: parsed.merchantReference,
    amount: parsed.amount,
    paymentMethod: pm,
    responseCode: parsed.responseCode,
    maskedPan: parsed.maskedPan,
    cardScheme: parsed.cardScheme,
    acquirer: parsed.acquirer,
    transactionDate: new Date(parsed.transactionDate),
    saleId: saleId || undefined,
    status: saleId ? "matched" : "unmatched",
    rawPayload: payload,
  });

  return NextResponse.json({
    status: "received",
    provider,
    matched: !!saleId,
    saleCreated: createdSale,
    saleId,
    transactionId: pt._id,
  });
}
