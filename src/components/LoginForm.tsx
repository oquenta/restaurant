"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Fingerprint } from "lucide-react";

export default function LoginForm({ role }: { role: "admin" | "cajero" }) {
  const r = useRouter();
  const [username, setUser] = useState(role === "admin" ? "admin" : "cajero1");
  const [password, setPass] = useState(role === "admin" ? "admin123" : "cajero123");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de acceso");
      r.push(role === "admin" ? "/admin" : "/cajero");
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-[#122e26] p-5">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <span className={`inline-grid h-14 w-14 place-items-center rounded-2xl ${role === "admin" ? "bg-[#e7a93c] text-[#122e26]" : "bg-[#7c2430] text-white"} shadow-lg`}>
            {role === "admin" ? <Fingerprint size={26} /> : <KeyRound size={26} />}
          </span>
          <h1 className="mt-3 font-display text-3xl font-black text-white">
            {role === "admin" ? "Administración" : "Caja"}
          </h1>
          <p className="mt-1 text-sm text-white/60">Mesa Fonda · punto de venta</p>
        </div>
        <form onSubmit={submit} className="tarjeta space-y-4 p-7">
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-[#221a14]/70">Usuario</span>
            <input className="campo" value={username} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-bold text-[#221a14]/70">Contraseña</span>
            <input className="campo" type="password" value={password} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          </label>
          {err && <p className="rounded-xl bg-[#7c2430]/10 px-4 py-3 text-[13px] font-semibold text-[#7c2430]">{err}</p>}
          <button className="btn btn-primario w-full py-3 text-[15px]" disabled={busy}>
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : "Ingresar"}
          </button>
          <p className="text-center text-[12px] text-[#221a14]/45">
            {role === "admin" ? "Gestiona menú, cajeros, stock y anulación de pedidos." : "Cobra pedidos, imprime tickets y consulta reportes."}
          </p>
        </form>
      </div>
    </div>
  );
}
