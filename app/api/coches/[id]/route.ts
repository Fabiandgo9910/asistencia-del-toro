import { NextRequest, NextResponse } from "next/server";
import {
  actualizarCoche,
  darSalida,
  revertirSalida,
  marcarSalidaTemporal,
  marcarRegreso,
  eliminarCoche,
  obtenerCoche,
} from "@/lib/db";
import { obtenerSesionActual } from "@/lib/sesion";
import { puedeGestionarCoches } from "@/lib/roles";

export const dynamic = "force-dynamic";

// PATCH /api/coches/:id
// Body admite varios modos:
//   { accion: "dar_salida", traslado: boolean, empresa_traslado?: string }
//   { accion: "revertir_salida" }  -> deshace una salida dada por error
//   { accion: "salida_temporal" }  -> excursión puntual (no es la salida definitiva)
//   { accion: "regreso", motivo?: string }  -> vuelve de la excursión
//   { ...camposLibres }  -> edición manual desde el expediente
//
// Reservado a admin/oficinista/super_admin: los choferes solo pueden dar de
// alta coches (POST /api/coches), no editarlos ni darles salida. La RLS de
// Supabase (ver supabase/migracion.sql) lo exige igualmente como segunda
// barrera, así que aunque se saltara esta comprobación la base lo rechaza.
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

  const body = await req.json();

  try {
    if (body.accion === "dar_salida") {
      await darSalida(id, {
        esTraslado: Boolean(body.traslado),
        empresaTraslado: body.empresa_traslado ?? null,
      });
    } else if (body.accion === "revertir_salida") {
      await revertirSalida(id);
    } else if (body.accion === "salida_temporal") {
      await marcarSalidaTemporal(id);
    } else if (body.accion === "regreso") {
      const motivo = typeof body.motivo === "string" && body.motivo.trim() ? body.motivo.trim() : null;
      await marcarRegreso(id, motivo);
    } else {
      const { accion, valor, ...campos } = body;
      if (typeof campos.matricula === "string") {
        campos.matricula = campos.matricula.toUpperCase();
      }
      await actualizarCoche(id, campos);
    }

    const coche = await obtenerCoche(id);
    return NextResponse.json({ coche });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al actualizar el registro", detalle: mensaje }, { status: 500 });
  }
}

// DELETE /api/coches/:id -> elimina el registro definitivamente
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

  try {
    await eliminarCoche(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al eliminar el registro", detalle: mensaje }, { status: 500 });
  }
}
