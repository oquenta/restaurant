import { NextResponse } from "next/server";
import { current } from "@/auth";

export async function GET() {
  const s = await current();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, session: s });
}
