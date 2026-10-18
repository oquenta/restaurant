"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Boxes, ChartPie, ClipboardX, Grid2X2, ImagePlus, LayoutDashboard, LoaderCircle,
  LogOut, Plus, QrCode, Search, UserPlus, Utensils, Wine, CakeSlice, X, Trash2, Ban,
  ShieldCheck, CircleAlert, Pencil, RefreshCw,
} from "lucide-react";

type Prod = {
  id: number; category_id: number; category_name: string; kind: string;
  name: string; description: string; price: number; image: string | null;
  stock: number; low_stock_threshold: number; active: boolean; created_at: string; updated_at: string;
};
type Cat = { id: number; name: string; kind: string; active: boolean; n_products: number };
type Cajero = { id: number; first_name: string; last_name: string; username: string; active: boolean; created_at: string };
type Dash = {
  ventas_hoy: { total: number; n: number };
  pendientes: number;
  metodos: { method: string; total: number; n: number }[];
  dias: { label: string; total: number; n: number }[];
  low_stock: { id: number; name: string; stock: number; low: number; category: string }[];
  top: { name: string; kind: string; qty: number; total: number }[];
  anulados: { id: number; code: string; alias: string; status: string; total: number; reason: string; by: string; created_at: string }[];
};
type StockData = {
  products: { id: number; name: string; category: string; stock: number; low: number; updated_at: string }[];
  movements: { id: number; product: string; delta: number; reason: string; created_by: string; created_at: string }[];
};
type OrderLite = {
  id: number; code: string; alias: string; phone: string; status: string; total: number;
  n_items: number; created_at: string; minutes_left?: number;
};

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "productos", label: "Productos", icon: Boxes },
  { id: "categorias", label: "Categorías", icon: Grid2X2 },
  { id: "stock", label: "Inventario", icon: ChartPie },
  { id: "cajeros", label: "Cajeros", icon: UserPlus },
  { id: "pedidos", label: "Pedidos", icon: ClipboardX },
  { id: "qr", label: "Código QR", icon: QrCode },
] as const;

export default function AdminApp() {
  const r = useRouter();
  const [viewer, setViewer] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("dashboard");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((x) => (x.ok ? x.json() : Promise.reject()))
      .then((d) => {
        if (d.session?.role !== "admin") return r.push("/admin/login") as any;
        setViewer(d.session.name);
      })
      .catch(() => r.push("/admin/login"));
  }, [r]);

  if (!viewer) return <div className="grid min-h-dvh place-items-center bg-[#122e26] text-[#e7a93c]"><LoaderCircle className="animate-spin" size={34} /></div>;

  return (
    <div className="min-h-dvh bg-[#122e26] text-white md:flex">
      {/* sidebar */}
      <aside className="md:mb-0 border-b border-white/10 md:h-dvh md:w-56 md:border-b-0 md:border-r md:px-3 md:py-5">
        <div className="flex items-center gap-2.5 px-3 py-3 md:flex-col md:items-start">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7a93c] font-display text-lg font-black text-[#122e26]">MF</span>
          <div className="leading-tight md:mb-4">
            <p className="font-display text-lg font-black">Administración</p>
            <p className="text-[11.5px] text-white/50">{viewer}</p>
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2 md:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-on={tab === t.id}
              className="tab-btn flex items-center gap-2 md:w-full md:justify-start"
            >
              <t.icon size={16} /> <span className="whitespace-nowrap">{t.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={async () => { await fetch("/api/auth/login", { method: "DELETE" }); r.push("/admin/login"); }}
          className="btn btn-oscuro-fantasma mt-auto hidden w-full justify-start px-3 py-2.5 text-[13px] md:flex"
        >
          <LogOut size={15} /> Salir
        </button>
      </aside>
      <div className="flex-1 overflow-y-auto md:h-dvh">
        {tab === "dashboard" && <Dashboard />}
        {tab === "productos" && <Productos />}
        {tab === "categorias" && <Categorias />}
        {tab === "stock" && <Inventario />}
        {tab === "cajeros" && <Cajeros />}
        {tab === "pedidos" && <PedidosAdmin />}
        {tab === "qr" && <QrMesas />}
      </div>
    </div>
  );
}

/* ============================ DASHBOARD ============================ */
function Dashboard() {
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => {
    fetch("/api/dashboard").then((x) => x.json()).then(setD).catch(() => {});
  }, []);
  if (!d) return <Spin />;
  const maxDia = Math.max(1, ...d.dias.map((x) => x.total));

  return (
    <main className="p-4 md:p-6">
      <h1 className="font-display text-3xl font-black">Hoy en la caja</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card k="Ventas de hoy" v={`Bs. ${d.ventas_hoy.total.toFixed(2)}`} s={`${d.ventas_hoy.n} pedidos pagados`} accent />
        <Card k="Pendientes en caja" v={String(d.pendientes)} s="esperando cobro" />
        <Card k="Efectivo vs QR" v={d.metodos.map((m) => `${m.method === "efectivo" ? "Efe" : "QR"} Bs. ${m.total.toFixed(0)}`).join(" · ") || "—"} s="del día" />
        <Card k="Sin casi stock" v={String(d.low_stock.length)} s="productos por agotarse" warn />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[.05] p-5">
          <h2 className="font-display text-lg font-bold">Ventas últimos 7 días</h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {d.dias.map((x) => (
              <div key={x.label} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10.5px] font-bold text-[#e7a93c]">{x.total > 0 ? Math.round(x.total) : ""}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-[#e7a93c]/30 to-[#e7a93c]" style={{ height: `${(x.total / maxDia) * 100}%`, minHeight: 4 }} />
                <span className="text-[10px] text-white/45">{x.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-white/10 bg-white/[.05] p-5">
          <h2 className="font-display text-lg font-bold">Top ventas del mes</h2>
          <ul className="mt-3 space-y-2">
            {d.top.slice(0, 6).map((t, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-3.5 py-2 text-[13px]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#e7a93c]/25 font-black text-[#e7a93c]">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{t.name}</span>
                <span className="etiq bg-white/10 text-white/60">{t.kind}</span>
                <span className="font-black text-[#e7a93c]">{t.qty}×</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[.05] p-5">
          <h2 className="font-display text-lg font-bold font-black">Por agotarse</h2>
          <p className="mb-3 text-[11.5px] text-white/45">Suma stock rápido desde Inventario.</p>
          <ul className="space-y-2">
            {d.low_stock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3.5 py-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                <span className="text-white/45">{p.category}</span>
                <span className={`font-black ${p.stock <= 2 ? "text-[#e59f9f]" : "text-[#e7a93c]"}`}>{p.stock} u.</span>
              </li>
            ))}
            {d.low_stock.length === 0 && <li className="rounded-xl bg-white/5 px-3.5 py-2 text-[12.5px] text-white/45">Todo con stock regular. 👌</li>}
          </ul>
        </section>
        <section className="rounded-3xl border border-white/10 bg-white/[.05] p-5">
          <h2 className="font-display text-lg font-bold">Anulados y expirados (7 días)</h2>
          <ul className="mt-3 space-y-2">
            {d.anulados.map((o) => (
              <li key={`${o.id}-${o.reason}`} className="rounded-xl bg-white/5 px-3.5 py-2 text-[12.5px]">
                <p className="flex items-center gap-2 font-bold">
                  <Ban size={13} className="text-[#e59f9f]" /> #{o.code} · {o.alias}
                  <span className="etiq bg-white/10 text-white/60">{o.status}</span>
                  <span className="ml-auto font-bold text-[#e7a93c]">Bs. {o.total.toFixed(2)}</span>
                </p>
                {o.reason && <p className="text-white/55">“{o.reason}” — {o.by}</p>}
              </li>
            ))}
            {d.anulados.length === 0 && <li className="rounded-xl bg-white/5 px-3.5 py-2 text-[12.5px] text-white/45">Sin anulaciones. 👍</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Card({ k, v, s, accent, warn }: { k: string; v: string; s: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[.05] px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">{k}</p>
      <p className={`mt-1 font-display text-3xl font-black ${accent ? "text-[#e7a93c]" : warn ? "text-[#e59f9f]" : ""}`}>{v}</p>
      <p className="text-[11.5px] text-white/45">{s}</p>
    </div>
  );
}

/* ============================ PRODUCTOS ============================ */
function Productos() {
  const [prods, setProds] = useState<Prod[] | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("todos");
  const [edit, setEdit] = useState<Partial<Prod> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      fetch("/api/products").then((x) => x.json()),
      fetch("/api/categories").then((x) => x.json()),
    ]);
    setProds(p.products);
    setCats(c.categories);
  }, []);
  useEffect(() => { load(); }, [load]);

  const visibles = (prods || []).filter((p) =>
    (kind === "todos" || p.kind === kind) &&
    (q === "" || (p.name + p.category_name).toLowerCase().includes(q.toLowerCase()))
  );

  async function save(fd: FormData) {
    setBusy(true);
    try {
      const id = Number(fd.get("id") || 0);
      const payload: Record<string, unknown> = {
        name: String(fd.get("name") || "").trim(),
        category_id: Number(fd.get("category_id") || 0),
        description: String(fd.get("description") || ""),
        price: Number(fd.get("price") || 0),
        stock: Number(fd.get("stock") || 0),
        low_stock_threshold: Number(fd.get("low_stock_threshold") || 5),
        active: fd.get("active") === "on",
        image: (fd.get("image") as string) || undefined,
      };
      const res = id
        ? await fetch(`/api/products/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error");
      setEdit(null);
      await load();
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-black">Carta</h1>
        <button onClick={() => setEdit({ active: true, stock: 10, low_stock_threshold: 5 })} className="btn btn-mostaza ml-auto gap-1.5 px-4 py-2.5 text-[13.5px]">
          <Plus size={15} /> Nuevo producto
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-full border border-white/15 bg-white/10 py-2.5 pl-10 pr-4 text-[14px] placeholder:text-white/35 outline-none focus:border-[#e7a93c]" placeholder="Buscar producto…" />
        </div>
        {["todos", "plato", "bebida", "postre"].map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold capitalize ${kind === k ? "bg-white text-[#122e26]" : "bg-white/10 text-white/60"}`}>{k}</button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {prods && visibles.length === 0 && <p className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-[13px] text-white/45">Nada por aquí con ese filtro.</p>}
      </div>
      <div className="mt-4 grid gap-3">
        {visibles.map((p) => (
          <article key={p.id} className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-white/[.05] p-3.5">
            <span className="grid h-14 w-14 shrink-0 overflow-hidden place-items-center rounded-2xl bg-white/10 text-[#e7a93c]">
              {p.image ? (/* img inline */
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
              ) : p.kind === "bebida" ? <Wine size={20} /> : p.kind === "postre" ? <CakeSlice size={20} /> : <Utensils size={20} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14.5px] font-bold">
                {p.name}
                {!p.active && <span className="etiq bg-white/10 text-white/50">inactivo</span>}
              </p>
              <p className="text-[12px] text-white/45">{p.category_name} · act. {new Date(p.updated_at).toLocaleDateString("es-PE")}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-black text-[#e7a93c]">Bs. {p.price.toFixed(2)}</p>
              <p className={`text-[12px] font-bold ${p.stock <= p.low_stock_threshold ? "text-[#e59f9f]" : "text-white/55"}`}>{p.stock} u. en stock</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[5, 10, 50].map((n) => (
                <button
                  key={n}
                  onClick={async () => {
                    await fetch(`/api/products/${p.id}/stock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ delta: n }) });
                    load();
                  }}
                  className="rounded-full border border-white/15 px-2.5 py-1.5 text-[11.5px] font-bold text-white/70 hover:bg-white/10"
                  title={`Ingresar ${n} unidades (quedará en ${p.stock + n})`}
                >
                  +{n}
                </button>
              ))}
              <button onClick={() => setEdit(p)} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-bold hover:bg-white/10"><Pencil size={13} /> Editar</button>
            </div>
          </article>
        ))}
      </div>

      {edit && (
        <ProdModal
          value={edit}
          cats={cats}
          busy={busy}
          onClose={() => setEdit(null)}
          onSubmit={save}
        />
      )}
    </main>
  );
}

function ProdModal({ value, cats, busy, onClose, onSubmit }: {
  value: Partial<Prod>; cats: Cat[]; busy: boolean;
  onClose: () => void; onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [img, setImg] = useState<string | null>(value.image || null);
  const [err, setErr] = useState<string | null>(null);

  async function pickImg(file: File | null) {
    if (!file) return;
    setImg(await resizeImage(file));
  }

  async function onsubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const fd = new FormData();
    fd.append("id", String(value.id || ""));
    fd.append("name", String(f.get("name") || ""));
    fd.append("category_id", String(f.get("category_id") || ""));
    fd.append("description", String(f.get("description") || ""));
    fd.append("price", String(f.get("price") || ""));
    fd.append("stock", String(f.get("stock") || ""));
    fd.append("low_stock_threshold", String(f.get("low_stock_threshold") || ""));
    fd.append("active", f.get("active") ? "on" : "");
    if (img) fd.append("image", img);
    await onSubmit(fd);
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      <form onSubmit={onsubmit} className="w-full max-w-lg rounded-3xl bg-[#fffcf6] p-6 text-[#221a14] shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl font-black text-[#47141c]">{value.id ? "Editar producto" : "Nuevo producto"}</h3>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-[#221a14]/5"><X size={16} /></button>
        </div>
        <div className="flex gap-4">
          <label className="grid h-28 w-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-[#221a14]/20 bg-white text-center hover:border-[#7c2430]/50">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImg(e.target.files?.[0] ?? null)} />
            {img ? (
              <img src={img} alt="f" className="h-full w-full object-cover" />
            ) : (
              <span className="p-2 text-[11.5px] font-semibold text-[#221a14]/50">
                <ImagePlus size={20} className="mx-auto mb-1 text-[#7c2430]" />Subir foto
              </span>
            )}
          </label>
          <div className="grid flex-1 gap-2.5">
            <input name="name" defaultValue={value.name || ""} className="campo" placeholder="Nombre del plato…" required />
            <select name="category_id" defaultValue={String(value.category_id || "")} className="campo">
              <option value="" disabled>Categoría…</option>
              {cats.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
            <input name="price" type="number" step="0.1" min="0.5" defaultValue={value.price ?? ""} className="campo" placeholder="Precio (Bs.)" required />
          </div>
        </div>
        <textarea name="description" defaultValue={value.description || ""} className="campo mt-2.5 min-h-16" placeholder="Breve descripción para el menú…" />
        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          <input name="stock" type="number" min="0" defaultValue={value.stock ?? 0} className="campo" placeholder="Stock" />
          <input name="low_stock_threshold" type="number" min="0" defaultValue={value.low_stock_threshold ?? 5} className="campo" placeholder="Aviso bajo stock" />
          <label className="flex items-center justify-center gap-2 rounded-xl border border-[#221a14]/15 bg-white px-3 text-[13px] font-semibold">
            <input name="active" type="checkbox" defaultChecked={value.active !== false} className="h-4 w-4 accent-[#7c2430]" /> Activo
          </label>
        </div>
        {err && <p className="mt-2 rounded-xl bg-[#7c2430]/10 px-4 py-2.5 text-[12.5px] font-semibold text-[#7c2430]">{err}</p>}
        <div className="mt-4 flex gap-2.5">
          <button type="button" onClick={onClose} className="btn btn-fantasma flex-1 py-2.5">Cancelar</button>
          <button type="submit" disabled={busy} className="btn btn-bosque flex-1 py-2.5">
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* Redimensiona imagen en el navegador a máx 700x700 JPEG 0.75 */
async function resizeImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 700 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(bmp.width * scale);
  cv.height = Math.round(bmp.height * scale);
  cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/jpeg", 0.75);
}

/* ============================ CATEGORÍAS ============================ */
function Categorias() {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [nm, setNm] = useState("");
  const [kd, setKd] = useState("plato");
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => fetch("/api/categories").then((x) => x.json()).then((d) => setCats(d.categories)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setErr(null);
    const res = await fetch("/api/categories", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: nm, kind: kd }) });
    const d = await res.json();
    if (!res.ok) { setErr(d.error); return; }
    setNm("");
    load();
  }
  return (
    <main className="p-4 md:p-6">
      <h1 className="font-display text-3xl font-black">Categorías</h1>
      <div className="mt-4 flex max-w-xl flex-wrap gap-2.5">
        <input value={nm} onChange={(e) => setNm(e.target.value)} className="w-56 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[14px] placeholder:text-white/35 outline-none focus:border-[#e7a93c]" placeholder="Ej. Fondas clásicas" />
        <select value={kd} onChange={(e) => setKd(e.target.value)} className="rounded-full border border-white/15 bg-white/10 px-3 py-2.5 text-[14px] outline-none">
          <option className="text-[#221a14]" value="plato">Platos</option>
          <option className="text-[#221a14]" value="bebida">Bebidas</option>
          <option className="text-[#221a14]" value="postre">Postres</option>
        </select>
        <button onClick={add} className="btn btn-mostaza gap-1.5 px-4 py-2.5 text-[13px]"><Plus size={15} /> Crear</button>
        {err && <p className="w-full rounded-xl bg-[#7c2430]/25 px-4 py-2 text-[12.5px] font-bold text-[#e59f9f]">{err}</p>}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats === null && <Spin />}
        {(cats || []).map((c) => (
          <article key={c.id} className={`rounded-3xl border border-white/10 p-4 ${c.active ? "bg-white/[.05]" : "bg-white/[.02] opacity-60"}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold">{c.name}</p>
              <KindBadge kind={c.kind} />
            </div>
            <p className="mt-1 text-[12px] text-white/45">{c.n_products} productos activos</p>
            <button
              onClick={async () => { await fetch(`/api/categories/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !c.active }) }); load(); }}
              className="mt-2 rounded-full border border-white/15 px-3 py-1 text-[11.5px] font-bold text-white/70 hover:bg-white/10"
            >
              {c.active ? "Desactivar (ocultar en carta)" : "Reactivar"}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const It = kind === "bebida" ? Wine : kind === "postre" ? CakeSlice : Utensils;
  return <span className="etiq flex items-center gap-1 bg-white/10 text-white/60"><It size={11} /> {kind}</span>;
}

/* ============================ INVENTARIO ============================ */
function Inventario() {
  const [d, setD] = useState<StockData | null>(null);
  const [vt, setVt] = useState<"bajo" | "movs">("bajo");
  const load = useCallback(() => fetch("/api/reports/stock").then((x) => x.json()).then(setD).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function addStock(id: number, delta: number) {
    await fetch(`/api/products/${id}/stock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ delta, reason: "ingreso" }) });
    load();
  }
  const bajo = (d?.products || []).filter((p) => p.stock <= p.low);

  return (
    <main className="p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="font-display text-3xl font-black">Inventario</h1>
        <span className="ml-auto flex gap-1.5">
          <button onClick={() => setVt("bajo")} className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold ${vt === "bajo" ? "bg-white text-[#122e26]" : "bg-white/10 text-white/60"}`}>Por agotarse ({bajo.length})</button>
          <button onClick={() => setVt("movs")} className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold ${vt === "movs" ? "bg-white text-[#122e26]" : "bg-white/10 text-white/60"}`}>Movimientos</button>
          <button onClick={load} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/60 hover:bg-white/10"><RefreshCw size={14} /></button>
        </span>
      </div>

      {vt === "bajo" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(d?.products || []).map((p) => (
            <article key={p.id} className={`rounded-3xl border p-4 ${p.stock <= p.low ? "border-[#7c2430]/50 bg-[#7c2430]/12" : "border-white/10 bg-white/[.04]"}`}>
              <p className="font-bold">{p.name}</p>
              <p className="text-[11.5px] text-white/45">{p.category} · aviso bajo stock: {p.low}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className={`font-display text-2xl font-black ${p.stock === 0 ? "text-[#e59f9f]" : p.stock <= p.low ? "text-[#e7a93c]" : "text-white"}`}>{p.stock}</span>
                <span className="text-[12px] text-white/40">unidades</span>
                <span className="ml-auto flex gap-1.5">
                  {[5, 10, 50].map((n) => (
                    <button key={n} disabled={d === null} onClick={() => addStock(p.id, n)} className="rounded-lg border border-white/20 px-2 py-1 text-[11px] font-bold hover:bg-white/10">+{n}</button>
                  ))}
                </span>
              </div>
              <p className="mt-1 text-[10.5px] text-white/35">act. {new Date(p.updated_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.05]">
          <table className="w-full text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-white/40">
              <tr><th className="px-4 py-3">Fecha y hora</th><th>Producto</th><th>Δ Cantidad</th><th>Motivo</th><th className="pr-4">Registró</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(d?.movements || []).map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(m.created_at).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="font-semibold">{m.product}</td>
                  <td className={`font-black ${m.delta > 0 ? "text-[#7fd6a8]" : "text-[#e59f9f]"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</td>
                  <td><span className="etiq bg-white/10 text-white/70">{m.reason}</span></td>
                  <td className="pr-4 text-white/55">{m.created_by}</td>
                </tr>
              ))}
              {(d?.movements?.length ?? 0) === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-white/40">Aún no hay movimientos.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

/* ============================ CAJEROS ============================ */
function Cajeros() {
  const [list, setList] = useState<Cajero[] | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => fetch("/api/users").then((x) => x.json()).then((d) => setList(d.cajeros)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const t = e.target as HTMLFormElement;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        first_name: (t.elements.namedItem("fn") as HTMLInputElement).value,
        last_name: (t.elements.namedItem("ln") as HTMLInputElement).value,
        username: (t.elements.namedItem("un") as HTMLInputElement).value,
        password: (t.elements.namedItem("pw") as HTMLInputElement).value,
      }),
    });
    const d = await res.json();
    if (!res.ok) { setErr(d.error); return; }
    setOpen(false);
    load();
  }

  return (
    <main className="p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-black">Cajeros</h1>
        <button onClick={() => setOpen(true)} className="btn btn-mostaza ml-auto gap-1.5 px-4 py-2.5 text-[13.5px]"><UserPlus size={15} /> Crear cajero</button>
      </div>
      <div className="mt-4 grid gap-3 max-w-2xl">
        {list && list.length === 0 && <p className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-[13px] text-white/45">Aún no hay cajeros.</p>}
        {(list || []).map((u) => (
          <article key={u.id} className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[.05] px-4 py-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#7c2430] text-[15px] font-black">{(u.first_name[0] + u.last_name[0]).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{u.first_name} {u.last_name}</p>
              <p className="text-[12.5px] text-white/50">@{u.username} · alta {new Date(u.created_at).toLocaleDateString("es-PE")}</p>
            </div>
            <span className={`etiq ${u.active ? "bg-[#1e4d3f]/40 text-[#7fd6a8]" : "bg-white/10 text-white/50"}`}>{u.active ? "activo" : "inactivo"}</span>
            <button
              onClick={async () => { await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !u.active }) }); load(); }}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-bold hover:bg-white/10"
            >
              {u.active ? "Desactivar" : "Reactivar"}
            </button>
          </article>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
          <form onSubmit={crear} className="w-full max-w-md rounded-3xl bg-[#fffcf6] p-6 text-[#221a14] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl font-black text-[#47141c]">Nuevo cajero</h3>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-[#221a14]/5"><X size={16} /></button>
            </div>
            <div className="grid gap-2.5">
              <input name="fn" className="campo" placeholder="Nombres" required />
              <input name="ln" className="campo" placeholder="Apellidos" required />
              <input name="un" className="campo" placeholder="Usuario (ej. carlo2)" required pattern="[a-zA-Z0-9._-]{3,20}" />
              <input name="pw" type="password" className="campo" placeholder="Contraseña (mín. 6)" required minLength={6} />
            </div>
            {err && <p className="mt-2 rounded-xl bg-[#7c2430]/10 px-4 py-2.5 text-[12.5px] font-semibold text-[#7c2430]">{err}</p>}
            <div className="mt-4 flex gap-2.5">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-fantasma flex-1 py-2.5">Cancelar</button>
              <button type="submit" className="btn btn-bosque flex-1 py-2.5">Crear cajero</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

/* ============================ PEDIDOS (admin) ============================ */
function PedidosAdmin() {
  const [os, setOs] = useState<OrderLite[] | null>(null);
  const [st, setSt] = useState("anulado");
  const [target, setTarget] = useState<OrderLite | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => {
    const url = st === "todos" ? "/api/orders?status=todos" : `/api/orders?status=${st}`;
    return fetch(url).then((x) => x.json()).then((d) => setOs(d.orders)).catch(() => {});
  }, [st]);
  useEffect(() => { load(); }, [load]);

  async function anular() {
    if (!target) return;
    setErr(null);
    const res = await fetch(`/api/orders/${target.id}/anular`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
    const d = await res.json();
    if (!res.ok) { setErr(d.error); return; }
    setTarget(null);
    setReason("");
    load();
  }

  return (
    <main className="p-4 md:p-6">
      <h1 className="font-display text-3xl font-black">Pedidos</h1>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["anulado", "expirado", "eliminado", "pagado", "pendiente", "todos"].map((k) => (
          <button key={k} onClick={() => setSt(k)} className={`rounded-full px-3.5 py-2 text-[12.5px] font-bold capitalize ${st === k ? "bg-white text-[#122e26]" : "bg-white/10 text-white/60"}`}>{k}</button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 max-w-3xl">
        {os && os.length === 0 && <p className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-[13px] text-white/45">Nada registrado en ese filtro.</p>}
        {(os || []).map((o) => (
          <article key={o.id} className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-white/[.05] px-4 py-3.5">
            <p className="font-display text-xl font-black text-[#e7a93c]">#{o.code}</p>
            <div className="min-w-40 flex-1">
              <p className="font-bold">{o.alias} <span className="text-white/40">· {o.phone}</span></p>
              <p className="text-[11.5px] text-white/45">{new Date(o.created_at).toLocaleString("es-PE")} · {o.n_items} unidades</p>
            </div>
            <span className="etiq bg-white/10 text-white/70">{o.status}</span>
            <p className="font-black">Bs. {o.total.toFixed(2)}</p>
            {o.status === "pagado" && (
              <button onClick={() => setTarget(o)} className="flex items-center gap-1.5 rounded-full border border-[#7c2430]/40 bg-[#7c2430]/20 px-3.5 py-2 text-[12px] font-bold text-[#e59f9f] hover:bg-[#7c2430]/35">
                <Ban size={13} /> Anular
              </button>
            )}
          </article>
        ))}
      </div>

      {target && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#fffcf6] p-6 text-[#221a14] shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7c2430]/10 text-[#7c2430]"><CircleAlert size={20} /></span>
              <div>
                <h3 className="font-display text-xl font-black text-[#47141c]">Anular #{target.code} (pagado)</h3>
                <p className="mt-1 text-[12.5px] text-[#221a14]/60">El stock se repone automáticamente y queda registro con tu nombre.</p>
              </div>
            </div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="campo mt-4 min-h-20" placeholder="Motivo: reincidencia, error documentado…" />
            {err && <p className="mt-2 rounded-xl bg-[#7c2430]/10 px-4 py-2.5 text-[12.5px] font-semibold text-[#7c2430]">{err}</p>}
            <div className="mt-4 flex gap-2.5">
              <button onClick={() => setTarget(null)} className="btn btn-fantasma flex-1 py-2.5">Cancelar</button>
              <button onClick={anular} disabled={reason.trim().length < 3} className="btn btn-primario flex-1 py-2.5">Anular pedido</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ============================ QR DE MESA ============================ */
function QrMesas() {
  const [origen, setOrigen] = useState("");
  const [n, setN] = useState(6);
  const [pngs, setPngs] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOrigen(window.location.origin), []);

  async function gen() {
    setBusy(true);
    try {
      const urls = Array.from({ length: n }, () => `${origen}/menu`);
      const out: string[] = [];
      for (const u of urls) {
        const res = await fetch(`/api/qr?text=${encodeURIComponent(u)}&size=280`);
        const d = await res.json();
        out.push(d.png);
      }
      setPngs(out);
    } finally { setBusy(false); }
  }

  return (
    <main className="p-4 md:p-6">
      <h1 className="font-display text-3xl font-black">QR para las mesas</h1>
      <p className="mt-1 text-[13px] text-white/50">El cliente escanea, concreta su pedido y pasa por caja. Imprime y pega en cada mesa.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-[12px] font-bold text-white/60">
          ¿Cuántos códigos?
          <input type="number" min={1} max={24} value={n} onChange={(e) => setN(Math.max(1, Math.min(24, Number(e.target.value || 1))))} className="campo mt-1 w-24 text-[#221a14]" />
        </label>
        <code className="rounded-lg bg-white/10 px-3 py-2 text-[12px] text-white/70">{origen}/menu</code>
        <button onClick={gen} disabled={busy || !origen} className="btn btn-mostaza gap-1.5 px-4 py-2.5 text-[13.5px]">
          {busy ? <LoaderCircle size={15} className="animate-spin" /> : <QrCode size={15} />} Generar {n} QR
        </button>
      </div>
      {pngs && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {pngs.map((p, i) => (
            <article key={i} className="rounded-3xl bg-[#fffcf6] p-3 text-center text-[#221a14]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt={`Mesa ${i + 1}`} className="w-full rounded-xl" />
              <a href={p} download={`mesa-${i + 1}.png`} className="btn btn-primario mt-2 w-full py-2 text-[12px]">Mesa {i + 1}</a>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function Spin() {
  return <div className="grid place-items-center py-16 text-white/40"><LoaderCircle className="animate-spin" size={26} /></div>;
}
void ShieldCheck; void BarChart3; void Trash2; void Grid2X2; void Boxes;
