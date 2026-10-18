import { NextRequest, NextResponse } from "next/server";
import { bad } from "@/util";

/** Genera el código QR (PNG en base64) para que el cliente entre al menú escaneando. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") || "").trim();
  const size = Math.min(1024, Math.max(120, Number(searchParams.get("size") || 256)));
  if (text.length < 3) return bad("Texto requerido.");
  try {
    const QRCode = (await import("qrcode")).default ?? (await import("qrcode"));
    const dataUrl = await QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: "M" });
    return NextResponse.json({ png: dataUrl });
  } catch (e) {
    return bad("No se pudo generar el QR.", 500);
  }
}
