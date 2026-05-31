import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { verifyEmailToken, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    const payload = verifyEmailToken(token);
    if (!payload || payload.type !== "reset") {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    await connectDB();
    const target = await User.findById(payload.userId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const hashed = await hashPassword(password);
    target.password = hashed;
    await target.save();

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
