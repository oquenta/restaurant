// Lógica compartida de pedidos.
import { q, withTx } from "./db";
import { toNum } from "./util";
import { EXPIRY_MINUTES, makeCode } from "./domain";

export type OrderItem = {
  id: number; product_id: number | null; name: string; kind: string;
  unit_price: number; qty: number;
};

export type RowItem = OrderItem & { order_id: number };

export type Order = {
  id: number; code: string; alias: string; phone: string; status: string;
  total: number; notes: string; order_type: string | null; payment_method: string | null;
  amount_received: number | null; change_due: number | null; paid_at: string | null;
  paid_by: string | null; created_at: string; expires_at: string;
  items: OrderItem[];
};

export function minutesLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000));
}

export async function expireOld(): Promise<void> {
  await q(
    "UPDATE orders SET status='expirado' WHERE status='pendiente' AND expires_at < now()"
  );
}

export async function itemsFor(orderIds: number[]): Promise<RowItem[]> {
  if (!orderIds.length) return [];
  const ids = orderIds.join(",");
  const rows = (await q(
    `SELECT id, order_id, product_id, name, kind, unit_price, qty
     FROM order_items WHERE order_id IN (${ids}) ORDER BY id`
  )) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: Number(r.id),
    order_id: Number(r.order_id),
    product_id: r.product_id == null ? null : Number(r.product_id),
    name: String(r.name),
    kind: String(r.kind),
    unit_price: toNum(r.unit_price),
    qty: Number(r.qty),
  }));
}

export function mapOrder(o: Record<string, unknown>, its: RowItem[]): Order {
  const created = new Date(String(o.created_at));
  const items = its
    .filter((i) => i.order_id === Number(o.id))
    .map(({ order_id, ...rest }) => rest) as OrderItem[];
  return {
    id: Number(o.id), code: String(o.code), alias: String(o.alias), phone: String(o.phone),
    status: String(o.status), total: toNum(o.total), notes: String(o.notes ?? ""),
    order_type: (o.order_type as string) ?? null, payment_method: (o.payment_method as string) ?? null,
    amount_received: o.amount_received == null ? null : toNum(o.amount_received),
    change_due: o.change_due == null ? null : toNum(o.change_due),
    paid_at: o.paid_at ? new Date(String(o.paid_at)).toISOString() : null,
    paid_by: (o.paid_by as string) ?? null,
    created_at: created.toISOString(),
    expires_at: new Date(String(o.expires_at)).toISOString(),
    items,
  };
}

export async function listOrders(opts: { search?: string; status?: string }): Promise<Order[]> {
  await expireOld();
  const params: unknown[] = [];
  let where = "TRUE";
  if (opts.status && opts.status !== "todos") {
    where += ` AND status = $1`;
    params.push(opts.status);
  }
  if (opts.search) {
    const s = `%${opts.search.replace(/[%_\\]/g, "")}%`;
    where += ` AND (alias ILIKE $2 OR phone ILIKE $2 OR code ILIKE $2)`;
    params.push(s);
  }
  const rows = (await q(
    `SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
    params
  )) as Array<Record<string, unknown>>;
  const ids = rows.map((r) => Number(r.id));
  const its = await itemsFor(ids);
  return rows.map((r) => mapOrder(r, its));
}

export type Full = { r: Record<string, unknown>; its: RowItem[]; order: Order };

export async function getOrderById(id: number): Promise<Full | null> {
  await expireOld();
  const rows = (await q("SELECT * FROM orders WHERE id=$1", [id])) as Array<Record<string, unknown>>;
  if (!rows.length) return null;
  const its = await itemsFor([id]);
  return { r: rows[0], its, order: mapOrder(rows[0], its) };
}

export function getOrderDto(f: Full): Order & { minutes_left: number; modifications: unknown } {
  return { ...f.order, minutes_left: minutesLeft(f.order.expires_at), modifications: [] };
}

type CartLine = { product_id: number; qty: number };

export type Resolved = { ok: true; lines: OrderItem[]; total: number } | { ok: false; error: string };

export async function resolveCart(lines: CartLine[], requireStock = true): Promise<Resolved> {
  if (!Array.isArray(lines) || lines.length === 0) return { ok: false, error: "El pedido no tiene productos." };
  const clean = lines.filter((l) => Number.isInteger(Number(l.product_id)) && Number(l.qty) >= 1 && Number(l.qty) <= 50);
  if (clean.length !== lines.length) return { ok: false, error: "Cantidad inválida (1 a 50)." };
  const ids = Array.from(new Set(clean.map((l) => Number(l.product_id)))).join(",");
  const rows = (await q(
    `SELECT p.id, p.name, p.price, p.stock, p.active, c.kind
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.id IN (${ids})`
  )) as Array<Record<string, unknown>>;
  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  const out: OrderItem[] = [];
  let total = 0;
  for (const l of clean) {
    const r = byId.get(Number(l.product_id));
    if (!r || r.active === false) return { ok: false, error: "Un producto del carrito ya no está disponible. Quita esa línea e intenta otra vez." };
    if (requireStock && Number(r.stock) < Number(l.qty)) {
      return { ok: false, error: `Stock insuficiente de “${String(r.name)}” (quedan ${Number(r.stock)}).` };
    }
    out.push({ id: 0, product_id: Number(l.product_id), name: String(r.name), kind: String(r.kind), unit_price: toNum(r.price), qty: Number(l.qty) });
    total += toNum(r.price) * Number(l.qty);
  }
  return { ok: true, lines: out, total: Math.round(total * 100) / 100 };
}

export async function createOrder(
  alias: string, phone: string, notes: string, lines: CartLine[]
): Promise<{ order: Order } | { error: string }> {
  if (!alias || alias.trim().length < 2) return { error: "Escribe un alias para identificar tu pedido." };
  if (!/^\d{6,15}$/.test(phone.replace(/\D/g, ""))) return { error: "Celular inválido (6 a 15 dígitos)." };
  const cart = await resolveCart(lines);
  if (!cart.ok) return cart;

  let code = "";
  for (let i = 0; i < 8 && !code; i++) {
    const c = makeCode();
    const dup = await q("SELECT 1 FROM orders WHERE code=$1", [c]);
    if (!dup.length) code = c;
  }
  if (!code) return { error: "No se pudo generar el código, intenta otra vez." };

  const o = (await withTx(async (c) => {
    const expires = new Date(Date.now() + EXPIRY_MINUTES * 60000);
    const r = await c.query(
      `INSERT INTO orders(code,alias,phone,total,notes,expires_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [code, alias.trim().slice(0, 40), phone.replace(/\D/g, ""), cart.total, (notes || "").slice(0, 300), expires]
    );
    const oid = toNum(r.rows[0].id);
    for (const p of cart.lines) {
      await c.query(
        "INSERT INTO order_items(order_id,product_id,name,kind,unit_price,qty) VALUES($1,$2,$3,$4,$5,$6)",
        [oid, p.product_id, p.name, p.kind, p.unit_price, p.qty]
      );
    }
    await c.query(
      "INSERT INTO modifications(order_id,type,reason,summary,by_user) VALUES($1,'creado','Pedido desde el menú web',$2,'cliente')",
      [oid, cart.lines.map((p) => `${p.qty}x ${p.name}`).join(", ")]
    );
    return r.rows[0] as Record<string, unknown>;
  }));

  const its = await itemsFor([toNum(o.id)]);
  return { order: mapOrder(o, its) };
}

export type PayInput = { order_type: "local" | "llevar"; payment_method: "efectivo" | "qr"; amount_received?: number };

export async function pay(
  id: number, byName: string, input?: Partial<PayInput>
): Promise<{ order: Order; received: number; change: number } | { error: string }> {
  const full = await getOrderById(id);
  if (!full) return { error: "Pedido no encontrado." };
  const status = String(full.r.status);
  if (status === "expirado") return { error: "El pedido ya expiró (más de 30 min) y se anuló automáticamente." };
  if (status !== "pendiente") return { error: "Este pedido ya no está pendiente." };
  if (input?.order_type !== "local" && input?.order_type !== "llevar")
    return { error: "Elige si el pedido es para el local o para llevar." };
  if (input?.payment_method !== "efectivo" && input?.payment_method !== "qr")
    return { error: "Elige el método de pago." };

  const total = toNum(full.r.total);
  const method = input.payment_method;
  let received = total;
  let change = 0;
  if (method === "efectivo") {
    received = Math.round(Number(input.amount_received ?? 0) * 100) / 100;
    if (!Number.isFinite(received) || received < total)
      return { error: `El monto recibido debe cubrir el total (Bs. ${total.toFixed(2)}).` };
    change = Math.round((received - total) * 100) / 100;
  }

  const upd = (await q(
    `UPDATE orders SET status='pagado', order_type=$2, payment_method=$3, amount_received=$4, change_due=$5,
     paid_at=now(), paid_by=$6 WHERE id=$1 RETURNING *`,
    [id, input.order_type, method, received, change, byName]
  )) as Array<Record<string, unknown>>;

  for (const it of full.its) {
    if (it.product_id) {
      await q("UPDATE products SET stock = GREATEST(0, stock - $2), updated_at=now() WHERE id=$1", [it.product_id, it.qty]);
      await q("INSERT INTO stock_movements(product_id,delta,reason,created_by) VALUES($1,$2,'venta',$3)", [it.product_id, -it.qty, byName]);
    }
  }
  await q("INSERT INTO modifications(order_id,type,reason,summary,by_user) VALUES($1,'pagado',$2,$3,$4)",
    [id, `Cobrado (${method} · ${input.order_type})`, `Total Bs. ${total.toFixed(2)}${change ? ` · Cambio Bs. ${change.toFixed(2)}` : ""}`, byName]);

  return { order: mapOrder(upd[0], full.its), received, change };
}

export async function cancelPaid(id: number, reason: string, byName: string): Promise<{ order: Order } | { error: string }> {
  const full = await getOrderById(id);
  if (!full) return { error: "Pedido no encontrado." };
  if (String(full.r.status) === "anulado") return { error: "Ya está anulado." };
  if (String(full.r.status) !== "pagado") return { error: "Solo se pueden anular pedidos ya pagados (los pendientes los gestiona el cajero)." };
  const upd = (await q("UPDATE orders SET status='anulado' WHERE id=$1 RETURNING *", [id])) as Array<Record<string, unknown>>;
  for (const it of full.its) {
    if (it.product_id) {
      await q("UPDATE products SET stock = stock + $2, updated_at=now() WHERE id=$1", [it.product_id, it.qty]);
      await q("INSERT INTO stock_movements(product_id,delta,reason,created_by) VALUES($1,$2,'anulacion',$3)", [it.product_id, it.qty, byName]);
    }
  }
  await q("INSERT INTO modifications(order_id,type,reason,summary,by_user) VALUES($1,'anulado',$2,$3,$4)",
    [id, reason, "Anulado por administración (stock repuesto)", byName]);
  return { order: mapOrder(upd[0], full.its) };
}

export async function modify(
  id: number, lines: CartLine[], reason: string, byName: string
): Promise<{ order: Order } | { error: string }> {
  const full = await getOrderById(id);
  if (!full) return { error: "Pedido no encontrado." };
  if (String(full.r.status) !== "pendiente")
    return { error: String(full.r.status) === "expirado" ? "El pedido ya expiró, no se puede modificar." : "Solo los pedidos pendientes se pueden modificar." };
  if (!reason || reason.trim().length < 3) return { error: "Debes justificar la modificación (mínimo 3 caracteres)." };
  const cart = await resolveCart(lines, false);
  if (!cart.ok) return cart;

  const before = full.its.map((i) => `${i.qty}x ${i.name}`).join(", ");
  await withTx(async (c) => {
    await c.query("DELETE FROM order_items WHERE order_id=$1", [id]);
    for (const p of cart.lines) {
      await c.query(
        "INSERT INTO order_items(order_id,product_id,name,kind,unit_price,qty) VALUES($1,$2,$3,$4,$5,$6)",
        [id, p.product_id, p.name, p.kind, p.unit_price, p.qty]
      );
    }
    await c.query("UPDATE orders SET total=$2 WHERE id=$1", [id, cart.total]);
    await c.query(
      "INSERT INTO modifications(order_id,type,reason,summary,by_user) VALUES($1,'modificado',$2,$3,$4)",
      [id, reason, `Antes: ${before} → Ahora: ${cart.lines.map((p) => `${p.qty}x ${p.name}`).join(", ")}`, byName]
    );
  });
  const upd = await getOrderById(id);
  return { order: upd!.order };
}

export async function removeOrder(id: number, reason: string, byName: string): Promise<{ order: Order } | { error: string }> {
  const full = await getOrderById(id);
  if (!full) return { error: "Pedido no encontrado." };
  const status = String(full.r.status);
  if (status === "expirado") return { error: "El pedido ya expiró y fue anulado automáticamente." };
  if (status !== "pendiente") return { error: "Solo los pedidos pendientes se pueden eliminar; los pagados los anula el administrador." };
  if (!reason || reason.trim().length < 3) return { error: "Debes justificar la eliminación (mínimo 3 caracteres)." };
  const upd = (await q("UPDATE orders SET status='eliminado' WHERE id=$1 RETURNING *", [id])) as Array<Record<string, unknown>>;
  await q("INSERT INTO modifications(order_id,type,reason,summary,by_user) VALUES($1,'eliminado',$2,$3,$4)",
    [id, reason, `Eliminado por caja. Suma: Bs. ${toNum(full.r.total).toFixed(2)}`, byName]);
  return { order: mapOrder(upd[0], full.its) };
}
