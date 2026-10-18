import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { current } from "@/auth";
import { q, toNum } from "@/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const rows = (await q(
    "SELECT id, first_name, last_name, username, active, created_at FROM users WHERE role='cajero' ORDER BY id"
  )) as Array<Record<string, unknown>>;
  return NextResponse.json({
    cajeros: rows.map((r) => ({
      id: toNum(r.id), first_name: String(r.first_name), last_name: String(r.last_name),
      username: String(r.username), active: !!r.active, created_at: r.created_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const b = await body<{ first_name?: string; last_name?: string; username?: string; password?: string }>(req);
  const fn = (b.first_name || "").trim();
  const ln = (b.last_name || "").trim();
  const un = (b.username || "").trim().toLowerCase();
  const pw = b.password || "";
  if (fn.length < 2 || ln.length < 2) return bad("Nombres y apellidos obligatorios.");
  if (!/^[a-z0-9_.-]{3,20}$/.test(un)) return bad("Usuario: entre 3 y 20 caracteres (letras, números, . _ -).");
  if (pw.length < 6) return bad("La contraseña debe tener al menos 6 caracteres.");
  try {
    const r = (await q(
      "INSERT INTO users(role,first_name,last_name,username,password_hash) VALUES('cajero',$1,$2,$3,$4) RETURNING id, first_name, last_name, username, active, created_at",
      [fn, ln, un, bcrypt.hashSync(pw, 10)]
    )) as Array<Record<string, unknown>>;
    return NextResponse.json({ cajero: r[0] }, { status: 201 });
  } catch {
    return bad("Ese nombre de usuario ya existe.");
  }
}
