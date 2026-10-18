import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { current } from "@/auth";
import { q, toNum } from "@/db";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const { id } = await ctx.params;
  const b = await body<{
    name?: string; description?: string; price?: number | string;
    stock?: number; low_stock_threshold?: number; active?: boolean;
    image?: string | null; category_id?: number;
  }>(req);
  const r = (await q(
    `UPDATE products SET
      name = COALESCE($2, name), description = COALESCE($3, description),
      price = COALESCE($4, price), stock = COALESCE($5, stock),
      low_stock_threshold = COALESCE($6, low_stock_threshold),
      active = COALESCE($7, active), image_data = COALESCE($8, image_data),
      category_id = COALESCE($9, category_id), updated_at = now()
     WHERE id=$1 RETURNING *`,
    [
      Number(id),
      b.name?.trim() || null,
      b.description?.slice(0, 400) || null,
      b.price == null ? null : Math.round(Number(b.price) * 100) / 100,
      b.stock == null ? null : Number(b.stock),
      b.low_stock_threshold == null ? null : Number(b.low_stock_threshold),
      b.active == null ? null : !!b.active,
      b.image === undefined ? null : b.image,
      b.category_id == null ? null : Number(b.category_id),
    ]
  )) as Array<Record<string, unknown>>;
  if (!r.length) return bad("Producto no encontrado.", 404);
  return NextResponse.json({ product: r[0] });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const { id } = await ctx.params;
  const used = await q("SELECT 1 FROM order_items WHERE product_id=$1 LIMIT 1", [Number(id)]);
  if (used.length) {
    await q("UPDATE products SET active=false, updated_at=now() WHERE id=$1", [Number(id)]);
    return NextResponse.json({ ok: true, soft: true });
  }
  await q("DELETE FROM stock_movements WHERE product_id=$1", [Number(id)]);
  await q("DELETE FROM products WHERE id=$1", [Number(id)]);
  return NextResponse.json({ ok: true });
}
