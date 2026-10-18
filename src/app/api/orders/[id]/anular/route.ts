import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { requireRole } from "@/auth";
import { cancelPaid, getOrderById } from "@/orders";
import { q } from "@/db";

// Administrador: anular un pedido (normalmente ya pagado) con justificación; repone stock.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(req, "admin");
  if (!s) return bad("Solo el administrador.", 403);
  const { id } = await ctx.params;
  const b = await body<{ reason?: string }>(req);
  const res = await cancelPaid(Number(id), b.reason || "", s.name);
  if ("error" in res) return bad(res.error);
  return NextResponse.json({ order: res.order });
}

// Administrador: purgar definitivamente un pedido expirado.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(req, "admin");
  if (!s) return bad("Solo el administrador.", 403);
  const { id } = await ctx.params;
  const b = await body<{ reason?: string }>(req);
  const f = await getOrderById(Number(id));
  if (!f) return bad("Pedido no encontrado.", 404);
  if (String(f.r.status) !== "expirado") return bad("Solo se purgan pedidos expirados; usa la anulación.");
  await q("DELETE FROM orders WHERE id=$1", [Number(id)]);
  void b;
  return NextResponse.json({ ok: true });
}
