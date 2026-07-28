import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();

    const allowed: Record<string, string> = {};
    if (body.name && typeof body.name === "string" && body.name.trim()) {
      allowed.name = body.name.trim();
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await User.findByIdAndUpdate(user.userId, allowed, { new: true })
      .select("-password")
      .lean();

    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await logActivity({
      action: "updated",
      entity: "user",
      entityId: user.userId,
      description: `Updated profile`,
      userId: user.userId,
    });

    return NextResponse.json({ user: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
