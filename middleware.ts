import { NextRequest, NextResponse } from "next/server";
import { leerTokenSesion, NOMBRE_COOKIE, puedeGestionarUsuarios } from "@/lib/auth";

// Rutas accesibles sin haber iniciado sesión.
const RUTAS_PUBLICAS = ["/login", "/registro", "/pendiente"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Las rutas de API se protegen ellas mismas (comprueban la sesión con
  // más detalle, según el método/acción). El middleware solo protege
  // páginas y deja pasar siempre /api, /_next y los ficheros estáticos.
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpg|jpeg|svg|ico|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const sesion = await leerTokenSesion(req.cookies.get(NOMBRE_COOKIE)?.value);

  if (RUTAS_PUBLICAS.includes(pathname)) {
    // Si ya hay sesión iniciada, no tiene sentido volver a ver el login.
    if (sesion) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!sesion) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && !puedeGestionarUsuarios(sesion.rol)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
