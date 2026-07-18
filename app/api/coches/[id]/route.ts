import { NextRequest, NextResponse } from "next/server";
import {
  actualizarCoche,
  actualizarPresencia,
  darSalida,
  eliminarCoche,
  obtenerCoche,
} from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/coches/:id
// Body admite tres modos:
//   { accion: "dar_salida", traslado: boolean, empresa_traslado?: string }
//   { accion: "presencia", valor: true|false }
//   { ...camposLibres }  -> edición manual desde el expediente
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
    } else if (body.accion === "presencia") {
      await actualizarPresencia(id, Boolean(body.valor));
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
