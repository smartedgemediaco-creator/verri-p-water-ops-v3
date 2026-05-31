import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { UserRole } from "@/lib/models/UserRole";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(payload.userId).select("-password").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userRole = await UserRole.findOne({ userId: user._id, isActive: true }).populate("scopeId").lean();

  return NextResponse.json({
    user: {
      ...user,
      role: userRole?.role ?? "admin",
      factoryId: userRole?.scopeType === "factory" ? userRole.scopeId : undefined,
      depotId: userRole?.scopeType === "depot" ? userRole.scopeId : undefined,
      truckId: userRole?.scopeType === "truck" ? userRole.scopeId : undefined,
    },
  });
}
