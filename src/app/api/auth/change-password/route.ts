import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { getUserFromRequest, hashPassword, comparePassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  await connectDB();

  const dbUser = await User.findById(user.userId);
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await comparePassword(currentPassword, dbUser.password);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });

  dbUser.password = await hashPassword(newPassword);
  await dbUser.save();

  return NextResponse.json({ message: "Password changed successfully" });
}
