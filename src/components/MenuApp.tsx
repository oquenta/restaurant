"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, LoaderCircle, Smartphone, Utensils, Wine, CakeSlice, Timer } from "lucide-react";

type Prod = { id: number; name: string; description: string; price: number; image: string | null; stock: number };
type Cat = { id: number; name: string; kind: "plato" | "bebida" | "postre"; products: Prod[] };
type Line = { prod: Prod; kind: Cat["kind"]; qty: number };
type Estado = "carta" | "checkout" | "conformidad";
type ConfirmOrder = { code: string; alias: string; total: number; expires_at: string; status: string };

const KIND_META = {
  plato: { icon: Utensils, label: "Platos" },
  bebida: { icon: Wine, label: "Bebidas" },
  postre: { icon: CakeSlice, label: "Postres" },
} as const;

const KIND_TINTS: Record<string, { bg: string; text: string; ring: string }> = {
  plato: { bg: "bg-[#7c2430]/10", text: "text-[#7c2430]", ring: "ring-[#7c2430]/20" },
  bebida: { bg: "bg-[#1e4d3f]/10", text: "text-[#1e4d3f]", ring: "ring-[#1e4d3f]/20" },
  postre: { bg: "bg-[#e7a93c]/20", text: "text-[#8a5b11]", ring: "ring-[#e7a93c]/30" },
};

export default function MenuApp({ mesa }: { mesa: number | null }) {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [tab, setTab] = useState<"todos" | Cat["kind"]>("todos");
  const [lines, setLines] = useState<Line[]>([]);
  const [estado, setEstado] = useState<Estado>("carta");
  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmOrder | null>(null);

  useEffect(() => {
    setAlias(localStorage.getItem("mf_alias") || "");
    setPhone(localStorage.getItem("mf_phone") || "");
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => setCats(d.categories))
      .catch(() => setCats([]));
  }, []);

  const total = useMemo(() => lines.reduce((t, l) => t + l.prod.price * l.qty, 0), [lines]);
  const count = useMemo(() => lines.reduce((t, l) => t + l.qty, 0), [lines]);
  const visible = useMemo(() => (tab === "todos" ? cats : cats?.filter((c) => c.kind === tab)), [cats, tab]);

  function setQty(prod: Prod, kind: Cat["kind"], qty: number) {
    setLines((ls) => {
      const rest = ls.filter((l) => l.prod.id !== prod.id);
      if (qty <= 0) return rest;
      const q = Math.min(qty, Math.max(1, prod.stock));
      return [...rest, { prod, kind, qty: q }].sort((a, b) => a.prod.id - b.prod.id);
    });
  }
  const qtyOf = (id: number) => lines.find((l) => l.prod.id === id)?.qty ?? 0;

  async function sendToCashier() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alias, phone, notes, items: lines.map((l) => ({ product_id: l.prod.id, qty: l.qty })) }),      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el pedido.");
      localStorage.setItem("mf_alias", alias);
      localStorage.setItem("mf_phone", phone);
      setConfirm({ code: data.order.code, alias, total: data.order.total, expires_at: data.order.expires_at, status: data.order.status });
      setLines([]);
      setEstado("conformidad");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (cats === null) {
    return <div className="grid min-h-dvh place-items-center text-[#7c2430]"><LoaderCircle className="animate-spin" size={34} /></div>;
  }

  return (
    <main className="papel-dot min-h-dvh pb-32">
      <header className="sticky top-0 z-20 border-b border-[#47141c]/10 bg-[#fffcf6]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7c2430] font-display text-lg font-black text-white">MF</span>
            <div className="leading-tight">
              <p className="font-display text-lg font-black text-[#221a14]">Mesa Fonda</p>
              <p className="text-[11px] font-semibold text-[#1e4d3f]">{mesa ? `Mesa ${mesa}` : "Para consumir aquí"}</p>
            </div>
          </div>
          {estado !== "carta" ? (
            <button onClick={() => setEstado("carta")} className="btn btn-fantasma gap-1.5 px-4 py-2 text-[13px]">
              <ArrowLeft size={15} /> {estado === "checkout" ? "Volver a la carta" : "Carta"}
            </button>
          ) : (
            <span className="rounded-full bg-[#e7a93c]/20 px-3 py-1.5 text-[11.5px] font-bold text-[#8a5b11]">Cuenta tus platos al carrito 👇</span>
          )}
        </div>
      </header>

      {estado === "carta" && (
        <>
          <div className="sticky top-[57px] z-10 bg-[#f7f1e6]/95 px-4 py-2.5 backdrop-blur">
            <div className="no-scrollbar mx-auto flex max-w-5xl gap-2 overflow-x-auto">
              <Chip on={tab === "todos"} onClick={() => setTab("todos")}>Todo</Chip>
              {(["plato", "bebida", "postre"] as const).map((k) => (
                <Chip key={k} on={tab === k} onClick={() => setTab(k)}>
                  {KIND_META[k].label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-4 pt-4">
            {(visible || []).length === 0 && (
              <p className="rounded-2xl bg-white p-5 text-center text-[14px] text-[#221a14]/60">Aún no hay productos en esta sección.</p>
            )}
            {(visible || []).map((cat) => (
              <section key={cat.id} className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#47141c]">
                  {(() => {
                    const It = KIND_META[cat.kind].icon;
                    return <It size={19} className={KIND_TINTS[cat.kind].text} />;
                  })()}
                  {cat.name}
                  <span className="etiq bg-[#221a14]/5 text-[#221a14]/50">{cat.products.length} opciones</span>
                </h2>
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.products.map((p) => (
                    <ProductCard key={p.id} p={p} qty={qtyOf(p.id)} setQty={setQty} kind={cat.kind} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
            {count > 0 && (
              <button
                onClick={() => setEstado("checkout")}
                className="btn mx-auto flex w-full max-w-5xl items-center justify-between bg-[#7c2430] px-5 py-4 text-white shadow-xl hover:bg-[#611c26]"
              >
                <span className="flex items-center gap-2.5 text-[14.5px] font-bold">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
                    <ShoppingBag size={15} />
                  </span>
                  {count} ítem{count !== 1 ? "s" : ""} en tu carrito
                </span>
                <span className="flex items-center text-[16.5px] font-black">
                  S/ {total.toFixed(2)}
                  <ArrowLeft size={15} className="ml-2 rotate-180" />
                </span>
              </button>
            )}
          </div>
        </>
      )}

      {estado === "checkout" && (
        <section className="mx-auto max-w-xl px-4 pt-6">
          <h1 className="font-display text-3xl font-black text-[#47141c]">Mi carrito</h1>
          <div className="mt-4 rounded-3xl bg-white p-5">
            {lines.length === 0 ? (
              <p className="text-center text-[14px] text-[#221a14]/50">Vacío. Vuelve a la carta y agrega algo rico.</p>
            ) : (
              <ul className="divide-y divide-[#221a14]/10">
                {lines.map((l) => (
                  <li key={l.prod.id} className="flex items-center gap-3 py-3">
        <Thumb p={l.prod} kind={l.kind} tiny />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-bold text-[#221a14]">{l.prod.name}</p>
                      <p className="text-[12.5px] text-[#221a14]/55">S/ {l.prod.price.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StepBtn minimize onClick={() => setQty(l.prod, l.kind, l.qty - 1)}><Minus size={13} /></StepBtn>
                      <span className="w-6 text-center text-[14.5px] font-black">{l.qty}</span>
                      <StepBtn onClick={() => setQty(l.prod, l.kind, l.qty + 1)}><Plus size={13} /></StepBtn>
                    </div>
                    <span className="w-20 text-right text-[14.5px] font-black text-[#47141c]">S/ {(l.prod.price * l.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lines.length > 0 && (
            <>
              <div className="mt-4 rounded-3xl bg-white p-5">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#47141c]"><Smartphone size={17} /> Dinos quién eres</h2>
                <p className="mt-1 text-[12.5px] text-[#221a14]/60">Mención <b>alias</b> y celular para que caja te identifique. Nada de cuentas, solo permisos de requisición.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input className="campo" placeholder="Alias: ej. César, Mesa 4, La Carmen" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={40} />
                  <input className="campo" inputMode="numeric" placeholder="Celular: 9 dumbas" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))} />
                </div>
                <input className="campo mt-3" placeholder="Indicaciones para cocina (opcional): sin ají, tallar al dente..." value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#122e26] px-4 py-3 text-white">
                  <span className="text-[13.5px] font-semibold text-white/80">Total del pedido</span>
                  <span className="font-display text-2xl font-black text-[#e7a93c]">S/ {total.toFixed(2)}</span>
                </div>
                {err && <p className="mt-3 rounded-xl bg-[#7c2430]/10 px-4 py-3 text-[13px] font-semibold text-[#7c2430]">{err}</p>}
                <button onClick={sendToCashier} disabled={busy || alias.trim().length < 2 || !/^\d{6,15}$/.test(phone)} className="btn btn-bosque mt-4 w-full py-3.5 text-[15px]">
                  {busy ? <LoaderCircle size={18} className="animate-spin" /> : <><Check size={17} />Enviar mi pedido a caja</>}
                </button>
                <p className="mt-2 text-center text-[11.5px] text-[#221a14]/50">Tu pedido se anula automáticamente si no pasas por caja en <b>30 minutos</b>.</p>
              </div>
            </>
          )}
        </section>
      )}

      {estado === "conformidad" && confirm && (
        <SuccessScreen order={confirm} onBack={() => setEstado("carta")} />
      )}
    </main>
  );
}

function SuccessScreen({ order, onBack }: { order: ConfirmOrder; onBack: () => void }) {
  const [left, setLeft] = useState(() => {
    const ms = new Date(order.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  });
  const [status, setStatus] = useState(order.status);
  useEffect(() => {
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/orders/status?code=${order.code}`);
        const d = await r.json();
        if (r.ok) setStatus(d.status);
      } catch {}
    }, 8000);
    return () => { clearInterval(t); clearInterval(poll); };
  }, [order.code]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <section className="mx-auto max-w-lg px-4 pt-8">
      <div className="tarjeta overflow-hidden">
        <div className="flex flex-col items-center bg-[#1e4d3f] px-6 py-9 text-white">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15">
            <Check size={34} strokeWidth={3} />
          </span>
          <h1 className="mt-3 font-display text-2xl font-black">¡Tu pedido ya está en caja!</h1>
          <p className="mt-1 text-center text-[13px] text-white/75">
            Acércate a la caja y menciona tu <b>{order.alias ? "alias" : "código"}</b> para realizar el pago.
          </p>
        </div>
        <div className="px-6 py-6 text-center">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-[#221a14]/45">Tu número de pedido</p>
          <p className="font-display text-5xl font-black text-[#7c2430]">{order.code}</p>
          <p className="mt-1 text-[13.5px] text-[#221a14]/65">Alias: <b className="text-[#221a14]">{order.alias}</b></p>

          <div className="mx-auto mt-5 flex w-fit items-center gap-2.5 rounded-full bg-[#e7a93c]/15 px-5 py-2.5 text-[#8a5b11]">
            <Timer size={17} />
            {status === "pendiente" ? (
              <>
                <span className="text-[13.5px] font-bold">Expira en</span>
                <span className="font-display text-xl font-black tabular-nums">{mm}:{ss}</span>
              </>
            ) : status === "pagado" ? (
              <span className="text-[13.5px] font-bold">¡Pagado — discreta y listo!</span>
            ) : (
              <span className="text-[13.5px] font-bold">Expiró después de 30 min sin pago</span>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#f7f1e6] px-4 py-3">
            <span className="text-[13px] font-semibold text-[#221a14]/60">Total a pagar</span>
            <span className="font-display text-2xl font-black text-[#47141c]">S/ {Number(order.total).toFixed(2)}</span>
          </div>
          <div className="mt-4 flex gap-2.5">
            <button onClick={onBack} className="btn btn-fantasma flex-1 py-2.5 text-[13.5px]">Seguir mirando la carta</button>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[12px] text-[#221a14]/45">
        Presenta tu número de pedido #<b>{order.code}</b> en la caja y paga con efectivo o QR.
      </p>
    </section>
  );
}


function ProductCard({ p, qty, setQty, kind }: { p: Prod; qty: number; setQty: (p: Prod, k: Cat["kind"], q: number) => void; kind: Cat["kind"] }) {
  const agotado = p.stock <= 0;
  const tint = KIND_TINTS[kind];
  return (
    <article className={`tarjeta flex gap-3.5 overflow-hidden p-3.5 ${agotado ? "opacity-60 grayscale" : ""}`}>
      <Thumb p={p} kind={kind} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[15px] font-bold leading-tight text-[#221a14]">{p.name}</h3>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#221a14]/55">{p.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2.5">
          <span className="font-display text-lg font-black text-[#47141c] drop-shadow-none">S/ {p.price.toFixed(2)}</span>
          {agotado ? (
            <span className="etiq bg-[#7c2430]/10 text-[#7c2430]">Agotado</span>
          ) : qty > 0 ? (
            <div className="flex items-center gap-1.5">
              <StepBtn onClick={() => setQty(p, kind, qty - 1)}><Minus size={13} /></StepBtn>
              <span className="w-6 text-center text-[15px] font-black">{qty}</span>
              <StepBtn onClick={() => setQty(p, kind, Math.min(p.stock, qty + 1))}><Plus size={13} /></StepBtn>
            </div>
          ) : (
            <button onClick={() => setQty(p, kind, 1)} className="btn btn-primario gap-1 px-3.5 py-2 text-[12.5px]">
              <Plus size={14} /> Agregar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Thumb({ p, kind, tiny }: { p: Prod; kind: Cat["kind"]; tiny?: boolean }) {
  if (p.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image} alt={p.name} className={`${tiny ? "h-14 w-14" : "h-[86px] w-[86px] shrink-0 rounded-2xl object-cover"} rounded-2xl`} />;
  }
  const It = kind === "bebida" ? Wine : kind === "postre" ? CakeSlice : Utensils;
  return (
    <span className={`grid ${tiny ? "h-14 w-14" : "h-[86px] w-[86px]"} shrink-0 place-items-center rounded-2xl ${KIND_TINTS[kind].bg} ${KIND_TINTS[kind].text}`}>
      <It size={tiny ? 22 : 34} strokeWidth={1.7} />
    </span>
  );
}

function StepBtn(props: { onClick: () => void; children: React.ReactNode; minimize?: boolean }) {
  return (
    <button
      onClick={props.onClick}
      className={`grid ${props.minimize ? "h-6 w-6" : "h-8 w-8"} place-items-center rounded-full border border-[#7c2430]/25 text-[#7c2430] transition hover:bg-[#7c2430] hover:text-white active:scale-90`}
    >
      {props.children}
    </button>
  );
}

function Chip(props: { on: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      data-on={props.on}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition ${
        props.on ? "bg-[#7c2430] text-white shadow" : "bg-white text-[#221a14]/65 hover:bg-[#7c2430]/10"
      }`}
    >
      {props.children}
    </button>
  );
}
