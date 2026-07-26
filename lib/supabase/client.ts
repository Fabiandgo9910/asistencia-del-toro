import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./env";

// Cliente Supabase para usar en componentes "use client". Usa la clave
// pública (publishable/anon key) — segura para exponer al navegador
// porque todo el acceso a datos está controlado por Row Level Security
// (RLS) en la base.
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
