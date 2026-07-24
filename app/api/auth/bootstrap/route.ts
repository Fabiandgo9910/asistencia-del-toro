import { NextRequest, NextResponse } from "next/server";
import { crearUsuario, existeSuperAdmin, obtenerUsuarioPorLogin } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// POST /api/auth/bootstrap  { usuario, correo, password }
// Cabecera obligatoria: x-setup-secret: <SETUP_SECRET del .env>
//
// Crea la ÚNICA cuenta super_admin inicial. Nadie puede registrarse como
// super_admin desde /registro (por diseño: es quien aprueba al resto), así
// que la primera vez hay que crearla llamando a este endpoint una sola
// vez. En cuanto exista un super_admin en la base de datos, este endpoint
// se bloquea automáticamente para siempre, aunque se conozca el secreto.
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
    if (await existeSuperAdmin()) {
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

    const existente = (await obtenerUsuarioPorLogin(usuario)) || (await obtenerUsuarioPorLogin(correo));
    if (existente) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese usuario o correo" }, { status: 409 });
    }

    const id = await crearUsuario({
      usuario,
      correo,
      passwordHash: hashPassword(password),
      rol: "super_admin",
      aprobado: true,
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al crear el super_admin", detalle: mensaje }, { status: 500 });
  }
}
