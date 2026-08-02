import { NextRequest, NextResponse } from "next/server";
import { listarBases, crearBase } from "@/lib/db";
import { obtenerSesionActual } from "@/lib/sesion";
import { puedeGestionarCoches } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET /api/bases -> listado completo, para el desplegable de las bases.
// Cualquier usuario autenticado y aprobado puede verlo (incluidos choferes,
// para saber en qué base están dando de alta un coche).
export async function GET() {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  try {
    const bases = await listarBases();
    return NextResponse.json({ bases });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al listar bases", detalle: mensaje }, { status: 500 });
  }
}

// POST /api/bases  { numero, nombre, direccion? } -> crear una base nueva.
// Reservado a admin/oficinista/super_admin, igual que crear/editar coches.
export async function POST(req: NextRequest) {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!puedeGestionarCoches(sesion.rol)) {
    return NextResponse.json({ error: "No tienes permiso para hacer esto" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const numero = String(body?.numero ?? "").trim();
  const nombre = String(body?.nombre ?? "").trim();
  const direccion = typeof body?.direccion === "string" ? body.direccion.trim() : "";

  if (!numero || !nombre) {
    return NextResponse.json({ error: "El número y el nombre de la base son obligatorios" }, { status: 400 });
  }

  try {
    const base = await crearBase({ numero, nombre, direccion: direccion || null });
    return NextResponse.json({ base }, { status: 201 });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    const duplicado = /duplicate key|unique constraint/i.test(mensaje);
    return NextResponse.json(
      { error: duplicado ? "Ya existe una base con ese número" : "Error al crear la base", detalle: mensaje },
      { status: duplicado ? 409 : 500 }
    );
  }
}
