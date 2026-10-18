import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { current } from "@/auth";
import { q, toNum } from "@/db";

/** Lista de productos para caja y administración (incluye inactivos = history). */
export async function GET(req: NextRequest) {
  const s = await current();
  if (!s) return bad("No autorizado.", 401);
  const rows = (await q(
    `SELECT p.*, c.name AS category_name, c.kind
     FROM products p JOIN categories c ON c.id = p.category_id
     ORDER BY c.sort, p.name LIMIT 500`
  )) as Array<Record<string, unknown>>;
  return NextResponse.json({
    products: rows.map((r) => ({
      id: toNum(r.id), category_id: toNum(r.category_id), category_name: String(r.category_name), kind: String(r.kind),
      name: String(r.name), description: String(r.description ?? ""), price: toNum(r.price),
      image: (r.image_data as string) ?? null, stock: toNum(r.stock),
      low_stock_threshold: toNum(r.low_stock_threshold), active: !!r.active,
      created_at: r.created_at, updated_at: r.updated_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const b = await body<{
    category_id?: number; name?: string; description?: string; price?: number | string;
    stock?: number; low_stock_threshold?: number; image?: string | null;
  }>(req);
  const nm = (b.name || "").trim();
  const cat = Number(b.category_id || 0);
  const price = Math.round(Number(b.price || 0) * 100) / 100;
  if (nm.length < 2) return bad("Nombre muy corto.");
  if (!cat) return bad("Elige una categoría.");
  if (!(price > 0)) return bad("El precio debe ser mayor a cero.");
  const r = (await q(
    `INSERT INTO products(category_id,name,description,price,image_data,stock,low_stock_threshold)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [cat, nm, (b.description || "").slice(0, 400), price, b.image || null, Number(b.stock || 0), Number(b.low_stock_threshold || 5)]
  )) as Array<Record<string, unknown>>;
  return NextResponse.json({ product: r[0] }, { status: 201 });
}
