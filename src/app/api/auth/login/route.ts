import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { setCookie, clearCookie } from "@/auth";
import { q, toNum } from "@/db";
import bcrypt from "bcryptjs";

type U = { id: number; role: string; first_name: string; last_name: string; username: string; password_hash: string; active: boolean };

export async function POST(req: NextRequest) {
  const b = await body<{ role?: string; username?: string; password?: string }>(req);
  const role = b.role === "admin" ? "admin" : "cajero";
  const username = (b.username || "").trim().toLowerCase();
  const password = b.password || "";
  if (!username || !password) return bad("Completa usuario y contraseña.");
  const rows = (await q("SELECT * FROM users WHERE username=$1 AND role=$2 AND active", [username, role])) as Array<Record<string, unknown>>;
  if (!rows.length) return bad("Credenciales inválidas.", 401);
  const u = rows[0] as unknown as U;
  const ok = bcrypt.compareSync(password, u.password_hash);
  if (!ok) return bad("Credenciales inválidas.", 401);
  await setCookie({ uid: toNum(u.id), role: role as "admin" | "cajero", name: `${u.first_name} ${u.last_name}` });
  return NextResponse.json({ ok: true, name: `${u.first_name} ${u.last_name}`, role });
}

export async function DELETE() {
  await clearCookie();
  return NextResponse.json({ ok: true });
}
