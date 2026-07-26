import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/roles";

export type Sesion = {
  id: string; // uuid de Supabase (auth.users.id)
  usuario: string;
  correo: string;
  rol: Rol;
};

// Punto único para saber "quién es y qué puede hacer" en Route Handlers y
// Server Components. Comprueba tanto que Supabase tenga una sesión válida
// como que nuestro propio gate de aprobación (`perfiles.aprobado`) esté en
// true — Supabase por sí solo no sabe nada de nuestra aprobación manual.
export async function obtenerSesionActual(): Promise<Sesion | null> {
  const supabase = createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return null;

  const { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .select("usuario, rol, aprobado")
    .eq("id", userData.user.id)
    .single();

  if (perfilError || !perfil || !perfil.aprobado) return null;

  return {
    id: userData.user.id,
    usuario: perfil.usuario,
    correo: userData.user.email ?? "",
    rol: perfil.rol as Rol,
  };
}
