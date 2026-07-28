import type { Metadata, Viewport } from "next";

// Configuración de la ventana gráfica (Viewport)
export const viewport: Viewport = {
  themeColor: "#000000", // Cambia esto al color principal de tu marca
  width: "device-width",
  initialScale: 1,
};

// Metadatos globales de la aplicación
export const metadata: Metadata = {
  title: {
    default: "Mi Aplicación",
    template: "%s | Mi Aplicación", // Ejemplo: "Dashboard | Mi Aplicación"
  },
  description: "Panel de control y gestión para usuarios.",

  // Favicons e Iconos de la App
  icons: {
    icon: [
      { url: "/favicon.png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/favicon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Open Graph (Vista previa al compartir en Facebook, WhatsApp, LinkedIn, etc.)
  openGraph: {
    title: "Mi Aplicación",
    description: "Panel de control y gestión para usuarios.",
    url: "https://asistencia-del-toro.vercel.app/",
    siteName: "Mi Aplicación",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "https://asistencia-del-toro.vercel.app/og-image.png", // Imagen de 1200x630px
        width: 1200,
        height: 630,
        alt: "Mi Aplicación",
      },
    ],
  },

  // Tarjeta para Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "Mi Aplicación",
    description: "Panel de control y gestión para usuarios.",
    images: ["https://asistencia-del-toro.vercel.app/og-image.png"],
  },

  // Robots / Indexación
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}