import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await connectDB();
  const { name, email, password, role } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashed = await hashPassword(password);
  const user = await User.create({ name, email, password: hashed, role });

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  const res = NextResponse.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token }, { status: 201 });
  res.cookies.set("token", token, { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });

  return res;
}
