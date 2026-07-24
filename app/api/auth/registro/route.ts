import { NextRequest, NextResponse } from "next/server";
import { crearUsuario, obtenerUsuarioPorLogin } from "@/lib/db";
import { hashPassword, type Rol } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLES_SOLICITABLES: Rol[] = ["admin", "oficinista", "chofer"];

// POST /api/auth/registro  { usuario, correo, password, rolSolicitado }
// Crea la cuenta como NO aprobada. Un super_admin debe aprobarla desde
// /admin/usuarios antes de que pueda iniciar sesión.
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
    const existente = await obtenerUsuarioPorLogin(usuario) || (await obtenerUsuarioPorLogin(correo));
    if (existente) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese usuario o correo" }, { status: 409 });
    }

    await crearUsuario({
      usuario,
      correo,
      passwordHash: hashPassword(password),
      rol: rolSolicitado,
      aprobado: false,
    });

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
