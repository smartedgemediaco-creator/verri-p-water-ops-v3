import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { verifyEmailToken, hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    const payload = verifyEmailToken(token);
    if (!payload || payload.type !== "invite") {
      return NextResponse.json({ error: "Invalid or expired invitation link" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashed = await hashPassword(password);
    user.password = hashed;
    user.isActive = true;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Welcome to Verri P Water Ops",
      html: welcomeEmail({ name: user.name ?? "there" }),
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
