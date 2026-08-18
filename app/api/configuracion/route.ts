import { NextRequest, NextResponse } from "next/server";
import { obtenerConfiguracion, actualizarConfiguracion } from "@/lib/db";
import { obtenerSesionActual } from "@/lib/sesion";
import { puedeGestionarCoches } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET /api/configuracion -> { revision_semanal_activada }
// Cualquier usuario autenticado y aprobado puede verlo (necesita saber si
// debe mostrar el aviso), pero no editarlo.
export async function GET() {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  try {
    const configuracion = await obtenerConfiguracion();
    return NextResponse.json(configuracion);
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al leer la configuración", detalle: mensaje }, { status: 500 });
  }
}

// PATCH /api/configuracion  { revision_semanal_activada: boolean }
// Reservado a admin/oficinista/super_admin.
export async function PATCH(req: NextRequest) {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!puedeGestionarCoches(sesion.rol)) {
    return NextResponse.json({ error: "No tienes permiso para hacer esto" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.revision_semanal_activada !== "boolean") {
    return NextResponse.json({ error: "Falta revision_semanal_activada (booleano)" }, { status: 400 });
  }

  try {
    await actualizarConfiguracion(body.revision_semanal_activada);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al actualizar la configuración", detalle: mensaje }, { status: 500 });
  }
}
