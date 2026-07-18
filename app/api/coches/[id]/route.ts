import { NextRequest, NextResponse } from "next/server";
import { actualizarCoche, actualizarPresencia, darSalida, obtenerCoche } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/coches/:id
// Body admite tres modos, pensados para acciones de 1 clic desde la lista:
//   { accion: "dar_salida" }
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
      await darSalida(id);
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
    return NextResponse.json({ error: "Error al actualizar el registro" }, { status: 500 });
  }
}
