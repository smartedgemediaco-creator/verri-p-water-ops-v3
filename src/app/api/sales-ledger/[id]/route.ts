/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { SalesLedger } from "@/lib/models";
import { getUserFromRequest, isAdmin } from "@/lib/auth";

const SKIP_KEYS = new Set(["date", "locationType", "locationId", "_id", "__v", "createdAt", "updatedAt"]);
const STRING_FIELDS = new Set(["debtStatus", "notes"]);
const ARRAY_FIELDS = new Set(["debtors", "transfers"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const record = await SalesLedger.findById(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  for (const [key, val] of Object.entries(body)) {
    if (SKIP_KEYS.has(key)) continue;
    if (ARRAY_FIELDS.has(key)) {
      (record as any)[key] = Array.isArray(val)
        ? (val as any[]).map((d) => ({
            name: String(d?.name ?? "").trim(),
            amount: Number(d?.amount) || 0,
            ...(key === "debtors"
              ? {
                  settlements: Array.isArray(d?.settlements)
                    ? d.settlements.map((s: any) => ({
                        amount: Number(s?.amount) || 0,
                        date: s?.date ? String(s.date) : new Date().toISOString(),
                        note: s?.note ? String(s.note) : "",
                      }))
                    : [],
                }
              : {}),
          }))
        : [];
    } else if (STRING_FIELDS.has(key)) {
      (record as any)[key] = String(val ?? "");
    } else {
      (record as any)[key] = Number(val) || 0;
    }
  }

  // Auto-calculate total debts from debtors
  const debtors = Array.isArray((record as any).debtors) ? (record as any).debtors : [];
  (record as any).debts = debtors.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);

  await record.save();
  return NextResponse.json(record);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(_req);
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await connectDB();
  const record = await SalesLedger.findById(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await record.deleteOne();
  return NextResponse.json({ message: "Deleted" });
}
