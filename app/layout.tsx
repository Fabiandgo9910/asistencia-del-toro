import type { Metadata } from "next";

import "./globals.css";

const inter = { variable: "" };

export const metadata: Metadata = {
  title: "Asistencia del Toro",
  description: "Gestión interna de vehículos en depósito",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
