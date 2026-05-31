import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { createResetToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { resetPasswordEmail } from "@/lib/emailTemplates";

const cooldowns = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const now = Date.now();
    const last = cooldowns.get(email);
    if (last && now - last < 60000) {
      return NextResponse.json({ error: "Please wait before requesting another reset" }, { status: 429 });
    }
    cooldowns.set(email, now);

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const APP_URL = process.env.APP_URL || "https://app.verripwater.com";
    const token = createResetToken(user._id.toString());
    const link = `${APP_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Reset Your Verri P Water Password",
      html: resetPasswordEmail({ name: user.name ?? "there", link }),
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
