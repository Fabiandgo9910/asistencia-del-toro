import { NextRequest, NextResponse } from "next/server";
import { crearConsigna, obtenerConsignas } from "@/lib/db";
import { obtenerSesion, puedeGestionarCoches } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/coches/:id/consignas -> historial de consignas de ese coche
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = obtenerSesion(req);
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const cocheId = Number(params.id);
  if (Number.isNaN(cocheId)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  try {
    const consignas = await obtenerConsignas(cocheId);
    return NextResponse.json({ consignas });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al listar consignas", detalle: mensaje }, { status: 500 });
  }
}

// POST /api/coches/:id/consignas -> añade una nueva consigna (fecha + observación)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = obtenerSesion(req);
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!puedeGestionarCoches(sesion.rol)) {
    return NextResponse.json({ error: "No tienes permiso para hacer esto" }, { status: 403 });
  }
  const cocheId = Number(params.id);
  if (Number.isNaN(cocheId)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  const body = await req.json();
  const fecha = body.fecha || new Date().toISOString().slice(0, 10);

  try {
    const id = await crearConsigna(cocheId, fecha, body.observacion || null);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al guardar la consigna", detalle: mensaje }, { status: 500 });
  }
}
