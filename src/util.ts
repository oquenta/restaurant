import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type Row = Record<string, unknown>;
export type Rows = Row[];

export function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function json(data: unknown, status = 200): NextResponse {
  const res = new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  return res;
}

export function bad(msg: string, status = 400): NextResponse {
  return json({ error: msg }, status);
}

export function body<T>(req: NextRequest): Promise<T> {
  return req.json().catch(() => ({} as T));
}

export const nowIso = () => new Date().toISOString();
