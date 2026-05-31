import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ScheduledReport } from "@/lib/models/ScheduledReport";
import { sendPeriodicReport } from "@/lib/reports";

const CRON_KEY = process.env.CRON_SECRET || "";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const today = now.getDay();
  const dayOfMonth = now.getDate();
  const month = now.getMonth() + 1;

  const schedules = await ScheduledReport.find({ isActive: true, nextScheduledAt: { $lte: now } }).lean();

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const s of schedules) {
    try {
      const isDue =
        (s.frequency === "weekly" && s.dayOfWeek === today) ||
        (s.frequency === "monthly" && s.dayOfMonth === dayOfMonth) ||
        (s.frequency === "yearly" && s.dayOfMonth === dayOfMonth && s.month === month);

      if (!isDue) continue;

      const endDate = now;
      let startDate: Date;
      let period: string;

      if (s.frequency === "weekly") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        period = "Weekly";
      } else if (s.frequency === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        period = "Monthly";
      } else {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        period = "Yearly";
      }

      await sendPeriodicReport(s.email, {
        startDate,
        endDate,
        scopeType: s.scopeType ?? undefined,
        scopeId: s.scopeId ?? undefined,
      }, period);

      const nextDate = new Date(now);
      if (s.frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
      else if (s.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else nextDate.setFullYear(nextDate.getFullYear() + 1);

      await ScheduledReport.findByIdAndUpdate(s._id, {
        lastSentAt: now,
        nextScheduledAt: nextDate,
      });

      results.push({ id: s._id.toString(), success: true });
    } catch (e: unknown) {
      results.push({ id: s._id.toString(), success: false, error: e instanceof Error ? e.message : "Unknown" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
