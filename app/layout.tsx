import type { Metadata, Viewport } from "next";
import "./globals.css";

// Configuración de la vista gráfica para dispositivos móviles y el color corporativo
export const viewport: Viewport = {
  themeColor: "#DC2626", // Rojo corporativo (Tailwind red-600)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Asistencia del Toro | Gestión de Vehículos",
    template: "%s | Asistencia del Toro",
  },
  description: "Sistema interno de control, gestión de entradas, salidas y auditoría rápida de vehículos en depósito de Asistencia del Toro.",
  keywords: ["Asistencia del Toro", "gestión de vehículos", "depósito de coches", "control de custodia", "asistencia en carretera"],
  authors: [{ name: "Asistencia del Toro" }],

  // Favicon e iconos para distintas plataformas
  icons: {
    icon: [
      { url: "/favicon.png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/favicon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Open Graph para cuando se comparta el enlace de la aplicación internamente
  openGraph: {
    title: "Asistencia del Toro - Control de Depósito",
    description: "Gestión interna ultra-rápida de entradas, salidas y custodia de vehículos.",
    url: "https://asistencia-del-toro.vercel.app",
    siteName: "Asistencia del Toro",
    locale: "es_ES",
    type: "website",
  },

  // Control de indexación (útil si es un sistema puramente interno)
  robots: {
    index: false, // Evita que buscadores públicos como Google indexen el panel interno
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased bg-gray-50 text-gray-900 selection:bg-red-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}