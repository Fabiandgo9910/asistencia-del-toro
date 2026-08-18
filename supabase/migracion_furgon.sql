-- ============================================================================
-- Añadir "furgón" como tipo de vehículo válido (antes solo coche/moto).
--
-- Dashboard de Supabase → SQL Editor → New query → pegar esto → Run.
-- Solo hace falta si tu proyecto ya estaba desplegado. Si despliegas desde
-- cero, la versión actual de `supabase/migracion.sql` ya lo trae.
-- ============================================================================

alter table public.coches drop constraint if exists coches_tipo_vehiculo_check;

alter table public.coches
  add constraint coches_tipo_vehiculo_check
  check (tipo_vehiculo in ('coche', 'moto', 'furgon'));
