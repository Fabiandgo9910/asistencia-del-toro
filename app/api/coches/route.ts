import { NextRequest, NextResponse } from "next/server";
import { buscarCoches, crearCoche } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/coches?q=1234ABC  -> búsqueda en tiempo real por matrícula o expediente
export async function GET(req: NextRequest) {
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
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.matricula || String(body.matricula).trim() === "") {
    return NextResponse.json({ error: "La matrícula es obligatoria" }, { status: 400 });
  }

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
      fecha_destino: body.fecha_destino || null,
      observaciones: body.observaciones ?? null,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al crear el registro", detalle: mensaje }, { status: 500 });
  }
}
