import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./env";

// Cliente Supabase para Server Components y Route Handlers (app/api/...).
// Lee/escribe la sesión a través de las cookies de la petición actual.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Un Server Component no puede escribir cookies (solo leerlas).
            // No pasa nada: el middleware ya se encarga de refrescar y
            // guardar la sesión en cada petición.
          }
        },
      },
    }
  );
}
