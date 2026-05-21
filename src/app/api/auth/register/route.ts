import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Registration is disabled. Contact admin to create accounts." }, { status: 403 });
}
