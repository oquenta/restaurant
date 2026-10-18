import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mesa Fonda · POS de restaurante",
  description:
    "Carta con QR, pedidos a la caja, cobro con efectivo o QR, tickets de cocina y barra, inventario y reportes.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#47141c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-[#f7f1e6] antialiased">{children}</body>
    </html>
  );
}
