import { NextRequest, NextResponse } from "next/server";
import { current } from "@/auth";
import { q, toNum } from "@/db";
import { bad, body } from "@/util";
/** Reporte de inventario: stock actual, los que van a quedar sin stock y los movimientos (ventas, ingresos de stock). */
export async function GET(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(10, Number(searchParams.get("limit") || 60)));
  const products = (await q(
    `SELECT p.*, c.name AS category
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.active
     ORDER BY (p.stock <= p.low_stock_threshold) DESC, p.stock ASC LIMIT 200`
  )) as Array<Record<string, unknown>>;
  const moves = (await q(
    `SELECT m.*, p.name FROM stock_movements m JOIN products p ON p.id = m.product_id
     ORDER BY m.created_at DESC LIMIT $1`,
    [limit]
  )) as Array<Record<string, unknown>>;
  return NextResponse.json({
    products: products.map((p) => ({
      id: toNum(p.id), name: String(p.name), category: String(p.category),
      stock: toNum(p.stock),
      low: toNum(p.low_stock_threshold),
      updated_at: String(p.updated_at),
    })),
    movements: moves.map((m) => ({
      id: toNum(m.id), product: String(m.name), delta: toNum(m.delta),
      reason: String(m.reason), created_by: String(m.created_by), created_at: String(m.created_at),
    })),
  });
}

/** Ajuste manual de stock (corrección de inventario). */
export async function POST(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const b = await body<{ product_id?: number; delta?: number; reason?: string }>(req);
  const pid = Number(b.product_id || 0);
  const delta = Number(b.delta || 0);
  if (!pid) return bad("Producto requerido.");
  if (!Number.isInteger(delta) || delta === 0) return bad("Cantidad distinta de cero.");
  const r = (await q("UPDATE products SET stock = GREATEST(0, stock + $2), updated_at=now() WHERE id=$1 RETURNING stock", [pid, delta])) as Array<Record<string, unknown>>;
  if (!r.length) return bad("Producto no encontrado.", 404);
  await q("INSERT INTO stock_movements(product_id,delta,reason,created_by) VALUES($1,$2,'ajuste',$3)", [pid, delta, s.name]);
  return NextResponse.json({ stock: toNum(r[0].stock) });
}
