import { cookies } from "next/headers";
import Dashboard from "@/components/Dashboard";
import { leerTokenSesion, NOMBRE_COOKIE } from "@/lib/auth";

export default async function Page() {
  const sesion = await leerTokenSesion(cookies().get(NOMBRE_COOKIE)?.value);
  // El middleware ya garantiza que si llegamos aquí hay sesión válida,
  // pero por tipos dejamos un valor por defecto imposible en la práctica.
  return <Dashboard sesion={sesion ?? { id: 0, usuario: "", rol: "chofer" }} />;
}
