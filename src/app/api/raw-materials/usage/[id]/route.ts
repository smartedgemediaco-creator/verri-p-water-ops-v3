import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { RawMaterialConsumption } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();

  const record = await RawMaterialConsumption.findById(id).populate("rawMaterialId", "name unit");
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalQuantity = record.totalQuantity || 0;
  const unit = record.rawMaterialId?.unit || "";
  const purpose = record.purpose || "consumption";

  await RawMaterialConsumption.findByIdAndDelete(id);

  await logActivity({
    action: "deleted",
    entity: "raw-material-usage",
    entityId: id,
    description: `Deleted usage record: ${totalQuantity} ${unit} of "${record.rawMaterialId?.name ?? "material"}" (${purpose}) — stock was NOT restored`,
    userId: user.userId,
    metadata: { totalQuantity, unit, purpose },
  });

  return NextResponse.json({ message: "Deleted" });
}
