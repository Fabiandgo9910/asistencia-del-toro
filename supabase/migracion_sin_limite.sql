-- ============================================================================
-- Quitar la limpieza automática (retención de 1 año) — a partir de ahora
-- la retención es sin límite, a propósito.
--
-- Dashboard de Supabase → SQL Editor → New query → pegar esto → Run.
-- Solo hace falta si tu proyecto ya tenía programado el pg_cron de
-- limpieza (versión anterior de `supabase/migracion.sql`). Si despliegas
-- desde cero, la versión actual de ese archivo ya no lo crea.
-- ============================================================================

-- Cancela el job programado (si existe; no da error si ya no está).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'limpieza-diaria-coches') then
    perform cron.unschedule('limpieza-diaria-coches');
  end if;
end $$;

-- Ya no hace falta la función que borraba los registros antiguos.
drop function if exists public.limpiar_registros_antiguos();
