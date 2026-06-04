import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { createInviteToken, getUserFromRequest, isAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/emailTemplates";
import { logActivity } from "@/lib/logActivity";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    await connectDB();
    const target = await User.findById(userId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.isActive) {
      return NextResponse.json({ error: "User is already active" }, { status: 400 });
    }

    const APP_URL = process.env.APP_URL || "https://verrip.com.ng";
    const token = createInviteToken(target._id.toString());
    const link = `${APP_URL}/set-password?token=${token}`;

    const emailResult = await sendEmail({
      to: target.email,
      subject: `You're Invited to Verri P Water`,
      html: inviteEmail({ name: target.name, link }),
    });

    await logActivity({
      userId: user.userId,
      action: "resend_invite",
      entity: "user",
      entityId: target._id.toString(),
      description: `Resent invite to ${target.email}`,
      metadata: { email: target.email, emailSent: emailResult.success },
    });

    return NextResponse.json({
      success: true,
      emailSent: emailResult.success,
      emailError: emailResult.success ? undefined : emailResult.error,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
