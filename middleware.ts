import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabase/env";

// Páginas accesibles sin haber iniciado sesión.
const RUTAS_PUBLICAS = ["/login", "/registro", "/recuperar", "/actualizar-password", "/pendiente"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/auth/callback") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpg|jpeg|svg|ico|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Patrón oficial de Supabase SSR para Next.js: hay que ir reescribiendo
  // la respuesta cada vez que Supabase necesita refrescar las cookies de
  // sesión (el access token caduca cada hora y se renueva solo).
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            respuesta.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANTE: se usa getUser() (valida el token contra el servidor de
  // Supabase) y no getSession() (solo lee la cookie sin validarla), tal y
  // como recomienda la documentación de Supabase para middleware.
  const { data: { user } } = await supabase.auth.getUser();

  if (RUTAS_PUBLICAS.includes(pathname)) {
    if (user && pathname !== "/pendiente") {
      // Si ya hay sesión, no tiene sentido volver a ver el login/registro.
      return NextResponse.redirect(new URL("/", request.url));
    }
    return respuesta;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, aprobado")
    .eq("id", user.id)
    .single();

  if (!perfil || !perfil.aprobado) {
    return NextResponse.redirect(new URL("/pendiente", request.url));
  }

  if (pathname.startsWith("/admin") && perfil.rol !== "super_admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
