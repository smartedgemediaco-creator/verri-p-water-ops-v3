import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { hashPassword, getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET() {
  await connectDB();
  const users = await User.find({}).select("-password").sort({ createdAt: -1 });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const { name, email, password, role, factoryId, depotId } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashed = await hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
    role: role || "factory-manager",
    factoryId: factoryId || undefined,
    depotId: depotId || undefined,
  });

  await logActivity({
    action: "created",
    entity: "user",
    entityId: user._id.toString(),
    description: `Created user "${name}" (${email}) as ${role || "factory-manager"}`,
    userId: currentUser.userId,
    metadata: { name, email, role },
  });

  return NextResponse.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    factoryId: user.factoryId,
    depotId: user.depotId,
  }, { status: 201 });
}
