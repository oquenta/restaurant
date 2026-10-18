import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { requireRole, fullName } from "@/auth";
import { getOrderById, modify, removeOrder } from "@/orders";
import { q } from "@/db";

type Line = { product_id: number; qty: number };

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(req, "cajero");
  if (!s) return bad("No autorizado.", 401);
  const { id } = await ctx.params;
  const f = await getOrderById(Number(id));
  if (!f) return bad("Pedido no encontrado.", 404);
  const mods = (await q(
    "SELECT type, reason, summary, by_user, created_at FROM modifications WHERE order_id=$1 ORDER BY id DESC",
    [f.order.id]
  )) as Array<Record<string, unknown>>;
  return NextResponse.json({
    order: f.order,
    modifications: mods.map((m) => ({
      type: String(m.type),
      reason: String(m.reason),
      summary: String(m.summary ?? ""),
      by_user: String(m.by_user),
      when: new Date(String(m.created_at)).toLocaleTimeString("es-PE", {
        hour: "2-digit", minute: "2-digit",
      }),
    })),
    viewer: { name: fullName(s) },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(req, "cajero");
  if (!s) return bad("No autorizado.", 401);
  const { id } = await ctx.params;
  const b = await body<{ items?: Line[]; reason?: string }>(req);
  if (!b.reason || b.reason.trim().length < 3) return bad("Debes justificar la modificación.");
  const res = await modify(Number(id), b.items || [], b.reason, fullName(s));
  if ("error" in res) return bad(res.error);
  return NextResponse.json({ order: res.order });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(req, "cajero");
  if (!s) return bad("No autorizado.", 401);
  const { id } = await ctx.params;
  const b = await body<{ reason?: string }>(req);
  if (!b.reason || b.reason.trim().length < 3) return bad("Debes justificar la eliminación.");
  const res = await removeOrder(Number(id), b.reason, fullName(s));
  if ("error" in res) return bad(res.error);
  return NextResponse.json({ order: res.order });
}
