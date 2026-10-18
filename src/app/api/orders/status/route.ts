import { NextRequest, NextResponse } from "next/server";
import { q } from "@/db";
import { expireOld, minutesLeft } from "@/orders";

/** Público: consultar el estado de un pedido por su código (pantalla de confirmación del cliente). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").toUpperCase();
  if (!code) return NextResponse.json({ error: "Falta el código." }, { status: 400 });
  await expireOld();
  const rows = (await q("SELECT code, alias, status, total, created_at, expires_at FROM orders WHERE code=$1", [code])) as Array<Record<string, unknown>>;
  if (!rows.length) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  const o = rows[0];
  return NextResponse.json({
    code: String(o.code), alias: String(o.alias), status: String(o.status),
    total: Number(o.total), created_at: String(o.created_at), expires_at: String(o.expires_at),
    minutes_left: String(o.status) === "pendiente" ? minutesLeft(new Date(String(o.expires_at)).toISOString()) : 0,
  });
}
