import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SECRET_KEY } from "./env";

// Cliente con la "service role" / "secret" key: se salta por completo la
// Row Level Security y puede administrar cuentas (crear, borrar, cambiar
// contraseña o correo de CUALQUIER usuario) a través de
// `supabase.auth.admin.*`.
//
// NUNCA se importa desde un componente "use client" ni se expone al
// navegador — solo se usa dentro de Route Handlers (app/api/.../route.ts),
// y solo después de comprobar que quien llama es super_admin.
export function createAdminClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
