// Supabase renombró sus claves en 2025: la "anon key" pasó a llamarse
// "publishable key" y la "service_role key" pasó a llamarse "secret key"
// (mismo formato JWT clásico o el nuevo sb_publishable_.../sb_secret_...,
// funcionalmente equivalentes). Los proyectos creados desde noviembre de
// 2025 solo traen las nuevas por defecto. Para no depender de cuál te dé
// Supabase, se acepta cualquiera de los dos nombres de variable de
// entorno. Este archivo no importa nada de Node, así que también sirve
// desde middleware.ts (Edge Runtime).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
