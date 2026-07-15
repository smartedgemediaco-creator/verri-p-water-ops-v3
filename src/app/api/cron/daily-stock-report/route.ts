import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { DailyStock, DailyStockColumn } from "@/lib/models";
import { sendEmail } from "@/lib/email";
import { dailyStockRecordedEmail } from "@/lib/emailTemplates";

const BUILTIN_SALE = ["factorySale", "bigTruck", "smallTruck1", "smallTruck2", "depot", "tricycle"];
const BUILTIN_RETURN = ["returnedBigTruck", "returnedSmallTruck1", "returnedSmallTruck2"];

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Get today's date in WAT (UTC+1)
  const now = new Date();
  const watOffset = 1 * 60 * 60 * 1000;
  const watDate = new Date(now.getTime() + watOffset);
  const todayStr = watDate.toISOString().slice(0, 10);

  // Find today's record
  const record = await DailyStock.findOne({ date: todayStr }).lean();
  if (!record) {
    return NextResponse.json({ message: `No stock record found for ${todayStr}`, skipped: true });
  }

  // Get custom column labels
  const columns = await DailyStockColumn.find({}).lean();
  const customColumns = columns.map((c) => ({ key: c.key, label: c.label }));

  // Calculate totals dynamically
  const saleKeys = [...BUILTIN_SALE, ...columns.filter((c) => c.type === "sale").map((c) => c.key)];
  const returnKeys = [...BUILTIN_RETURN, ...columns.filter((c) => c.type === "return").map((c) => c.key)];
  const totalSold = saleKeys.reduce((sum, k) => sum + (Number(record[k]) || 0), 0);
  const totalReturned = returnKeys.reduce((sum, k) => sum + (Number(record[k]) || 0), 0);

  const data = { ...record, totalSold, totalReturned };

  // Send email
  const notifyEmail = process.env.DAILY_STOCK_NOTIFY_EMAIL;
  if (!notifyEmail) {
    return NextResponse.json({ message: "DAILY_STOCK_NOTIFY_EMAIL not set", skipped: true });
  }

  const result = await sendEmail({
    to: notifyEmail,
    subject: `Daily Stock Report — ${todayStr}`,
    html: dailyStockRecordedEmail({ recordedBy: "System (midnight report)", date: todayStr, data, customColumns }),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ sent: true, date: todayStr });
}
