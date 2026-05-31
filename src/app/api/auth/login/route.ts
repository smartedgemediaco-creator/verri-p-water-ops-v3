import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { StaffUserLink } from "@/lib/models/StaffUserLink";
import { UserRole } from "@/lib/models/UserRole";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const staffLink = await StaffUserLink.findOne({ userId: user._id }).lean();
  if (!staffLink) {
    return NextResponse.json({ error: "Account not linked to any staff member. Contact admin." }, { status: 403 });
  }

  const userRole = await UserRole.findOne({ userId: user._id, isActive: true }).lean();
  const role = userRole?.role ?? "admin";
  const factoryId = userRole?.scopeType === "factory" ? userRole.scopeId?.toString() : undefined;
  const depotId = userRole?.scopeType === "depot" ? userRole.scopeId?.toString() : undefined;
  const truckId = userRole?.scopeType === "truck" ? userRole.scopeId?.toString() : undefined;

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    role,
    factoryId,
    depotId,
    truckId,
  });

  const res = NextResponse.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role,
      factoryId,
      depotId,
      truckId,
    },
    token,
  });

  res.cookies.set("token", token, { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });

  return res;
}
