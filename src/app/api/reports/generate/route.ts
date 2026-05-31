import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { sendPeriodicReport } from "@/lib/reports";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { email, startDate, endDate, period, scopeType, scopeId } = await req.json();

    if (!email || !startDate || !endDate || !period) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const data = await sendPeriodicReport(email, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      scopeType,
      scopeId,
    }, period);

    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
