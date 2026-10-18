import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { current } from "@/auth";
import { q, toNum } from "@/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const { id } = await ctx.params;
  const b = await body<{ name?: string; active?: boolean }>(req);
  const r = (await q(
    "UPDATE categories SET name = COALESCE($2, name), active = COALESCE($3, active) WHERE id=$1 RETURNING *",
    [Number(id), b.name?.trim() || null, b.active == null ? null : !!b.active]
  )) as Array<Record<string, unknown>>;
  if (!r.length) return bad("Categoría no encontrada.", 404);
  return NextResponse.json({ category: r[0] });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const { id } = await ctx.params;
  const n = (await q("SELECT COUNT(*)::int AS n FROM products WHERE category_id=$1", [Number(id)]))[0] as { n: number };
  if (Number(n?.n ?? 0) > 0) return bad("La categoría tiene productos; desactívala o muévelos antes de eliminar.");
  await q("DELETE FROM categories WHERE id=$1", [Number(id)]);
  return NextResponse.json({ ok: true });
}
