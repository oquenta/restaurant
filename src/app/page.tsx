import Image from "next/image";
import { KeyRound, MonitorDown, QrCode, Soup, Wine, CakeSlice, Printer, Banknote, BarChart3, Boxes } from "lucide-react";
export default function Home() {
  return (
    <main className="papel-dot min-h-dvh">
      <div className="mx-auto max-w-5xl px-5 pb-16">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <IllustrationLogo />
            <div>
              <p className="font-display text-2xl font-black leading-none text-[#221a14]">Mesa Fonda</p>
              <p className="text-xs font-semibold tracking-wide text-[#7c2430]">comida con fondo · pos</p>
            </div>
          </div>
          <a href="/menu" className="btn btn-primario px-5 py-2.5 text-sm">Probar el menú</a>
        </header>

        <section className="grid gap-6 pt-6 md:grid-cols-[1.15fr_.85fr]">
          <div>
            <h1 className="font-display text-5xl font-black leading-[1.02] text-[#47141c] md:text-6xl">
              Pide con el QR.
              <br />
              Caja cobra, cocina y barra imprimen.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#221a14]/75">
              El cliente escanea, arma su pedido y lo manda con un alias y su celular. Tiene
              <span className="font-bold text-[#7c2430]"> 30 minutos</span> para pasar por caja, o se anula solo.
              El cajero cobra en efectivo o QR, calcula el cambio y manda dos tickets: cocina y barra.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2 text-[12.5px] font-semibold text-[#1e4d3f]">
              <li className="rounded-full bg-white px-3 py-1.5 shadow-sm">Platos · Bebidas · Postres</li>
              <li className="rounded-full bg-white px-3 py-1.5 shadow-sm">Efectivo con cambio exacto</li>
              <li className="rounded-full bg-white px-3 py-1.5 shadow-sm">Stock con reporte de ingresos</li>
              <li className="rounded-full bg-white px-3 py-1.5 shadow-sm">Todo con justificación</li>
            </ul>
          </div>
          <div className="tarjeta p-6">
            <h2 className="font-display text-xl font-bold text-[#47141c]">Entrar como</h2>
            <div className="mt-4 grid gap-3">
              <Entry href="/menu" icon={<QrCode size={18} />} title="Cliente con QR" desc="Carta, carrito y envío a caja — sin instalar nada." />
              <Entry href="/cajero/login" icon={<KeyRound size={18} />} title="Cajero" desc="cajero1 / cajero123" />
              <Entry href="/admin/login" icon={<MonitorDown size={18} />} title="Administrador" desc="admin / admin123" />
            </div>
            <div className="mt-5 rounded-2xl border border-[#1e4d3f]/15 bg-[#1e4d3f]/5 p-4 text-[12.5px] leading-relaxed text-[#1e4d3f]">
              <b>Modo demo activo:</b> si no defines <code>DATABASE_URL</code>, el sistema corre con
              PostgreSQL en memoria (pg-mem). Para producción ejecuta <code>npm run setup-db</code>.
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Flow icon={<Soup size={20} />} title="Cocina imprime" list={["Ticket solo de platos y postres", "Código, alias y hora"]} />
          <Flow icon={<Wine size={20} />} title="Barra imprime" list={["Ticket solo de bebidas", "Sin cross-contaminar el trabajo"]} />
          <Flow icon={<Printer size={20} />} title="Dos tickets, un pago" list={["Efectivo con monto y cambio", "QR directo, local o para llevar"]} />
        </section>

        <section className="mt-10 rounded-3xl bg-[#122e26] p-7 text-white">
          <h2 className="font-display text-2xl font-bold">Cobertura funcional</h2>
          <div className="mt-4 grid gap-6 text-[13.5px] sm:grid-cols-4">
            <Feature icon={<Banknote size={18} />} k="Cajero" v="Busca por alias o celular, modifica o elimina siempre con motivo, cobra y reporta." />
            <Feature icon={<BarChart3 size={18} />} k="Reportes" v="Ventas por hora del día, top platos y bebidas, expiración pendiente." />
            <Feature icon={<Boxes size={18} />} k="Stock" v="+5/+10/+50, umbral de alerta, historial con fecha de cada ingreso." />
            <Feature icon={<CakeSlice size={18} />} k="Admin" v="Categorías, productos con foto, cajeros, anular pagado con motivo." />
          </div>
        </section>
      </div>
    </main>
  );
}

function Entry(props: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <a href={props.href} className="group flex items-center gap-3 rounded-2xl border border-[#221a14]/10 px-4 py-3 transition hover:border-[#7c2430]/40 hover:bg-[#7c2430]/5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#7c2430]/10 text-[#7c2430] group-hover:bg-[#7c2430] group-hover:text-white">{props.icon}</span>
      <span>
        <span className="block font-bold text-[#221a14]">{props.title}</span>
        <span className="block text-[12.5px] text-[#221a14]/60">{props.desc}</span>
      </span>
    </a>
  );
}

function Flow(props: { icon: React.ReactNode; title: string; list: string[] }) {
  return (
    <div className="tarjeta p-5">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e7a93c]/20 text-[#7c2430]">{props.icon}</span>
      <h3 className="mt-3 font-display text-lg font-bold text-[#47141c]">{props.title}</h3>
      <ul className="mt-2 list-inside list-[square] text-[13px] text-[#221a14]/70">
        {props.list.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </div>
  );
}

function Feature(props: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-bold text-[#e7a93c]">
        {props.icon} {props.k}
      </p>
      <p className="mt-1.5 text-white/70 leading-relaxed">{props.v}</p>
    </div>
  );
}

function IllustrationLogo() {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7c2430] text-white font-display text-xl font-black shadow-md">
      MF
    </span>
  );
}
