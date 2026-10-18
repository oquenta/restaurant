import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { requireRole, fullName } from "@/auth";
import { pay } from "@/orders";

// Cobro: define tipo (local/llevar), método (efectivo/qr) y monto recibido → devuelve cambio + datos para tickets.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireRole(req, "cajero");
  if (!s) return bad("No autorizado.", 401);
  const { id } = await ctx.params;
  const b = await body<{
    order_type?: string; payment_method?: string; amount_received?: number | string;
  }>(req);
  const res = await pay(Number(id), fullName(s), {
    order_type: (b.order_type || "") as "local" | "llevar",
    payment_method: (b.payment_method || "") as "efectivo" | "qr",
    amount_received: b.amount_received == null ? undefined : Number(b.amount_received),
  });
  if ("error" in res) return bad(res.error);
  return NextResponse.json(res);
}
