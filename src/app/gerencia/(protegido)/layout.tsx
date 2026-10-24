import { leerSesion } from "@/lib/sesion";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/gerencia", t: "Resumen" },
  { href: "/gerencia/productos", t: "Productos" },
  { href: "/gerencia/categorias", t: "Categorías" },
  { href: "/gerencia/cajeros", t: "Cajeros" },
  { href: "/gerencia/pedidos", t: "Pedidos" },
  { href: "/gerencia/auditoria", t: "Auditoría" },
  { href: "/gerencia/configuracion", t: "Configuración" },
];

export default async function LayoutGerencia({ children }: { children: React.ReactNode }) {
  const s = await leerSesion();
  if (!s) redirect("/gerencia/entrar");
  if (s.rol !== "ADMIN") redirect("/panel");

  // Cargar configuración del restaurante
  let config = { logo: "", nombre: "La Paila", ubicacion: "", telefono: "" };
  try {
    const res = await fetch("/api/gerencia/configuracion", { cache: "no-store" });
    if (res.ok) config = await res.json();
  } catch (e) {
    console.error(e);
  }

  const nombreRestaurante = config.nombre || "La Paila";
  const logoRestaurante = config.logo ? `/api/gerencia/configuracion/logo?t=${Date.now()}` : "/placeholder-logo.svg";

  return (
    <div className="mx-auto max-w-4xl min-h-dvh px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-3">
          <img
            src={logoRestaurante}
            alt={nombreRestaurante}
            className="w-10 h-10 rounded object-contain"
            style={{ width: "40px", height: "40px" }}
          />
          <p className="brand text-xl leading-none">{nombreRestaurante}</p>
        </div>
        <nav className="flex-row-scroll flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="chip hover:border-[var(--brasa)] whitespace-nowrap">{t.t}</Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
