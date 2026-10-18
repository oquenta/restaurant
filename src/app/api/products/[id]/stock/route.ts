import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { current } from "@/auth";
import { q, toNum } from "@/db";

/** Ingreso de stock (+) por el administrador; registra movimiento con fecha y quién. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const { id } = await ctx.params;
  const b = await body<{ delta?: number; reason?: string }>(req);
  const delta = Number(b.delta || 0);
  const reason = (b.reason || "ingreso").trim();
  if (!Number.isInteger(delta) || delta === 0) return bad("La cantidad debe ser distinta de cero.");
  const r = (await q("UPDATE products SET stock = GREATEST(0, stock + $2), updated_at=now() WHERE id=$1 RETURNING *", [Number(id), delta])) as Array<Record<string, unknown>>;
  if (!r.length) return bad("Producto no encontrado.", 404);
  const stockAfter = toNum(r[0].stock);
  await q("INSERT INTO stock_movements(product_id,delta,reason,created_by) VALUES($1,$2,$3,$4)", [Number(id), delta, reason, s.name]);
  return NextResponse.json({ stock: stockAfter });
}
