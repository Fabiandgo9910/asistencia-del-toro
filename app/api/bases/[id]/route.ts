import { NextRequest, NextResponse } from "next/server";
import { marcarBaseRevisada } from "@/lib/db";
import { obtenerSesionActual } from "@/lib/sesion";
import { puedeGestionarCoches } from "@/lib/roles";

export const dynamic = "force-dynamic";

// PATCH /api/bases/:id  { accion: "marcar_revisada" }
// Reservado a admin/oficinista/super_admin, igual que crear/editar bases.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!puedeGestionarCoches(sesion.rol)) {
    return NextResponse.json({ error: "No tienes permiso para hacer esto" }, { status: 403 });
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (body?.accion !== "marcar_revisada") {
    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  }

  try {
    const base = await marcarBaseRevisada(id);
    return NextResponse.json({ base });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al marcar la base como revisada", detalle: mensaje }, { status: 500 });
  }
}
