import { NextRequest, NextResponse } from "next/server";
import { body, bad } from "@/util";
import { current } from "@/auth";
import { q, toNum } from "@/db";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await current();
  if (!s || s.role !== "admin") return bad("Solo el administrador.", 403);
  const { id } = await ctx.params;
  const b = await body<{ active?: boolean; password?: string }>(req);
  const r = (await q(
    `UPDATE users SET
     active = COALESCE($2, active),
     password_hash = COALESCE($3, password_hash)
     WHERE id=$1 AND role='cajero' RETURNING id, first_name, last_name, username, active, created_at`,
    [Number(id), b.active == null ? null : !!b.active, b.password ? bcrypt.hashSync(b.password, 10) : null]
  )) as Array<Record<string, unknown>>;
  if (!r.length) return bad("Cajero no encontrado.", 404);
  return NextResponse.json({ cajero: r[0] });
}
