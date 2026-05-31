import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getUserFromRequest, comparePassword } from "@/lib/auth";
import { User } from "@/lib/models/User";

const MODELS = [
  "Factory", "Depot", "Truck", "Product", "Stock",
  "Sale", "Cost", "Transfer", "Production", "Wastage",
  "ActivityLog", "PaymentTransaction", "PosDevice",
];

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.password || !body.confirmPassword) {
      return NextResponse.json({ error: "Both password fields are required" }, { status: 400 });
    }
    if (body.password !== body.confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    await connectDB();

    const admin = await User.findById(user.userId).select("password");
    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const valid = await comparePassword(body.password, admin.password);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    for (const name of MODELS) {
      try {
        const { default: Model } = await import(`@/lib/models/${name}`);
        if (Model?.deleteMany) {
          await Model.deleteMany({});
        }
      } catch {
        // skip if model file not found
      }
    }

    return NextResponse.json({
      success: true,
      message: "All business data cleared. Admin account preserved.",
      preserved: { email: admin.email, role: "admin" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Reset failed";
    console.error("Reset error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
