import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const body = await req.json();
  const { products } = body;

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json(
      { success: 0, errors: ["No products provided"] },
      { status: 400 }
    );
  }

  const errors: string[] = [];
  let count = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p.name) {
      errors.push(`Row ${i + 1}: missing name`);
      continue;
    }
    if (!p.unitPrice || Number(p.unitPrice) < 1) {
      errors.push(`Row ${i + 1}: unitPrice is required and must be > 0`);
      continue;
    }
    try {
      await Product.create({
        name: p.name,
        unit: p.unit || "bag",
        category: p.category || "sachet",
        description: p.description || "",
        unitPrice: Number(p.unitPrice),
      });
      count++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row ${i + 1}: ${message}`);
    }
  }

  await logActivity({
    action: "created",
    entity: "import",
    entityId: `batch-${Date.now()}`,
    description: `Imported ${count} products (${errors.length} errors)`,
    userId: user.userId,
    metadata: { successCount: count, errorCount: errors.length, errors: errors.slice(0, 5) },
  });

  return NextResponse.json({ success: count, errors });
}
