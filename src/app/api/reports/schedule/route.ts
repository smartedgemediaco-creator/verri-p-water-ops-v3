import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ScheduledReport } from "@/lib/models/ScheduledReport";
import { getUserFromRequest, isAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    const schedules = await ScheduledReport.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(schedules);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { email, frequency, dayOfWeek, dayOfMonth, month, scopeType, scopeId } = body;

    if (!email || !frequency) {
      return NextResponse.json({ error: "Email and frequency are required" }, { status: 400 });
    }

    await connectDB();

    const schedule = await ScheduledReport.create({
      email,
      frequency,
      dayOfWeek,
      dayOfMonth,
      month,
      scopeType,
      scopeId,
      isActive: true,
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { _id, isActive } = await req.json();
    await connectDB();
    await ScheduledReport.findByIdAndUpdate(_id, { isActive });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { _id } = await req.json();
    await connectDB();
    await ScheduledReport.findByIdAndDelete(_id);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
