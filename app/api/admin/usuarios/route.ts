import { NextRequest, NextResponse } from "next/server";
import { listarUsuarios } from "@/lib/db";
import { obtenerSesion, puedeGestionarUsuarios } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sesion = await obtenerSesion(req);
  if (!sesion || !puedeGestionarUsuarios(sesion.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  try {
    const usuarios = await listarUsuarios();
    return NextResponse.json({ usuarios });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al listar usuarios", detalle: mensaje }, { status: 500 });
  }
}
