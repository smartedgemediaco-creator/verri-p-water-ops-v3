import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CommissionedStaffRecord, CommissionedStaff, Customer } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const paymentType = body.type as "cash" | "transfer";
  const amount = Number(body.amount) || 0;
  if (!paymentType || !["cash", "transfer"].includes(paymentType)) {
    return NextResponse.json({ error: "Payment type must be 'cash' or 'transfer'" }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  const record = await CommissionedStaffRecord.findById(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payment = {
    type: paymentType,
    amount,
    senderName: body.senderName || "",
    addAsCustomer: body.addAsCustomer === true,
    date: body.date ? new Date(body.date) : new Date(),
    notes: body.notes || "",
  };

  record.payments.push(payment as never);
  record.totalPaid = record.payments.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
  record.totalOwed = record.expectedAmount - record.totalPaid;
  await record.save();

  if (payment.addAsCustomer && payment.senderName) {
    const existingCustomer = await Customer.findOne({ name: payment.senderName }).lean();
    if (!existingCustomer) {
      const customer = await Customer.create({
        name: payment.senderName,
        phone: "",
        email: "",
        address: "",
        businessName: "",
        customerType: "regular",
        creditLimit: 0,
        outstandingBalance: 0,
        isActive: true,
        notes: `Auto-created from commissioned staff payment`,
      });
      await logActivity({
        action: "created",
        entity: "customer",
        entityId: customer._id.toString(),
        description: `Auto-created customer "${payment.senderName}" from commissioned staff payment`,
        userId: user.userId,
      });
    }
  }

  const staff = await CommissionedStaff.findById(record.staffId).lean();
  await logActivity({
    action: "updated",
    entity: "commissioned-staff-record",
    entityId: id,
    description: `Recorded ${paymentType} payment of ₦${amount.toLocaleString()} for "${staff?.name ?? "Unknown"}"`,
    userId: user.userId,
    metadata: { type: paymentType, amount, senderName: payment.senderName },
  });

  return NextResponse.json(record);
}
