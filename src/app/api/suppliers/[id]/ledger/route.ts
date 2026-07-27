import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { SupplierLedger, Supplier } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();

  const entries = await SupplierLedger.find({ supplierId: id })
    .populate("orderId", "orderNumber")
    .populate("batchId", "batchNumber")
    .sort({ date: -1 })
    .lean();

  return NextResponse.json(entries);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const supplier = await Supplier.findById(id);
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const amount = Number(body.amount) || 0;
  if (amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  let debit = 0;
  let credit = 0;

  switch (body.type) {
    case "order":
      credit = amount;
      break;
    case "payment-sent":
      debit = amount;
      break;
    case "payment-received":
      debit = amount;
      break;
    case "return":
      debit = amount;
      break;
    case "credit-note":
      debit = amount;
      break;
    case "adjustment":
      if (body.direction === "credit") credit = amount;
      else debit = amount;
      break;
    default:
      return NextResponse.json({ error: "Invalid ledger entry type" }, { status: 400 });
  }

  const lastEntry = await SupplierLedger.findOne({ supplierId: id }).sort({ date: -1 }).lean();
  const prevBalance = lastEntry?.runningBalance ?? 0;
  const runningBalance = prevBalance + credit - debit;

  const entry = await SupplierLedger.create({
    supplierId: id,
    date: body.date ? new Date(body.date) : new Date(),
    type: body.type,
    description: body.description || "",
    orderId: body.orderId || null,
    batchId: body.batchId || null,
    debit,
    credit,
    amount,
    paymentMethod: body.paymentMethod || null,
    reference: body.reference || "",
    runningBalance,
    notes: body.notes || "",
    createdBy: user.userId,
  });

  if (body.type === "order") {
    supplier.totalWeOwe += amount;
  } else if (["payment-sent", "return", "credit-note"].includes(body.type)) {
    supplier.totalWeOwe = Math.max(0, supplier.totalWeOwe - amount);
  } else if (body.type === "payment-received") {
    supplier.totalOwedToUs = Math.max(0, supplier.totalOwedToUs - amount);
  }
  supplier.netBalance = supplier.totalWeOwe - supplier.totalOwedToUs;
  await supplier.save();

  await logActivity({
    action: "created",
    entity: "supplier-ledger",
    entityId: entry._id.toString(),
    description: `${body.type} entry of ₦${amount.toLocaleString()} for ${supplier.name}`,
    userId: user.userId,
    metadata: { type: body.type, amount, runningBalance },
  });

  return NextResponse.json(entry, { status: 201 });
}
