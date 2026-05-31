import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import connectDB from "./db";
import { User } from "./models/User";

const JWT_SECRET = process.env.JWT_SECRET || "verri-p-water-jwt-secret-dev";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  factoryId?: string;
  depotId?: string;
  truckId?: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  const cookie = req.cookies.get("token");
  return cookie?.value ?? null;
}

export function getUserFromRequest(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function getScopeFilter(user: JWTPayload | null): Record<string, unknown> {
  if (!user || user.role === "admin") return {};
  if (user.role === "factory-manager" && user.factoryId) {
    return { locationType: "factory", locationId: user.factoryId };
  }
  if (user.role === "depot-manager" && user.depotId) {
    return { locationType: "depot", locationId: user.depotId };
  }
  if (user.role === "driver" && user.truckId) {
    return { truckId: user.truckId };
  }
  return {};
}

export async function fetchFullUser(userId: string) {
  await connectDB();
  return User.findById(userId).select("-password").lean();
}

export function isAdmin(user: JWTPayload | null): boolean {
  return user?.role === "admin";
}

// --- Email Token Helpers ---

export function createInviteToken(userId: string): string {
  return jwt.sign({ userId, type: "invite" }, JWT_SECRET, { expiresIn: "48h" });
}

export function createResetToken(userId: string): string {
  return jwt.sign({ userId, type: "reset" }, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyEmailToken(token: string): { userId: string; type: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
    if (!payload.userId || !payload.type) return null;
    return payload;
  } catch {
    return null;
  }
}
