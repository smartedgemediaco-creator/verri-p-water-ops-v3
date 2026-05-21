import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Dispute } from "@/lib/models";
import { getUserFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/logActivity";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can resolve disputes" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  if (!body.status || !["resolved", "dismissed"].includes(body.status)) {
    return NextResponse.json({ error: "Status must be 'resolved' or 'dismissed'" }, { status: 400 });
  }

  const dispute = await Dispute.findByIdAndUpdate(
    id,
    {
      status: body.status,
      resolution: body.resolution || "",
      resolvedBy: user.userId,
    },
    { new: true }
  )
    .populate("createdBy", "name email")
    .populate("resolvedBy", "name email");

  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logActivity({
    action: "updated",
    entity: "dispute",
    entityId: id,
    description: `Dispute ${body.status}: ${dispute.reason} on ${dispute.entity} #${dispute.entityId.toString().slice(-6)}`,
    userId: user.userId,
    metadata: { status: body.status, resolution: body.resolution },
  });

  return NextResponse.json(dispute);
}
