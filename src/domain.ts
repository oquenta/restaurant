const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const EXPIRY_MINUTES = 30;

export function minutesTill(target: string | Date): number {
  const t = new Date(target).getTime();
  return Math.max(0, Math.round((t - Date.now()) / 60000));
}

export function money(v: unknown): string {
  const cookie = "S/ ";
  const n = Number(v || 0);
  return (
    cookie +
    n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function hour(v: string | Date): string {
  const d = new Date(v);
  return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function dayLabel(v: string | Date): string {
  const d = new Date(v);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

export function makeCode(): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export const STATUS_LABEL: Record<string, string> = {
  pendiente: "En caja",
  pagado: "Pagado",
  expirado: "Expirado (30 min)",
  eliminado: "Eliminado",
  anulado: "Anulado",
};
