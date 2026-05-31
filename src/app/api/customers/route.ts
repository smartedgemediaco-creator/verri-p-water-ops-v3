import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Customer } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const filter: Record<string, unknown> = {};
  if (search) filter.name = { $regex: search, $options: "i" };
  const customers = await Customer.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const customer = await Customer.create(body);
  await logActivity({
    action: "created",
    entity: "customer",
    entityId: customer._id.toString(),
    description: `Created customer "${body.name}"`,
    userId: user.userId,
    metadata: { name: body.name },
  });
  return NextResponse.json(customer, { status: 201 });
}
