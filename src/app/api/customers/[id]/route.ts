import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Customer } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const customer = await Customer.findById(id);
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const customer = await Customer.findByIdAndUpdate(id, body, { new: true });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await logActivity({
    action: "updated",
    entity: "customer",
    entityId: id,
    description: `Updated customer "${customer.name}"`,
    userId: user.userId,
    metadata: body,
  });
  return NextResponse.json(customer);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await connectDB();
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await logActivity({
    action: "deleted",
    entity: "customer",
    entityId: id,
    description: `Deleted customer "${customer.name}"`,
    userId: user.userId,
  });
  return NextResponse.json({ message: "Deleted" });
}
