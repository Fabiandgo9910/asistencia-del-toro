import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ROLES_SOLICITABLES = ["admin", "oficinista", "chofer"];

// POST /api/auth/registro  { usuario, correo, password, rolSolicitado }
//
// IMPORTANTE: esto NO usa supabase.auth.signUp() desde el navegador. Ese
// método deja al usuario con el correo sin confirmar hasta que hace clic
// en un enlace que Supabase manda por email — y sin SMTP propio configurado
// ese correo puede tardar, no llegar, o ir a spam. El resultado era que,
// aunque un super_admin aprobara la cuenta (aprobado = true en `perfiles`),
// el login seguía fallando con "Email not confirmed".
//
// Al crear la cuenta aquí, en el servidor, con la Admin API y
// `email_confirm: true`, ese problema desaparece de raíz: el único gate
// para entrar pasa a ser nuestra propia aprobación manual, no un correo
// que puede no llegar nunca.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const usuario = String(body?.usuario ?? "").trim();
  const correo = String(body?.correo ?? "").trim();
  const password = String(body?.password ?? "");
  const rolSolicitado = ROLES_SOLICITABLES.includes(body?.rolSolicitado) ? body.rolSolicitado : "chofer";

  if (!usuario || !correo || !password) {
    return NextResponse.json({ error: "Usuario, correo y contraseña son obligatorios" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(correo)) {
    return NextResponse.json({ error: "El correo no es válido" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Username único (el correo lo valida Supabase Auth solo al crear).
    const { data: choque } = await admin
      .from("perfiles")
      .select("id")
      .ilike("usuario", usuario)
      .maybeSingle();
    if (choque) {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
    }

    // El trigger on_auth_user_created (ver supabase/migracion.sql) lee
    // estos metadatos y crea la fila de perfil con aprobado = false.
    const { error } = await admin.auth.admin.createUser({
      email: correo,
      password,
      email_confirm: true,
      user_metadata: { usuario, rol_solicitado: rolSolicitado },
    });

    if (error) {
      const yaExiste = /already been registered|already exists/i.test(error.message);
      return NextResponse.json(
        { error: yaExiste ? "Ya existe una cuenta con ese correo." : error.message },
        { status: yaExiste ? 409 : 500 }
      );
    }

    return NextResponse.json(
      { ok: true, mensaje: "Solicitud enviada. Un administrador debe aprobar tu cuenta." },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al registrar la solicitud", detalle: mensaje }, { status: 500 });
  }
}
