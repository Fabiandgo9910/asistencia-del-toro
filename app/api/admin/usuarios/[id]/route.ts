import { NextRequest, NextResponse } from "next/server";
import { aprobarUsuario, cambiarRolUsuario, eliminarUsuario, obtenerUsuarioPorId } from "@/lib/db";
import { obtenerSesion, puedeGestionarUsuarios, type Rol } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLES_VALIDOS: Rol[] = ["super_admin", "admin", "oficinista", "chofer"];

// PATCH /api/admin/usuarios/:id  { accion: "aprobar", rol } | { accion: "rol", rol }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = obtenerSesion(req);
  if (!sesion || !puedeGestionarUsuarios(sesion.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const rol: Rol = ROLES_VALIDOS.includes(body?.rol) ? body.rol : "chofer";

  try {
    if (body?.accion === "aprobar") {
      await aprobarUsuario(id, rol);
    } else if (body?.accion === "rol") {
      await cambiarRolUsuario(id, rol);
    } else {
      return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
    }
    const usuario = await obtenerUsuarioPorId(id);
    return NextResponse.json({
      usuario: usuario && {
        id: usuario.id,
        usuario: usuario.usuario,
        correo: usuario.correo,
        rol: usuario.rol,
        aprobado: usuario.aprobado,
      },
    });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al actualizar el usuario", detalle: mensaje }, { status: 500 });
  }
}

// DELETE /api/admin/usuarios/:id -> rechaza una solicitud o da de baja a un usuario
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = obtenerSesion(req);
  if (!sesion || !puedeGestionarUsuarios(sesion.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  if (id === sesion.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }
  try {
    await eliminarUsuario(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al eliminar el usuario", detalle: mensaje }, { status: 500 });
  }
}
