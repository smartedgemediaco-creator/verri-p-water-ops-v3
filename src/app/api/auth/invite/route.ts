import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/lib/models/User";
import { StaffUserLink } from "@/lib/models/StaffUserLink";
import { UserRole } from "@/lib/models/UserRole";
import { createInviteToken, hashPassword, getUserFromRequest, isAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/emailTemplates";
const BRANDING_COMPANY = "Verri P Water";
import { logActivity } from "@/lib/logActivity";

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, email, password, role, staffId, factoryId, depotId, truckId } = await req.json();

    if (!name || !email || !password || !role || !staffId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const newUser = await User.create({ name, email: normalizedEmail, password: hashed, isActive: false });

    await StaffUserLink.create({ staffId, userId: newUser._id });

    const roleData: Record<string, unknown> = { userId: newUser._id, role, isActive: true };
    if (role === "factory-manager" && factoryId) {
      roleData.scopeType = "factory";
      roleData.scopeId = factoryId;
    }
    if (role === "depot-manager" && depotId) {
      roleData.scopeType = "depot";
      roleData.scopeId = depotId;
    }
    if (role === "driver" && truckId) {
      roleData.scopeType = "truck";
      roleData.scopeId = truckId;
    }
    await UserRole.create(roleData);

    const APP_URL = process.env.APP_URL || "https://app.verripwater.com";
    const token = createInviteToken(newUser._id.toString());
    const link = `${APP_URL}/set-password?token=${token}`;

    const emailResult = await sendEmail({
      to: email,
      subject: `You're Invited to ${BRANDING_COMPANY}`,
      html: inviteEmail({ name, link }),
    });

    await logActivity({
      userId: user.userId,
      action: "invite_user",
      entity: "user",
      entityId: newUser._id.toString(),
      description: `Invited ${email} as ${role}`,
      metadata: { invitedEmail: email, role, emailSent: emailResult.success },
    });

    return NextResponse.json({
      success: true,
      userId: newUser._id,
      emailSent: emailResult.success,
      emailError: emailResult.success ? undefined : emailResult.error,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
