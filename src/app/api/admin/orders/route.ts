import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/auth";
import { q, toNum } from "@/db";
import { expireOld, minutesLeft } from "@/orders";

/** Anulación / purga: ya cubierta en /api/anular. Aquí la liste los anulados recientes para la vista admin. */
export async function GET(req: NextRequest) {
  const s = await requireRole(req, "admin");
  if (!s) return NextResponse.json({ error: "Solo el administrador." }, { status: 403 });
  await expireOld();
  const rows = (await q(
    `SELECT * FROM orders WHERE status IN ('expirado','eliminado','anulado')
     ORDER BY created_at DESC LIMIT 100`
  )) as Array<Record<string, unknown>>;
  const counts = (await q(
    `SELECT order_id AS id, SUM(qty) AS n FROM order_items GROUP BY order_id`
  )) as Array<{ id: string; n: string }>;
  const countById = new Map(counts.map((c) => [Number(c.id), toNum(c.n)]));
  for (const r of rows) r.n_items = countById.get(Number(r.id)) ?? 0;
  return NextResponse.json({
    orders: rows.map((o) => ({
      id: toNum(o.id), code: String(o.code), alias: String(o.alias), phone: String(o.phone),
      status: String(o.status), total: toNum(o.total), n_items: toNum(o.n_items),
      created_at: String(o.created_at), minutes_left: String(o.status) === 'pendiente' ? minutesLeft(new Date(String(o.expires_at)).toISOString()) : 0,
    })),
  });
}
