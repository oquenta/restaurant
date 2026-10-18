import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/auth";
import { q, toNum } from "@/db";
import { expireOld, minutesLeft } from "@/orders";

type Order = {
  id: number; code: string; alias: string; phone: string; status: string; total: string;
  order_type: string | null; payment_method: string | null; created_at: string;
  paid_at: string | null; expires_at: string; amount_received: string | null;
  change_due: string | null; paid_by: string | null; n_items: number;
};

/** Reportes del cajero: ventas del día con hora, método, tipo de venta y cuánto falta para expirar. */
export async function GET(req: NextRequest) {
  const s = await requireRole(req, "cajero");
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  await expireOld();
  const { searchParams } = new URL(req.url);
  const dia = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const from = new Date(`${dia}T00:00:00`);
  const to = new Date(`${dia}T23:59:59.999`);

  const orders = (await q(
    `SELECT * FROM orders WHERE created_at >= $1 AND created_at <= $2
     ORDER BY created_at DESC LIMIT 300`,
    [from, to]
  )) as Array<Record<string, unknown>>;
  const counts = (await q(
    `SELECT order_id AS id, SUM(qty) AS n FROM order_items GROUP BY order_id`
  )) as Array<{ id: string; n: string }>;
  const countById = new Map(counts.map((c) => [Number(c.id), toNum(c.n)]));
  for (const o of orders) {
    o.n_items = countById.get(Number(o.id)) ?? 0;
  }

  const pagados = orders.filter((o) => String(o.status) === "pagado");
  const totalDia = pagados.reduce((a, o) => a + toNum(o.total), 0);
  const efectivo = pagados.filter((o) => String(o.payment_method) === "efectivo").reduce((a, o) => a + toNum(o.total), 0);
  const qr = pagados.filter((o) => String(o.payment_method) === "qr").reduce((a, o) => a + toNum(o.total), 0);

  return NextResponse.json({
    date: dia,
    resumen: { total: Math.round(totalDia * 100) / 100, efectivo: Math.round(efectivo * 100) / 100, qr: Math.round(qr * 100) / 100, n_orders: orders.length, n_pagados: pagados.length },
    orders: orders.map((o) => ({
      id: toNum(o.id), code: String(o.code), alias: String(o.alias), phone: String(o.phone),
      status: String(o.status), total: toNum(o.total),
      order_type: (o.order_type as string) ?? null, payment_method: (o.payment_method as string) ?? null,
      amount_received: o.amount_received == null ? null : toNum(o.amount_received),
      change_due: o.change_due == null ? null : toNum(o.change_due),
      paid_by: (o.paid_by as string) ?? null,
      n_items: toNum(o.n_items),
      cancels_in: String(o.status) === "pendiente" ? minutesLeft(new Date(String(o.expires_at)).toISOString()) : null,
      created_at: String(o.created_at), paid_at: o.paid_at ? String(o.paid_at) : null,
    })),
  });
}
