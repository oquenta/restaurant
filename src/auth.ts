import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const NAME = "pos_session";
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "mesa-fonda-secret-dev");

export type Session = { uid: number; role: "admin" | "cajero"; name: string };

export async function sign(s: Session): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function setCookie(s: Session): Promise<void> {
  const jar = await cookies();
  jar.set(NAME, await sign(s), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function clearCookie(): Promise<void> {
  (await cookies()).set(NAME, "", { path: "/", maxAge: 0 });
}

async function tokenPayload(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(NAME)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function current(): Promise<Session | null> {
  return tokenPayload();
}

export namespace auth {
  export function is(s: Session | null, want: Session["role"]): boolean {
    return !!s && s.role === want;
  }
  export async function me(): Promise<Session | null> {
    return tokenPayload();
  }
}

export const fullName = (s?: Session | null) => s?.name || "caja";

export const fullNameOf = (u: { first_name?: string; last_name?: string }) =>
  `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();

export async function requireRole(_req: NextRequest, want: "admin" | "cajero"): Promise<Session | null> {
  const s = await tokenPayload();
  if (!s) return null;
  if (want === "cajero") return s.role === "admin" || s.role === "cajero" ? s : null;
  return s.role === "admin" ? s : null;
}
