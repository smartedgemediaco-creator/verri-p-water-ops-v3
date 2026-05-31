import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterial } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";
import { notifyLowStock } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const increment = Number(body.increment);
  if (!increment || increment <= 0) {
    return NextResponse.json({ error: "Invalid increment value" }, { status: 400 });
  }
  const material = await RawMaterial.findByIdAndUpdate(
    id,
    { $inc: { currentStock: increment } },
    { new: true }
  );
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await logActivity({
    action: "updated",
    entity: "raw-material",
    entityId: id,
    description: `Stock increased by ${increment} for "${material.name}" (now ${material.currentStock})`,
    userId: user.userId,
    metadata: { increment, newStock: material.currentStock },
  });
  if (material.currentStock < material.minimumStock) {
    notifyLowStock(material.name, material.currentStock, material.minimumStock).catch(() => {});
  }
  return NextResponse.json(material);
}
