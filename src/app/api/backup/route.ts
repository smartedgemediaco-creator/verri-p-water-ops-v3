import { NextRequest, NextResponse } from "next/server";
import { generateBackup } from "@/lib/backup";
import { sendEmail } from "@/lib/email";
import { getUserFromRequest, isAdmin } from "@/lib/auth";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { json, summary } = await generateBackup();
    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${summary.filename}"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { json, summary } = await generateBackup();
    const notifyEmail = process.env.BACKUP_NOTIFY_EMAIL;
    if (!notifyEmail) {
      return NextResponse.json({ success: true, summary, email: { success: false, error: "BACKUP_NOTIFY_EMAIL not set" } });
    }
    const email = await sendEmail({
      to: notifyEmail,
      subject: `Database Backup — ${summary.filename} (${summary.recordCount} records)`,
      html: `<p>A backup of the Verri P database was generated.</p>
<p><strong>File:</strong> ${summary.filename}</p>
<p><strong>Records:</strong> ${summary.recordCount.toLocaleString()}</p>
<p><strong>Size:</strong> ${(summary.sizeBytes / 1024).toFixed(1)} KB</p>
<p>The full JSON backup is attached.</p>`,
      attachments: [{ filename: summary.filename, content: json }],
    });
    return NextResponse.json({ success: true, summary, email });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
