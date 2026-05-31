import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Sale, Invoice, PaymentReceipt, Customer } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const customerId = new mongoose.Types.ObjectId(id);
  const customer = await Customer.findById(customerId).lean();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const customerName = customer.name;

  const [saleAgg, invoiceAgg, paymentAgg, recentSales] = await Promise.all([
    Sale.aggregate([
      { $match: { customerName } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { customerId } },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$amountPaid" },
          count: { $sum: 1 },
          overdueCount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
        },
      },
    ]),
    PaymentReceipt.aggregate([
      { $match: { customerId } },
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Sale.find({ customerName })
      .sort({ date: -1 })
      .limit(5)
      .populate("productId", "name")
      .lean(),
  ]);

  const paymentMethodBreakdown = paymentAgg.map(
    (p: { _id: string; total: number; count: number }) => ({
      method: p._id,
      total: p.total,
      count: p.count,
    })
  );

  return NextResponse.json({
    totalSpent: saleAgg[0]?.totalSpent ?? 0,
    purchaseCount: saleAgg[0]?.count ?? 0,
    totalQuantity: saleAgg[0]?.totalQuantity ?? 0,
    totalInvoiced: invoiceAgg[0]?.totalInvoiced ?? 0,
    totalPaid: invoiceAgg[0]?.totalPaid ?? 0,
    invoiceCount: invoiceAgg[0]?.count ?? 0,
    overdueInvoices: invoiceAgg[0]?.overdueCount ?? 0,
    averagePurchaseValue: saleAgg[0]?.count > 0
      ? ((saleAgg[0]?.totalSpent ?? 0) / (saleAgg[0]?.count ?? 1))
      : 0,
    paymentMethodBreakdown,
    outstandingBalance: customer.outstandingBalance ?? 0,
    creditLimit: customer.creditLimit ?? 0,
    recentSales: recentSales.map((s) => ({
      _id: s._id,
      productName: (s.productId as { name?: string } | null)?.name ?? "N/A",
      quantity: s.quantity,
      totalAmount: s.totalAmount,
      date: s.date,
      paymentMethod: s.paymentMethod,
    })),
  });
}
