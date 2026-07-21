import { NextRequest, NextResponse } from "next/server";
import { eliminarConsigna } from "@/lib/db";

export const dynamic = "force-dynamic";

// DELETE /api/consignas/:id -> elimina una consigna concreta (por si se apuntó por error)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  try {
    await eliminarConsigna(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al eliminar la consigna", detalle: mensaje }, { status: 500 });
  }
}
