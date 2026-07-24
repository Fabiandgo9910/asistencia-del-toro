import { NextRequest, NextResponse } from "next/server";
import { obtenerUsuarioPorLogin } from "@/lib/db";
import { crearTokenSesion, verificarPassword, NOMBRE_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/login  { identificador (usuario o correo), password }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const identificador = String(body?.identificador ?? "").trim();
  const password = String(body?.password ?? "");

  if (!identificador || !password) {
    return NextResponse.json({ error: "Usuario/correo y contraseña son obligatorios" }, { status: 400 });
  }

  try {
    const usuario = await obtenerUsuarioPorLogin(identificador);
    if (!usuario || !verificarPassword(password, usuario.password_hash)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    if (!usuario.aprobado) {
      return NextResponse.json(
        { error: "Tu cuenta todavía no ha sido aprobada por un administrador." },
        { status: 403 }
      );
    }

    const token = crearTokenSesion({ id: usuario.id, usuario: usuario.usuario, rol: usuario.rol });
    const res = NextResponse.json({
      usuario: { id: usuario.id, usuario: usuario.usuario, rol: usuario.rol },
    });
    res.cookies.set(NOMBRE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al iniciar sesión", detalle: mensaje }, { status: 500 });
  }
}
