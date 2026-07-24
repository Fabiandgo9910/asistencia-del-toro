import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sesion = obtenerSesion(req);
  if (!sesion) {
    return NextResponse.json({ sesion: null }, { status: 401 });
  }
  return NextResponse.json({ sesion });
}
