import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ScheduledOperation } from "@/lib/models";
import { notifyDesignees } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const { searchParams } = new URL(req.url);
  const secretParam = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const active = await ScheduledOperation.find({
    isActive: true,
    completedAt: null,
  }).lean();

  const entityTypeLabel: Record<string, string> = {
    truck: "Truck", factory: "Factory", depot: "Depot",
    staff: "Staff", customer: "Customer", product: "Product",
    "raw-material": "Raw Material", general: "General",
  };

  const results: { title: string; type: string; notified: { emailResults: boolean[]; whatsappResults: boolean[] } }[] = [];

  for (const item of active) {
    const dueDate = new Date(item.dueDate);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let notifyType: "upcoming" | "overdue" | null = null;

    if (diffDays < 0) {
      notifyType = "overdue";
    } else if (diffDays <= (item.leadDays || 3)) {
      notifyType = "upcoming";
    }

    if (!notifyType) continue;

    const dueDateStr = dueDate.toLocaleDateString("en-NG", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const notified = await notifyDesignees({
      title: item.title,
      type: notifyType,
      dueDate: dueDateStr,
      priority: item.priority,
      entity: entityTypeLabel[item.entityType] || item.entityType,
      description: item.description || "",
    });

    results.push({
      title: item.title,
      type: notifyType,
      notified,
    });
  }

  return NextResponse.json({
    checked: true,
    timestamp: now.toISOString(),
    activeCount: active.length,
    notifiedCount: results.length,
    results,
  });
}
