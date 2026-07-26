import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerSesionActual } from "@/lib/sesion";
import { puedeGestionarUsuarios } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET /api/admin/usuarios -> lista completa (pendientes + activos)
// Se lee directamente de `perfiles` con la service role key (se salta la
// RLS a propósito: la política de esa tabla solo deja ver la fila propia,
// por diseño, así que un listado completo solo puede hacerlo el server
// tras comprobar aquí mismo que quien pregunta es super_admin).
export async function GET() {
  const sesion = await obtenerSesionActual();
  if (!sesion || !puedeGestionarUsuarios(sesion.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("perfiles")
      .select("id, usuario, correo, rol, aprobado, creado_en")
      .order("aprobado", { ascending: true })
      .order("creado_en", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ usuarios: data ?? [] });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al listar usuarios", detalle: mensaje }, { status: 500 });
  }
}
