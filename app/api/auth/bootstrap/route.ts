import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST /api/auth/bootstrap  { usuario, correo, password }
// Cabecera obligatoria: x-setup-secret: <SETUP_SECRET del .env>
//
// Crea la ÚNICA cuenta super_admin inicial usando la Admin API de
// Supabase (crea el usuario ya con el correo confirmado, sin pasar por el
// formulario público) y deja su perfil con rol = 'super_admin' y
// aprobado = true. Nadie puede registrarse como super_admin desde
// /registro por diseño — es quien aprueba al resto — así que la primera
// vez hay que crearla con este endpoint.
//
// Se autobloquea en cuanto exista un super_admin en `perfiles`, aunque se
// conozca SETUP_SECRET, así que solo funciona la primera vez.
export async function POST(req: NextRequest) {
  const secretoEsperado = process.env.SETUP_SECRET;
  if (!secretoEsperado) {
    return NextResponse.json(
      { error: "Define SETUP_SECRET en las variables de entorno para poder usar este endpoint." },
      { status: 500 }
    );
  }
  if (req.headers.get("x-setup-secret") !== secretoEsperado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { data: existente } = await admin.from("perfiles").select("id").eq("rol", "super_admin").limit(1);
    if (existente && existente.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un super_admin. Este endpoint está bloqueado." },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => null);
    const usuario = String(body?.usuario ?? "").trim();
    const correo = String(body?.correo ?? "").trim();
    const password = String(body?.password ?? "");

    if (!usuario || !correo || !password || password.length < 6) {
      return NextResponse.json(
        { error: "usuario, correo y password (mín. 6 caracteres) son obligatorios" },
        { status: 400 }
      );
    }

    const { data: creado, error: errorCrear } = await admin.auth.admin.createUser({
      email: correo,
      password,
      email_confirm: true,
      user_metadata: { usuario, rol_solicitado: "chofer" },
    });

    if (errorCrear || !creado?.user) {
      return NextResponse.json(
        { error: "No se pudo crear el usuario", detalle: errorCrear?.message },
        { status: 500 }
      );
    }

    // El trigger on_auth_user_created ya habrá creado el perfil con rol
    // 'chofer' y aprobado=false; se corrige aquí a super_admin/aprobado.
    const { error: errorPerfil } = await admin
      .from("perfiles")
      .update({ rol: "super_admin", aprobado: true })
      .eq("id", creado.user.id);

    if (errorPerfil) {
      return NextResponse.json(
        { error: "Usuario creado pero no se pudo marcar como super_admin", detalle: errorPerfil.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: creado.user.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al crear el super_admin", detalle: mensaje }, { status: 500 });
  }
}
