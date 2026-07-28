import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { obtenerSesionActual } from "@/lib/sesion";

// Configuración de Metadatos y Favicon para esta página
export const metadata: Metadata = {
  title: "Dashboard | Mi Aplicación",
  description: "Panel de control y gestión para usuarios.",

  // Iconos y Favicon
  icons: {
    icon: [
      { url: "/favicon.png" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Vista previa en redes sociales (Open Graph / Twitter)
  openGraph: {
    title: "Dashboard | Mi Aplicación",
    description: "Panel de control y gestión para usuarios.",
    type: "website",
    images: [
      {
        url: "/og-image.png", // Ubicado en la carpeta /public
        width: 1200,
        height: 630,
        alt: "Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashboard | Mi Aplicación",
    description: "Panel de control y gestión para usuarios.",
    images: ["/og-image.png"],
  },
};

export default async function Page() {
  // El middleware ya garantiza que si llegamos aquí hay sesión válida y
  // aprobada, pero se comprueba también aquí por si acaso (defensa en
  // profundidad) en vez de inventar una sesión falsa.
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    redirect("/login");
  }

  return <Dashboard sesion={sesion} />;
}