import { NextRequest, NextResponse } from "next/server";
import { buscarCoches, crearCoche } from "@/lib/db";
import { obtenerSesion, esChofer } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/coches?q=1234ABC  -> búsqueda en tiempo real por matrícula o expediente
// Cualquier usuario autenticado (incluidos los choferes) puede ver el listado.
export async function GET(req: NextRequest) {
  const sesion = obtenerSesion(req);
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const coches = await buscarCoches(q);
    return NextResponse.json({ coches });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al buscar coches", detalle: mensaje }, { status: 500 });
  }
}

// POST /api/coches -> registrar nueva entrada (modal de 1 clic)
// Los choferes SÍ pueden dar de alta coches, pero nunca pueden fijar la
// fecha de salida prevista (fecha_destino): se ignora si la mandan.
export async function POST(req: NextRequest) {
  const sesion = obtenerSesion(req);
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();

  if (!body.matricula || String(body.matricula).trim() === "") {
    return NextResponse.json({ error: "La matrícula es obligatoria" }, { status: 400 });
  }

  const chofer = esChofer(sesion.rol);

  try {
    const id = await crearCoche({
      plaza: body.plaza ?? null,
      fecha_entrada: body.fecha_entrada ?? new Date().toISOString().slice(0, 10),
      matricula: body.matricula,
      modelo: body.modelo ?? null,
      numero_expediente: body.numero_expediente ?? null,
      tiene_llave: Boolean(body.tiene_llave),
      esta_calcinado: Boolean(body.esta_calcinado),
      bloqueado: Boolean(body.bloqueado),
      // Un chofer nunca puede fijar la fecha de salida prevista, aunque
      // el cliente la mande: se ignora por completo en el servidor.
      fecha_destino: chofer ? null : body.fecha_destino || null,
      observaciones: body.observaciones ?? null,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al crear el registro", detalle: mensaje }, { status: 500 });
  }
}
