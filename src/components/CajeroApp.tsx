"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote, QrCode, Printer, Search, LoaderCircle, X, Pencil, Trash2, Receipt, BarChart3, Utensils, Wine, CakeSlice, LogOut, CircleAlert, Store, CarFront, ClipboardList, Timer, CheckCircle2,
} from "lucide-react";

type Item = { id: number; product_id: number | null; name: string; kind: string; unit_price: number; qty: number };
type Order = {
  id: number; code: string; alias: string; phone: string; status: string; total: number; notes: string;
  order_type: string | null; payment_method: string | null; amount_received: number | null;
  change_due: number | null; paid_at: string | null; paid_by: string | null; created_at: string; expires_at: string; items: Item[];
  minutes_left: number;
};
type Mod = { type: string; reason: string; summary: string; by_user: string; when: string };
type MenuCat = { id: number; name: string; kind: string; products: { id: number; name: string; price: number; stock: number }[] };
type Viewer = { name: string; role: string };
type Report = {
  date: string;
  resumen: { total: number; efectivo: number; qr: number; n_orders: number; n_pagados: number };
  orders: any[];
};
type PayDone = {
  order: Order;
  received: number;
  change: number;
};

const ESTADOS = [
  { id: "pendiente", label: "En caja", tint: "bg-[#e7a93c]/20 text-[#8a5b11]" },
  { id: "pagado", label: "Pagados", tint: "bg-[#1e4d3f]/15 text-[#1e4d3f]" },
  { id: "anulado", label: "Anulados", tint: "bg-[#7c2430]/10 text-[#7c2430]" },
  { id: "expirado", label: "Expirados", tint: "bg-[#7c2430]/5 text-[#7c2430]/60" },
  { id: "eliminado", label: "Eliminados", tint: "bg-[#221a14]/5 text-[#221a14]/60" },
  { id: "todos", label: "Todos", tint: "bg-[#221a14]/10 text-[#221a14]" },
] as const;

export default function CajeroApp() {
  const r = useRouter();
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("pendiente");
  const [panel, setPanel] = useState("pedidos");

  // carga inicial de sesión
  useEffect(() => {
    fetch("/api/auth/me")
      .then((x) => (x.ok ? x.json() : Promise.reject()))
      .then((d) => setViewer(d.session))
      .catch(() => r.push("/cajero/login"));
  }, [r]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders?q=${encodeURIComponent(q)}&status=${status}`);
    if (res.status === 401) { r.push("/cajero/login"); return; }
    const d = await res.json();
    setOrders(d.orders);
  }, [q, status, r]);

  useEffect(() => {
    if (!viewer) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [viewer, load]);

  if (!viewer) return <CenterSpin />;

  return (
    <div className="min-h-dvh bg-[#122e26] text-white">
      <header className="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7a93c] font-display text-lg font-black text-[#122e26]">MF</span>
        <div className="leading-tight">
          <p className="font-display text-lg font-black">Caja · Mesa Fonda</p>
          <p className="text-[11.5px] text-white/55">usando {viewer.name}</p>
        </div>
        <nav className="ml-auto flex items-center gap-2">
          <button onClick={() => setPanel("pedidos")} className="tab-btn flex items-center gap-1.5" data-on={panel === "pedidos"}>
            <ClipboardList size={16} /> Pedidos
          </button>
          <button onClick={() => setPanel("reportes")} className="tab-btn flex items-center gap-1.5" data-on={panel === "reportes"}>
            <BarChart3 size={16} /> Reportes
          </button>
          <button
            onClick={async () => { await fetch("/api/auth/login", { method: "DELETE" }); r.push("/cajero/login"); }}
            className="btn btn-oscuro-fantasma px-3 py-2 text-[13px]"
            title="Salir"
          >
            <LogOut size={15} />
          </button>
        </nav>
      </header>

      {panel === "pedidos" ? (
        <Board q={q} setQ={setQ} status={status} setStatus={setStatus} orders={orders} reload={load} viewer={viewer} />
      ) : (
        <Reports />
      )}
    </div>
  );
}

/* ============================ PANEL: PEDIDOS ============================ */
function Board(props: {
  q: string; setQ: (s: string) => void; status: string; setStatus: (s: string) => void;
  orders: Order[] | null; reload: () => Promise<void>; viewer: Viewer;
}) {
  const { orders, reload, viewer } = props;
  const [detalle, setDetalle] = useState<Order | null>(null);
  const [mods, setMods] = useState<Mod[]>([]);
  const [modificar, setModificar] = useState<Order | null>(null);
  const [eliminar, setEliminar] = useState<Order | null>(null);
  const [cobrar, setCobrar] = useState<Order | null>(null);
  const [tickets, setTickets] = useState<PayDone | null>(null);
  const [menu, setMenu] = useState<MenuCat[]>([]);

  useEffect(() => {
    fetch("/api/menu").then((x) => x.json()).then((d) => setMenu(d.categories)).catch(() => {});
  }, []);

  function ModsDetail() {
    if (!detalle) return null;
    fetch(`/api/orders/${detalle.id}`)
      .then((x) => (x.ok ? x.json() : Promise.reject()))
      .then((d) => setMods(d.modifications))
      .catch(() => setMods([]));
    return null;
  }

  const pendientes = (orders || []).filter((o) => o.status === "pendiente");

  return (
    <main className="px-4 pb-10">
      {/* barra de herramientas */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              className="w-full rounded-full border border-white/15 bg-white/10 py-2.5 pl-10 pr-4 text-[14px] text-white placeholder:text-white/35 outline-none focus:border-[#e7a93c]"
              placeholder="Buscar por alias, celular o código…"
              value={props.q}
              onChange={(e) => props.setQ(e.target.value)}
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {ESTADOS.map((e) => (
              <button
                key={e.id}
                onClick={() => props.setStatus(e.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-bold transition ${
                  props.status === e.id ? "bg-white text-[#122e26]" : "bg-white/10 text-white/60 hover:bg-white/15"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {pendientes.length > 0 && props.status === "pendiente" && (
          <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
            <span className="rounded-full bg-[#e7a93c]/15 px-3 py-1.5 font-bold text-[#e7a93c]">
              {pendientes.length} pedido{pendientes.length !== 1 ? "s" : ""} esperando en caja
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-white/70">
              Los pedidos se anulan solos a los 30 minutos
            </span>
          </div>
        )}

        <div className="grid gap-3">
          {orders && orders.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-[14px] text-white/50">
              Sin pedidos aquí. Cuando los clientes manden la suya, aparece en esta lista sin refrescar (15 s).
            </div>
          )}
          {(orders || []).map((o) => (
            <RowCard
              key={o.id}
              o={o}
              actions={{ editar: setModificar, eliminar: setEliminar, cobrar: setCobrar }}
            />
          ))}
        </div>
      </div>

      {detalle && <DetalleModal o={detalle} onClose={() => setDetalle(null)} mods={[]} onRefresh={reload} />}
      {modificar && (
        <ModificarModal
          o={modificar}
          menu={menu}
          onClose={() => setModificar(null)}
          onDone={() => { setModificar(null); reload(); }}
        />
      )}
      {eliminar && (
        <MotivoModal
          title="Eliminar pedido"
          desc={`Se eliminará el pedido #${eliminar.code} (${eliminar.alias}). Solo procede con justificación.`}
          confirmLabel="Eliminar pedido"
          onClose={() => setEliminar(null)}
          onConfirm={async (reason) => {
            const res = await fetch(`/api/orders/${eliminar.id}`, {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reason }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || "Error");
            setEliminar(null);
            reload();
          }}
        />
      )}
      {cobrar && (
        <CobrarModal o={cobrar} onClose={() => setCobrar(null)} onDone={(done) => { setCobrar(null); reload(); setTickets(done); }} />
      )}
      <PayTickets done={tickets} onClose={() => setTickets(null)} />
    </main>
  );
}

/* ============================ PANEL: PEDIDOS (tabla) ============================ */
type RowActions = {
  editar: (o: Order) => void;
  eliminar: (o: Order) => void;
  cobrar: (o: Order) => void;
};

function RowCard({ o, actions }: { o: Order; actions: RowActions }) {
  const meta = ESTADOS.find((e) => e.id === o.status);
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[.06] p-4 transition hover:bg-white/[.09]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <p className="font-display text-2xl font-black leading-none text-[#e7a93c]">#{o.code}</p>
          <p className="mt-1 text-[11.5px] text-white/45">{fmtHora(o.created_at)}</p>
        </div>
        <div className="min-w-44 flex-1">
          <p className="text-[15px] font-bold">{o.alias}</p>
          <p className="text-[12.5px] text-white/55">{o.phone}</p>
        </div>
        <div className="text-[12.5px] text-white/65">
          <p>{o.items.length} producto{o.items.length !== 1 ? "s" : ""}</p>
          <p>{o.items.reduce((a, i) => a + i.qty, 0)} unidades</p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-black">Bs. {o.total.toFixed(2)}</p>
        </div>
        <span className={`etiq ${meta?.tint ?? "bg-white/10 text-white/60"} min-w-fit`}>{meta?.label ?? o.status}</span>
        <Countdown o={o} />
      </div>
      {o.status === "expirado" && (
        <p className="mt-2 rounded-xl bg-[#7c2430]/15 px-3.5 py-2 text-[12px] text-[#e59f9f]">
          Anulado automáticamente a las {fmtHora(o.expires_at)}: el cliente no pagó en 30 min.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => actions.editar(o)} disabled={o.status !== "pendiente"} className="btn btn-oscuro-fantasma gap-1.5 px-3.5 py-2 text-[12.5px]"><Pencil size={14} /> Modificar</button>
        <button onClick={() => actions.eliminar(o)} disabled={o.status !== "pendiente"} className="btn btn-oscuro-fantasma gap-1.5 px-3.5 py-2 text-[12.5px] text-[#e59f9f] hover:bg-[#7c2430]/25"><Trash2 size={14} /> Eliminar</button>
        <button onClick={() => actions.cobrar(o)} disabled={o.status !== "pendiente"} className="btn btn-mostaza gap-1.5 px-4 py-2 text-[12.5px] disabled:bg-white/10 disabled:text-white/40"><Banknote size={14} /> Cobrar Bs. {o.total.toFixed(2)}</button>
      </div>
    </article>
  );
}

function Animless() { return null; }

function Countdown({ o }: { o: Order }) {
  const [sec, setSec] = useState(() => {
    const s = (new Date(o.expires_at).getTime() - Date.now()) / 1000;
    return o.status === "pendiente" ? Math.max(0, Math.floor(s)) : 0;
  });
  useEffect(() => {
    if (o.status !== "pendiente") return;
    const t = setInterval(() => {
      const s = (new Date(o.expires_at).getTime() - Date.now()) / 1000;
      setSec(Math.max(0, Math.floor(s)));
    }, 1000);
    return () => clearInterval(t);
  }, [o.expires_at, o.status]);

  if (o.status === "pagado") {
    return (
      <span className="rounded-full bg-[#1e4d3f]/25 px-3 py-1 text-[11.5px] font-bold text-[#7fd6a8]">
        pagado {fmtHora(o.paid_at)} · {o.payment_method}
      </span>
    );
  }
  if (o.status === "expirado") {
    return <span className="rounded-full bg-[#7c2430]/15 px-3 py-1 text-[11.5px] font-bold text-[#e59f9f]">anulado automáticamente</span>;
  }
  if (o.status !== "pendiente") {
    return <span className="rounded-full bg-white/8 px-3 py-1 text-[11.5px] text-white/45">—</span>;
  }
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const critico = sec <= 5 * 60;
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold tabular-nums ${
        critico ? "animate-pulse bg-[#7c2430] text-white" : "bg-white/10 text-white/80"
      }`}
      title="Tiempo restante para anularse automáticamente"
    >
      <Timer size={13} /> {mm}:{ss}
    </span>
  );
}

function fmtHora(x: string | null): string {
  if (!x) return "";
  return new Date(x).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function CenterSpin() {
  return <div className="grid min-h-dvh place-items-center text-[#e7a93c]"><LoaderCircle className="animate-spin" size={34} /></div>;
}

/* ============================ MODALES ============================ */
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-[#fffcf6] text-[#221a14] shadow-2xl">{children}</div>
    </div>
  );
}

function DetalleModal({ o, onClose, mods, onRefresh: _r }: { o: Order; onClose: () => void; mods: Mod[]; onRefresh: () => Promise<void> }) {
  const [detalleMods, setDetalleMods] = useState<Mod[]>(mods);
  useEffect(() => {
    fetch(`/api/orders/${o.id}`)
      .then((x) => (x.ok ? x.json() : Promise.reject()))
      .then((d) => setDetalleMods(d.modifications))
      .catch(() => setDetalleMods([]));
  }, [o.id]);
  return (
    <Overlay>
      <div className="flex items-start justify-between border-b border-[#221a14]/10 px-6 py-4">
        <div>
          <h3 className="font-display text-xl font-black text-[#47141c]">Pedido #{o.code}</h3>
          <p className="text-[12.5px] text-[#221a14]/55">{o.alias} · {o.phone} · pedido a las {fmtHora(o.created_at)}</p>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-[#221a14]/5 hover:bg-[#221a14]/10"><X size={16} /></button>
      </div>
      <div className="grid gap-4 px-6 py-5">
        <div className="grid grid-cols-2 gap-3">
          <Info k="Estado" v={o.status} />
          <Info k="Total" v={`Bs. ${o.total.toFixed(2)}`} />
          <Info k="Cobrado a las" v={o.paid_at ? fmtHora(o.paid_at) : "—"} />
          <Info k="Cajero" v={o.paid_by || "—"} />
          <Info k="Método" v={o.payment_method || "—"} />
          <Info k="Tipo" v={o.order_type || "—"} />
        </div>
        <table className="text-left text-[13px]">
          <thead>
            <tr className="text-[11.5px] uppercase tracking-wide text-[#221a14]/45">
              <th className="pb-1">Cant.</th><th className="pb-1">Producto</th><th className="pb-1">Tipo</th><th className="pb-1 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#221a14]/8">
            {o.items.map((i) => (
              <tr key={i.id}>
                <td className="py-1.5 font-black">{i.qty}×</td>
                <td className="py-1.5 font-semibold">{i.name}</td>
                <td className="py-1.5 text-[#221a14]/55">{i.kind}</td>
                <td className="py-1.5 text-right font-bold">Bs. {(i.unit_price * i.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-[#221a14]/45">Historial y justificaciones</p>
          {detalleMods.length === 0 ? (
            <p className="rounded-xl bg-[#221a14]/5 px-4 py-3 text-[12.5px] text-[#221a14]/55">Sin movimientos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {detalleMods.map((m, idx) => (
                <li key={idx} className="rounded-xl border border-[#221a14]/10 bg-white px-3.5 py-2.5 text-[12.5px]">
                  <p className="flex items-center gap-2 font-bold text-[#47141c]">
                    <span className="etiq bg-[#e7a93c]/25 text-[#8a5b11]">{m.type}</span>
                    {m.reason}
                  </p>
                  <p className="text-[#221a14]/60">{m.summary}</p>
                  <p className="text-[11.5px] text-[#221a14]/40">{m.by_user} · {m.when}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f1e6] px-3.5 py-2.5">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#221a14]/40">{k}</p>
      <p className="text-[14px] font-bold capitalize">{v}</p>
    </div>
  );
}

function MotivoModal(props: {
  title: string; desc: string; confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (reason.trim().length < 3) { setErr("Escribe la justificación (mín. 3 caracteres)."); return; }
    setBusy(true);
    try { await props.onConfirm(reason.trim()); }
    catch (e: any) { setErr(e.message || "Error"); setBusy(false); }
  }
  return (
    <Overlay>
      <div className="px-6 py-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#7c2430]/10 text-[#7c2430]"><CircleAlert size={20} /></span>
          <div>
            <h3 className="font-display text-xl font-black text-[#47141c]">{props.title}</h3>
            <p className="mt-1 text-[13px] text-[#221a14]/60">{props.desc}</p>
          </div>
        </div>
        <textarea
          className="campo mt-4 min-h-24"
          placeholder="Justificación obligatoria — queda registrada con tu nombre, la hora y motivo de la caja."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
        />
        {err && <p className="mt-2 rounded-xl bg-[#7c2430]/10 px-4 py-2.5 text-[12.5px] font-semibold text-[#7c2430]">{err}</p>}
        <div className="mt-4 flex gap-2.5">
          <button onClick={props.onClose} className="btn btn-fantasma flex-1 py-2.5 text-[13.5px]">Cancelar</button>
          <button onClick={submit} disabled={busy} className="btn btn-primario flex-1 py-2.5 text-[13.5px]">
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : props.confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* Modificar pedido: steppers por línea + agregar producto + motivo */
function ModificarModal({ o, menu, onClose, onDone }: { o: Order; menu: MenuCat[]; onClose: () => void; onDone: () => void }) {
  type Ed = { product_id: number; name: string; kind: string; unit_price: number; qty: number };
  const [edits, setEdits] = useState<Ed[]>(
    o.items.filter((i) => i.product_id).map((i) => ({ product_id: i.product_id!, name: i.name, kind: i.kind, unit_price: i.unit_price, qty: i.qty }))
  );
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const total = useMemo(() => edits.reduce((t, e) => t + e.unit_price * e.qty, 0), [edits]);

  function bump(pid: number, d: number) {
    setEdits((es) => es
      .map((e) => (e.product_id === pid ? { ...e, qty: Math.max(0, e.qty + d) } : e))
      .filter((e) => e.qty > 0));
  }
  function add(pid: number) {
    const found = menu.flatMap((c) => c.products.map((p) => ({ ...p, kind: c.kind }))).find((p) => p.id === pid);
    if (!found) return;
    setEdits((es) => {
      const i = es.findIndex((e) => e.product_id === pid);
      if (i >= 0) { const cp = [...es]; cp[i] = { ...cp[i], qty: cp[i].qty + 1 }; return cp; }
      return [...es, { product_id: pid, name: found.name, kind: found.kind, unit_price: found.price, qty: 1 }];
    });
  }

  async function save() {
    if (reason.trim().length < 3) { setErr("Justifica la modificación."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${o.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: edits.map((e) => ({ product_id: e.product_id, qty: e.qty })), reason: reason.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error");
      onDone();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <Overlay>
      <div className="flex items-center justify-between border-b border-[#221a14]/10 px-6 py-4">
        <div>
          <h3 className="font-display text-xl font-black text-[#47141c]">Modificar pedido #{o.code}</h3>
          <p className="text-[12.5px] text-[#221a14]/55">Todo cambio exige justificación y queda en el historial.</p>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-[#221a14]/5 hover:bg-[#221a14]/10"><X size={16} /></button>
      </div>
      <div className="px-6 py-5">
        <ul className="divide-y divide-[#221a14]/10">
          {edits.map((e) => (
            <li key={e.product_id} className="flex items-center gap-3 py-2.5">
              <KindIcon kind={e.kind} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{e.name}</span>
              <span className="text-[12.5px] text-[#221a14]/50">Bs. {e.unit_price.toFixed(2)}</span>
              <div className="flex items-center gap-1.5">
                <StepCircle onClick={() => bump(e.product_id, -1)}>–</StepCircle>
                <span className="w-6 text-center font-black">{e.qty}</span>
                <StepCircle onClick={() => bump(e.product_id, +1)}>+</StepCircle>
              </div>
              <span className="w-20 text-right text-[14px] font-bold">Bs. {(e.unit_price * e.qty).toFixed(2)}</span>
            </li>
          ))}
          {edits.length === 0 && <li className="py-3 text-[13px] text-[#221a14]/50">Sin líneas. Agrega de abajo.</li>}
        </ul>

        <div className="mt-3">
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-[#221a14]/45">Agregar producto</p>
          <div className="no-scrollbar flex flex-wrap gap-1.5">
            {menu.flatMap((c) => c.products).map((p) => (
              <button key={p.id} onClick={() => add(p.id)} className="rounded-full border border-[#221a14]/15 bg-white px-3 py-1.5 text-[12px] font-semibold hover:bg-[#7c2430] hover:text-white transition">
                + {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#122e26] px-4 py-3 text-white">
          <span className="text-[13px] font-semibold text-white/75">Nuevo total</span>
          <span className="font-display text-2xl font-black text-[#e7a93c]">Bs. {total.toFixed(2)}</span>
        </div>
        <textarea className="campo mt-3 min-h-20" placeholder="Motivo de la modificación — ej. “el cliente quitar tras registrado”" value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <p className="mt-2 rounded-xl bg-[#7c2430]/10 px-4 py-2.5 text-[12.5px] font-semibold text-[#7c2430]">{err}</p>}
        <div className="mt-4 flex gap-2.5">
          <button onClick={onClose} className="btn btn-fantasma flex-1 py-2.5 text-[13.5px]">Cancelar</button>
          <button onClick={save} disabled={busy} className="btn btn-bosque flex-1 py-2.5 text-[13.5px]">
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : "Guardar cambios"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function KindIcon({ kind }: { kind: string }) {
  const It = kind === "bebida" ? Wine : kind === "postre" ? CakeSlice : Utensils;
  return <It size={16} className="text-[#7c2430]" />;
}
function StepCircle(props: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={props.onClick} className="grid h-7 w-7 place-items-center rounded-full border border-[#7c2430]/25 text-[#7c2430] transition hover:bg-[#7c2430] hover:text-white active:scale-90">
      {props.children}
    </button>
  );
}

/* Cobrar */
function CobrarModal({ o, onClose, onDone }: { o: Order; onClose: () => void; onDone: (d: PayDone) => void }) {
  const [tipo, setTipo] = useState<"local" | "llevar">("local");
  const [metodo, setMetodo] = useState<"efectivo" | "qr">("efectivo");
  const [recibido, setRecibido] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recib = parseFloat(recibido || "0") || 0;
  const cambio = metodo === "efectivo" ? Math.max(0, recib - o.total) : 0;
  const faltan = metodo === "efectivo" && recib < o.total;

  async function pay() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/orders/${o.id}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order_type: tipo, payment_method: metodo, amount_received: metodo === "efectivo" ? recib : undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error de cobro");
      onDone(d);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Overlay>
      <div className="flex items-center justify-between border-b border-[#221a14]/10 px-6 py-4">
        <div>
          <h3 className="font-display text-xl font-black text-[#47141c]">Cobrar #{o.code}</h3>
          <p className="text-[12.5px] text-[#221a14]/55">{o.alias} · {o.items.reduce((a, i) => a + i.qty, 0)} unidades</p>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-[#221a14]/5"><X size={16} /></button>
      </div>
      <div className="grid gap-5 px-6 py-5">
        <div className="flex items-center justify-between rounded-2xl bg-[#f7f1e6] px-4 py-3">
          <span className="text-[13px] font-semibold text-[#221a14]/60">Total a cobrar</span>
          <span className="font-display text-3xl font-black text-[#47141c]">Bs. {o.total.toFixed(2)}</span>
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-[#221a14]/45">Tipo de venta</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Pick on={tipo === "local"} onClick={() => setTipo("local")} icon={<Store size={16} />} label="Service en el local" />
            <Pick on={tipo === "llevar"} onClick={() => setTipo("llevar")} icon={<CarFront size={16} />} label="Para llevar" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-[#221a14]/45">Método de pago</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Pick on={metodo === "efectivo"} onClick={() => setMetodo("efectivo")} icon={<Banknote size={16} />} label="Efectivo" />
            <Pick on={metodo === "qr"} onClick={() => setMetodo("qr")} icon={<QrCode size={16} />} label="QR (Yape/Plin)" />
          </div>
        </div>

        {metodo === "efectivo" ? (
          <div>
            <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-[#221a14]/45">Monto entregado</p>
            <div className="flex flex-wrap gap-2">
              {[o.total, 50, 100, 200].map((v, i) => (
                <button
                  key={i}
                  onClick={() => setRecibido(String(i === 0 ? o.total : Number(recib) + v))}
                  className="rounded-full border border-[#221a14]/15 bg-white px-3.5 py-1.5 text-[12.5px] font-bold hover:bg-[#e7a93c]/30"
                >
                  {i === 0 ? "Exacto" : `+ Bs. ${v}`}
                </button>
              ))}
              {recib > 0 && <button onClick={() => setRecibido("")} className="rounded-full border border-[#7c2430]/20 px-3 py-1.5 text-[12px] font-bold text-[#7c2430] hover:bg-[#7c2430]/10">limpiar</button>}
            </div>
            <input
              className="campo mt-2.5 text-right font-display text-2xl font-black"
              inputMode="decimal"
              placeholder="0.00"
              value={recibido}
              onChange={(e) => setRecibido(e.target.value.replace(/[^\d.]/g, ""))}
            />
            <div className="mt-2.5 grid grid-cols-2 gap-3">
              <div className={`rounded-2xl px-4 py-3 ${faltan ? "bg-[#7c2430]/10" : "bg-[#f7f1e6]"}`}>
                <p className="text-[10.5px] font-bold uppercase text-[#221a14]/40">{faltan ? "Falta" : "Recibido"}</p>
                <p className={`font-display text-xl font-black ${faltan ? "text-[#7c2430]" : ""}`}>Bs. {(faltan ? o.total - recib : recib).toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-[#1e4d3f]/10 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase text-[#221a14]/40">Cambio</p>
                <p className="font-display text-xl font-black text-[#1e4d3f]">Bs. {cambio.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#1e4d3f]/10 px-4 py-3 text-[12.5px] text-[#1e4d3f]">
            El cliente paga desde su app con QR. Se registra el importe exacto: <b>Bs. {o.total.toFixed(2)}</b>.
          </div>
        )}

        {err && <p className="rounded-xl bg-[#7c2430]/10 px-4 py-2.5 text-[12.5px] font-semibold text-[#7c2430]">{err}</p>}

        <button onClick={pay} disabled={busy || (metodo === "efectivo" && faltan)} className="btn btn-primario w-full py-3.5 text-[15px]">
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <><Receipt size={17} /> Confirmar pago e imprimir tickets</>}
        </button>
      </div>
    </Overlay>
  );
}

function Pick(props: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={props.onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[13.5px] font-bold transition ${
        props.on ? "border-[#7c2430] bg-[#7c2430] text-white" : "border-[#221a14]/15 bg-white hover:border-[#7c2430]/40"
      }`}
    >
      {props.icon} {props.label}
    </button>
  );
}

/* Vista + impresión de tickets */
function PayTickets({ done, onClose }: { done: PayDone | null; onClose: () => void }) {
  if (!done) return null;
  const cocina = done.order.items.filter((i) => i.kind !== "bebida");
  const barra = done.order.items.filter((i) => i.kind === "bebida");
  return (
    <Overlay>
      <div className="px-6 py-5">
        <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-[#1e4d3f]/10 px-4 py-3 text-[#1e4d3f]">
          <CheckCircle2 size={18} />
          <b className="text-[14px]">Pago registrado — Bs. {done.order.total.toFixed(2)}</b>
          <span className="ml-auto text-[12px]">Efectivo: Bs. {done.received.toFixed(2)} · Cambio: Bs. {done.change.toFixed(2)}</span>
        </div>
        <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-[#221a14]/45">Vista previa de los 2 tickets</p>
        <div className="flex flex-wrap items-start gap-4">
          <TicketPreview titulo="COCINA · Platos y postres" o={done.order} items={cocina} />
          <TicketPreview titulo="BARRA · Bebidas" o={done.order} items={barra} />
        </div>
        <div className="mt-4 flex gap-2.5">
          <button onClick={onClose} className="btn btn-fantasma flex-1 py-3 text-[14px]">Listo</button>
          <button onClick={() => window.print()} className="btn btn-bosque flex flex-1 items-center justify-center gap-2 py-3 text-[14px]">
            <Printer size={16} /> Imprimir 2 tickets
          </button>
        </div>
      </div>
      <div className="tickets-root">
        <TicketRows titulo="COCINA · Platos y postres" code={done.order.code} alias={done.order.alias} phone={done.order.phone} hora={fmtHora(done.order.paid_at)} tipo={done.order.order_type} metodo={done.order.payment_method} items={cocina} total={done.order.total} />
        <TicketRows titulo="BARRA · Bebidas" code={done.order.code} alias={done.order.alias} phone={done.order.phone} hora={fmtHora(done.order.paid_at)} tipo={done.order.order_type} metodo={done.order.payment_method} items={barra} total={done.order.total} />
      </div>
    </Overlay>
  );
}

function TicketPreview(props: { titulo: string; o: Order; items: Item[] }) {
  return (
    <div className="w-64 rounded-xl border border-dashed border-[#221a14]/25 bg-white p-3 font-mono text-[11px] leading-tight text-[#221a14]">
      <p className="text-center font-bold tracking-widest">MESA FONDA</p>
      <p className="text-center">{props.titulo}</p>
      <hr className="my-1.5 border-[#221a14]/20" />
      <p>Pedido: #{props.o.code}</p>
      <p>Alias: {props.o.alias}</p>
      <p>Hora: {fmtHora(props.o.paid_at)}</p>
      <hr className="my-1.5 border-[#221a14]/20" />
      {props.items.length === 0 ? <p className="italic text-[#221a14]/45">(sin líneas)</p> : props.items.map((i, idx) => (
        <p key={idx} className="flex justify-between gap-2">
          <span className="truncate">{i.qty}× {i.name}</span>
        </p>
      ))}
    </div>
  );
}

function TicketRows(props: {
  titulo: string; code: string; alias: string; phone: string; hora: string;
  tipo: string | null; metodo: string | null; items: Item[]; total: number;
}) {
  return (
    <div className="ticket p-2">
      <p className="text-center font-bold tracking-widest">MESA FONDA</p>
      <p className="text-center">{props.titulo}</p>
      <hr />
      <p>Pedido : #{props.code}</p>
      <p>Alias  : {props.alias}</p>
      <p>Cel    : {props.phone}</p>
      <p>Hora   : {props.hora}{props.tipo ? ` · ${props.tipo.toUpperCase()}` : ""}</p>
      <hr />
      {props.items.length === 0 ? (
        <p>(sin líneas)</p>
      ) : props.items.map((i, idx) => (
        <p key={idx}>&gt; {i.qty}× {i.name}</p>
      ))}
      <hr />
      <p>{new Date().toLocaleDateString("es-PE")} · pago: {props.metodo}</p>
    </div>
  );
}

/* ============================ PANEL: REPORTES ============================ */
function Reports() {
  const [dia, setDia] = useState(new Date().toISOString().slice(0, 10));
  const [rep, setRep] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setBusy(true);
    fetch(`/api/orders/report?date=${dia}`)
      .then((x) => x.json())
      .then((d) => setRep(d))
      .finally(() => setBusy(false));
  }, [dia]);
  return (
    <main className="px-4 pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-black">Reportes del día</h2>
          <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white outline-none" />
          {busy && <LoaderCircle className="animate-spin text-white/50" size={16} />}
        </div>
        {rep && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat k="Ventas del día" v={`Bs. ${rep.resumen.total.toFixed(2)}`} />
              <Stat k="En efectivo" v={`Bs. ${rep.resumen.efectivo.toFixed(2)}`} />
              <Stat k="Con QR" v={`Bs. ${rep.resumen.qr.toFixed(2)}`} />
            </div>
            <p className="mt-2 text-[12px] text-white/50">
              {rep.resumen.n_pagados} pagados de {rep.resumen.n_orders} pedidos del {rep.date}.
            </p>
            <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.05]">
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-white/40">
                  <tr>
                    <th className="px-4 py-3">Hora</th><th>Pedido</th><th>Alias</th><th>Estado</th>
                    <th>Método</th><th>Tipo</th><th className="text-right">Total</th><th className="pr-4 text-right">¿Paga en?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/85">
                  {rep.orders.map((o: any) => (
                    <tr key={o.id}>
                      <td className="px-4 py-2.5">{fmtHora(o.created_at)}</td>
                      <td className="font-black">#{o.code}</td>
                      <td>{o.alias}</td>
                      <td><span className="etiq bg-white/10">{o.status}</span></td>
                      <td>{o.payment_method || "—"}</td>
                      <td>{o.order_type || "—"}</td>
                      <td className="text-right font-bold">Bs. {o.total.toFixed(2)}</td>
                      <td className="pr-4 text-right">{o.cancels_in != null ? `${o.cancels_in} min` : "—"}</td>
                    </tr>
                  ))}
                  {rep.orders.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-white/40">Sin pedidos ese día.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <StackClean />
    </main>
  );
}

function StackClean() { return null; }

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[.06] px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">{k}</p>
      <p className="font-display text-2xl font-black text-[#e7a93c]">{v}</p>
    </div>
  );
}
