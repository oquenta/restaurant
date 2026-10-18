import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/auth";
import { expireOld } from "@/orders";
import { q, toNum } from "@/db";

export type MenuProduct = {
  id: number; name: string; description: string; price: number; image: string | null; stock: number;
};

export type MenuCategory = {
  id: number; name: string; kind: "plato" | "bebida" | "postre";
  products: MenuProduct[];
};

export async function GET() {
  await expireOld();
  const cats = (await q(
    "SELECT id, name, kind FROM categories WHERE active ORDER BY sort, id"
  )) as Array<Record<string, unknown>>;
  const prods = (await q(
    "SELECT id, category_id, name, description, price, image_data, stock FROM products WHERE active ORDER BY name"
  )) as Array<Record<string, unknown>>;
  const prodsByCat = new Map<number, MenuProduct[]>();
  for (const p of prods) {
    const catId = toNum(p.category_id);
    const list = prodsByCat.get(catId) || [];
    list.push({
      id: toNum(p.id), name: String(p.name), description: String(p.description ?? ""),
      price: toNum(p.price), image: (p.image_data as string) ?? null,
      stock: toNum(p.stock),
    });
    prodsByCat.set(catId, list);
  }
  return NextResponse.json({
    categories: cats.map((c) => ({
      id: toNum(c.id),
      name: String(c.name),
      kind: String(c.kind) as MenuCategory["kind"],
      products: prodsByCat.get(toNum(c.id)) || [],
    })),
  });
}
