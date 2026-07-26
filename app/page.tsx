import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { obtenerSesionActual } from "@/lib/sesion";

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
