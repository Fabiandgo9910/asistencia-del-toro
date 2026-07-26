import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerSesionActual } from "@/lib/sesion";
import { puedeGestionarUsuarios, ROLES_VALIDOS, type Rol } from "@/lib/roles";

export const dynamic = "force-dynamic";

// PATCH /api/admin/usuarios/:id
//   { accion: "aprobar", rol }
//   { accion: "rol", rol }
//   { accion: "editar", usuario?, correo? }
//   { accion: "reset_password", nuevaPassword }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await obtenerSesionActual();
  if (!sesion || !puedeGestionarUsuarios(sesion.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.accion) {
    return NextResponse.json({ error: "Falta la acción" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    const { data: objetivo } = await admin
      .from("perfiles")
      .select("id, usuario, correo")
      .eq("id", id)
      .maybeSingle();
    if (!objetivo) {
      return NextResponse.json({ error: "Ese usuario no existe" }, { status: 404 });
    }

    if (body.accion === "aprobar") {
      const rol: Rol = ROLES_VALIDOS.includes(body?.rol) ? body.rol : "chofer";
      const { error } = await admin.from("perfiles").update({ rol, aprobado: true }).eq("id", id);
      if (error) throw new Error(error.message);

      // Por si el registro se hizo antes de este arreglo (o el correo de
      // confirmación de Supabase nunca llegó): al aprobar se confirma el
      // correo también a la fuerza, para que el login nunca se quede
      // bloqueado por esto aunque el perfil ya diga aprobado = true.
      await admin.auth.admin.updateUserById(id, { email_confirm: true });
    } else if (body.accion === "rol") {
      // Un super_admin no puede quitarse a sí mismo el rol desde aquí:
      // evita quedarse bloqueado por error si es el único super_admin.
      if (id === sesion.id) {
        return NextResponse.json(
          { error: "No puedes cambiar tu propio rol desde aquí." },
          { status: 400 }
        );
      }
      const rol: Rol = ROLES_VALIDOS.includes(body?.rol) ? body.rol : "chofer";
      const { error } = await admin.from("perfiles").update({ rol }).eq("id", id);
      if (error) throw new Error(error.message);
    } else if (body.accion === "editar") {
      const usuario = typeof body.usuario === "string" ? body.usuario.trim() : undefined;
      const correo = typeof body.correo === "string" ? body.correo.trim() : undefined;

      if (usuario === "" || correo === "") {
        return NextResponse.json(
          { error: "El usuario y el correo no pueden quedar vacíos" },
          { status: 400 }
        );
      }
      if (correo && !/^\S+@\S+\.\S+$/.test(correo)) {
        return NextResponse.json({ error: "El correo no es válido" }, { status: 400 });
      }

      // Comprobar que el nuevo usuario no choque con otra cuenta (el
      // correo lo valida Supabase Auth solo al cambiarlo más abajo).
      if (usuario && usuario.toLowerCase() !== objetivo.usuario.toLowerCase()) {
        const { data: choque } = await admin
          .from("perfiles")
          .select("id")
          .ilike("usuario", usuario)
          .neq("id", id)
          .maybeSingle();
        if (choque) {
          return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
        }
      }

      // El correo vive en dos sitios: hay que mantenerlos sincronizados.
      if (correo && correo.toLowerCase() !== objetivo.correo.toLowerCase()) {
        const { error: errorCorreo } = await admin.auth.admin.updateUserById(id, { email: correo });
        if (errorCorreo) {
          const yaExiste = /already been registered|already exists/i.test(errorCorreo.message);
          return NextResponse.json(
            { error: yaExiste ? "Ese correo ya está en uso" : errorCorreo.message },
            { status: yaExiste ? 409 : 500 }
          );
        }
      }

      const { error } = await admin
        .from("perfiles")
        .update({ ...(usuario ? { usuario } : {}), ...(correo ? { correo } : {}) })
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else if (body.accion === "reset_password") {
      const nuevaPassword = String(body.nuevaPassword ?? "");
      if (nuevaPassword.length < 6) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 6 caracteres" },
          { status: 400 }
        );
      }
      const { error } = await admin.auth.admin.updateUserById(id, { password: nuevaPassword });
      if (error) throw new Error(error.message);
    } else {
      return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
    }

    const { data: actualizado } = await admin
      .from("perfiles")
      .select("id, usuario, correo, rol, aprobado")
      .eq("id", id)
      .maybeSingle();
    return NextResponse.json({ usuario: actualizado });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al actualizar el usuario", detalle: mensaje }, { status: 500 });
  }
}

// DELETE /api/admin/usuarios/:id -> rechaza una solicitud o da de baja a un usuario
// Borra el usuario de Supabase Auth; su fila en `perfiles` desaparece sola
// por el ON DELETE CASCADE definido en supabase/migracion.sql.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await obtenerSesionActual();
  if (!sesion || !puedeGestionarUsuarios(sesion.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }
  if (id === sesion.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al eliminar el usuario", detalle: mensaje }, { status: 500 });
  }
}
