import type { Metadata, Viewport } from "next";
import "./globals.css";

// Configuración de viewport (separada en Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Asistencia del Toro",
    template: "%s | Asistencia del Toro",
  },
  description: "Gestión interna de vehículos en depósito",
  keywords: ["gestión de vehículos", "depósito", "asistencia", "control interno"],
  authors: [{ name: "Asistencia del Toro" }],

  // Configuración de Favicon e Íconos
  icons: {
    icon: [
      { url: "/favicon.png" }, // Favicon estándar
      { url: "/favicon.png", type: "image/png" }, // Icono PNG moderno (32x32)
    ],
    apple: [
      { url: "/favicon.png", sizes: "180x180", type: "image/png" }, // Para iPhone / iPad
    ],
  },

  // Open Graph (Para compartir en WhatsApp, LinkedIn, Facebook, etc.)
  openGraph: {
    title: "Asistencia del Toro",
    description: "Gestión interna de vehículos en depósito",
    url: "https://asistencia-del-toro.vercel.app/",
    siteName: "Asistencia del Toro",
    images: [
      {
        url: "/favicon.png", // Imagen de vista previa (1200x630px recomendada)
        width: 1200,
        height: 630,
        alt: "Asistencia del Toro - Gestión de vehículos",
      },
    ],
    locale: "es_ES",
    type: "website",
  },

  // Configuración para Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "Asistencia del Toro",
    description: "Gestión interna de vehículos en depósito",
    images: ["/favicon.png"],
  },

  // Configuración para motores de búsqueda (Indexación)
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}