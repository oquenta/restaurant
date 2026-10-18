import { NextRequest, NextResponse } from "next/server";
import { current } from "@/auth";
import { q, toNum } from "@/db";
import { json } from "@/util";
import { expireOld } from "@/orders";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function shiftDate(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

/** Dashboard del administrador. */
export async function GET(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return json({ error: "Solo el administrador." }, 403);
  await expireOld();
  const desdeHoy = startOfToday();
  const desde7 = shiftDate(6);
  const desde30 = shiftDate(29);

  const [ventasHoy] = (await q(
    "SELECT COALESCE(SUM(total),0) AS total, COUNT(*)::int AS n FROM orders WHERE status='pagado' AND paid_at >= $1",
    [desdeHoy]
  )) as Array<{ total: string; n: number }>;
  const [pendientes] = (await q(
    "SELECT COUNT(*)::int AS n FROM orders WHERE status='pendiente' AND expires_at > now()"
  )) as Array<{ n: number }>;
  const porMetodo = (await q(
    `SELECT payment_method, COALESCE(SUM(total),0) AS total, COUNT(*)::int AS n
     FROM orders WHERE status='pagado' AND paid_at >= $1 GROUP BY payment_method`,
    [desdeHoy]
  )) as Array<{ payment_method: string; total: string; n: number }>;
  void porMetodo;
  const pagados7 = (await q(
    `SELECT total, payment_method, paid_at FROM orders WHERE status='pagado' AND paid_at >= $1`,
    [desde7]
  )) as Array<Record<string, unknown>>;
  const metodosHoy = new Map<string, { total: number; n: number }>();
  for (const o of pagados7) {
    if (new Date(String(o.paid_at)) >= desdeHoy) {
      const k = String(o.payment_method || "efectivo");
      const e = metodosHoy.get(k) || { total: 0, n: 0 };
      e.total += toNum(o.total); e.n += 1;
      metodosHoy.set(k, e);
    }
  }
  const diasMap = new Map<string, { label: string; total: number; n: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    diasMap.set(d.toISOString().slice(0, 10), {
      label: d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
      total: 0, n: 0,
    });
  }
  for (const o of pagados7) {
    const key = new Date(String(o.paid_at)).toISOString().slice(0, 10);
    const e = diasMap.get(key);
    if (e) { e.total += toNum(o.total); e.n += 1; }
  }
  const low = (await q(
    `SELECT p.id, p.name, p.stock, p.low_stock_threshold, p.image_data, c.name AS category
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.active AND p.stock <= p.low_stock_threshold
     ORDER BY p.stock ASC LIMIT 12`
  )) as Array<Record<string, unknown>>;
  const top = await topVentas(desde30);
  const anuladosRows = (await q(
    `SELECT id, code, alias, status, total, created_at FROM orders
     WHERE status IN ('anulado','eliminado','expirado') AND created_at >= $1
     ORDER BY created_at DESC LIMIT 20`,
    [desde7]
  )) as Array<Record<string, unknown>>;
  const modsAll = (await q(
    `SELECT order_id, reason, by_user, created_at FROM modifications
     WHERE type IN ('anulado','eliminado','expirado') ORDER BY id DESC LIMIT 80`
  )) as Array<Record<string, unknown>>;
  const modByOrder = new Map<number, Record<string, unknown>>();
  for (const m of modsAll) {
    const oid = toNum(m.order_id);
    if (!modByOrder.has(oid)) modByOrder.set(oid, m);
  }

  return json({
    ventas_hoy: { total: toNum(ventasHoy.total), n: ventasHoy.n },
    pendientes: pendientes.n,
    metodos: Array.from(metodosHoy.entries()).map(([method, e]) => ({
      method, total: Math.round(e.total * 100) / 100, n: e.n,
    })),
    dias: Array.from(diasMap.entries()).map(([, e]) => ({ label: e.label, total: e.total, n: e.n })),
    low_stock: low.map((p) => ({
      id: toNum(p.id), name: String(p.name), stock: toNum(p.stock),
      low: toNum(p.low_stock_threshold), category: String(p.category),
    })),
    top: top.map((t) => ({
      name: String(t.name), kind: String(t.kind),
      qty: toNum(t.qty), total: toNum(t.total),
    })),
    anulados: anuladosRows.map((o) => {
      const m = modByOrder.get(toNum(o.id));
      return {
        id: toNum(o.id), code: String(o.code), alias: String(o.alias), status: String(o.status),
        total: toNum(o.total), reason: m ? String(m.reason) : "",
        by: m ? String(m.by_user) : "", created_at: String(o.created_at),
      };
    }),
  });
}

async function topVentas(despues: Date): Promise<Array<{ name: string; kind: string; qty: number; total: number }>> {
  const rows = (await q(
    `SELECT a.name, a.qty, a.unit_price, a.product_id
     FROM order_items a
     JOIN orders o2 ON o2.id = a.order_id AND o2.status='pagado' AND o2.paid_at >= $1`,
    [despues]
  )) as Array<Record<string, unknown>>;
  const kinds = (await q(
    `SELECT p.id, c.kind FROM products p JOIN categories c ON c.id = p.category_id`
  )) as Array<{ id: string; kind: string }>;
  const kindById = new Map(kinds.map((k) => [Number(k.id), String(k.kind)]));
  const agg = new Map<string, { qty: number; total: number; kind: string }>();
  for (const r of rows) {
    const key = String(r.name);
    const e = agg.get(key) || { qty: 0, total: 0, kind: kindById.get(Number(r.product_id)) || "plato" };
    e.qty += toNum(r.qty);
    e.total += toNum(r.qty) * toNum(r.unit_price);
    agg.set(key, e);
  }
  return Array.from(agg.entries())
    .map(([name, e]) => ({ name, qty: e.qty, total: e.total, kind: e.kind }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);
}
