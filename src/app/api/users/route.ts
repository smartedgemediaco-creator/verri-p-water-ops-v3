import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { User, Staff } from "@/lib/models";
import { StaffUserLink } from "@/lib/models/StaffUserLink";
import { UserRole } from "@/lib/models/UserRole";
import { hashPassword, getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();
  const userIds = users.map((u) => u._id);
  const [userRoles, staffLinks] = await Promise.all([
    UserRole.find({ userId: { $in: userIds }, isActive: true }).lean(),
    StaffUserLink.find({ userId: { $in: userIds } }).lean(),
  ]);

  const roleMap = new Map<string, typeof userRoles[0]>();
  for (const ur of userRoles) roleMap.set(ur.userId.toString(), ur);

  const linkMap = new Map<string, typeof staffLinks[0]>();
  for (const l of staffLinks) linkMap.set(l.userId.toString(), l);

  const enriched = users.map((u) => {
    const ur = roleMap.get(u._id.toString());
    const sl = linkMap.get(u._id.toString());
    return {
      ...u,
      role: ur?.role ?? "admin",
      factoryId: ur?.scopeType === "factory" ? ur.scopeId : undefined,
      depotId: ur?.scopeType === "depot" ? ur.scopeId : undefined,
      truckId: ur?.scopeType === "truck" ? ur.scopeId : undefined,
      staffId: sl?.staffId ?? null,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const { name, email, password, role, staffId, factoryId, depotId, truckId } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!staffId) {
    return NextResponse.json({ error: "User must be linked to a staff member (staffId required)" }, { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    return NextResponse.json({ error: "Invalid staffId" }, { status: 400 });
  }

  const existingStaff = await Staff.findById(staffId);
  if (!existingStaff) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const existingLink = await StaffUserLink.findOne({ staffId });
  if (existingLink) {
    return NextResponse.json({ error: "Staff member already linked to another user" }, { status: 409 });
  }

  const hashed = await hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
  });

  await StaffUserLink.create({ staffId, userId: user._id });

  let scopeType: string | undefined;
  let scopeId: string | undefined;
  if (factoryId) { scopeType = "factory"; scopeId = factoryId; }
  else if (depotId) { scopeType = "depot"; scopeId = depotId; }
  else if (truckId) { scopeType = "truck"; scopeId = truckId; }

  if (role !== "admin" && scopeType && scopeId) {
    await UserRole.create({
      userId: user._id,
      role: role || "factory-manager",
      scopeType,
      scopeId,
      isActive: true,
    });
  } else {
    await UserRole.create({
      userId: user._id,
      role: "admin",
      isActive: true,
    });
  }

  await logActivity({
    action: "created",
    entity: "user",
    entityId: user._id.toString(),
    description: `Created user "${name}" (${email}) as ${role || "admin"} linked to staff "${existingStaff.name}"`,
    userId: currentUser.userId,
    metadata: { name, email, role, staffId },
  });

  return NextResponse.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role,
    staffId,
    factoryId,
    depotId,
  }, { status: 201 });
}
