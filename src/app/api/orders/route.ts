import { NextRequest, NextResponse } from "next/server";
import { requireRole, fullName } from "@/auth";
import { createOrder, listOrders } from "@/orders";

type Line = { product_id: number; qty: number };

// público: crear pedido desde el menú · cajero/admin: listar con búsqueda
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    alias?: string; phone?: string; notes?: string; items?: Line[];
  };
  const res = await createOrder(
    (b.alias || "").trim(), b.phone || "", b.notes || "", (b.items || []) as Line[]
  );
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ order: res.order }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const s = await requireRole(req, "cajero");
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const list = await listOrders({
    search: searchParams.get("q") || undefined,
    status: searchParams.get("status") || undefined,
  });
  return NextResponse.json({
    orders: list.map((o) => ({ ...o, minutes_left: minutesLeftOf(o.expires_at) })),
    viewer: { name: fullName(s), role: s.role },
  });
}

function minutesLeftOf(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000));
}
