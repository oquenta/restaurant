import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { current } from "@/auth";
import { q, toNum } from "@/db";

const KINDS = ["plato", "bebida", "postre"] as const;

/** Lista de categorías: la usan el menú público (times), caja y admin. */
export async function GET(req: NextRequest) {
  const s = await current();
  if (!s) return bad("No autorizado.", 401);
  const rows = (await q(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active) AS n_products
     FROM categories c ORDER BY c.sort, c.id`
  )) as Array<Record<string, unknown>>;
  return NextResponse.json({
    categories: rows.map((r) => ({
      id: toNum(r.id), name: String(r.name), kind: String(r.kind),
      active: !!r.active, sort: toNum(r.sort), n_products: toNum(r.n_products),
    })),
  });
}

export async function POST(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const b = await body<{ name?: string; kind?: string }>(req);
  const nm = (b.name || "").trim();
  if (nm.length < 2) return bad("Nombre muy corto.");
  if (!KINDS.includes((b.kind || "") as (typeof KINDS)[number])) return bad("Tipo inválido (plato, bebida o postre).");
  const r = (await q("INSERT INTO categories(name,kind) VALUES($1,$2) RETURNING *", [nm, b.kind])) as Array<Record<string, unknown>>;
  return NextResponse.json({ category: r[0] });
}
