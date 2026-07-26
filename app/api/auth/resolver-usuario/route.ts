import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST /api/auth/resolver-usuario { usuario }
// Supabase Auth solo permite iniciar sesión por correo. Esta ruta permite
// que el login siga aceptando también el "usuario" de siempre: busca el
// correo asociado con la service role key (la RLS de `perfiles` no deja
// leer la fila de otra persona con la clave pública).
//
// Solo se devuelve el correo si existe una coincidencia — nunca se dice
// si el usuario existe o no explícitamente, para no facilitar enumerar
// cuentas.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const usuario = String(body?.usuario ?? "").trim();
  if (!usuario) {
    return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("perfiles")
      .select("correo")
      .ilike("usuario", usuario)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ correo: data.correo });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al resolver el usuario" }, { status: 500 });
  }
}
