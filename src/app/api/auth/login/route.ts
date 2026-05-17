import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { Factory } from "@/lib/models/Factory";
import { Depot } from "@/lib/models/Depot";
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

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    factoryId: user.factoryId?.toString(),
    depotId: user.depotId?.toString(),
  });

  let factoryName: string | undefined;
  let depotName: string | undefined;
  if (user.factoryId) {
    const factory = await Factory.findById(user.factoryId).select("name");
    factoryName = factory?.name;
  }
  if (user.depotId) {
    const depot = await Depot.findById(user.depotId).select("name");
    depotName = depot?.name;
  }

  const res = NextResponse.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      factoryId: user.factoryId,
      depotId: user.depotId,
      factoryName,
      depotName,
    },
    token,
  });
  res.cookies.set("token", token, { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });

  return res;
}
