-- ============================================================================
-- Quitar la funcionalidad de "presente / revisión semanal de base".
-- Dashboard de Supabase → SQL Editor → New query → pegar esto → Run.
--
-- Solo hace falta ejecutar esto si YA tenías el proyecto desplegado con
-- `supabase/migracion.sql` en su versión anterior (con check_presencia y
-- ultima_revision). Si vas a desplegar desde cero, `migracion.sql` ya
-- viene sin estas columnas y no hace falta este archivo.
-- ============================================================================

-- La vista depende de las columnas, así que hay que recrearla primero sin
-- ellas antes de poder borrar las columnas de la tabla.
create or replace view public.coches_calculado as
select
  c.id, c.plaza, c.fecha_entrada, c.tiene_llave, c.esta_calcinado, c.bloqueado, c.traslado,
  c.empresa_traslado, c.fecha_traslado, c.fecha_destino, c.matricula, c.modelo,
  c.numero_expediente, c.fecha_salida, c.observaciones,
  (c.fecha_salida is null and c.fecha_destino is not null) as tiene_destino,
  (select max(fecha) from public.consignas where consignas.coche_id = c.id) as ultima_consigna,
  greatest(
    date_part('day', coalesce(c.fecha_salida, c.fecha_destino::timestamp, now()) - c.fecha_entrada::timestamp)::int,
    0
  ) as dias_totales,
  greatest(
    greatest(
      date_part('day', coalesce(c.fecha_salida, c.fecha_destino::timestamp, now()) - c.fecha_entrada::timestamp)::int,
      0
    ) - 12,
    0
  ) as dias_extra,
  greatest(
    greatest(
      date_part('day', coalesce(c.fecha_salida, c.fecha_destino::timestamp, now()) - c.fecha_entrada::timestamp)::int,
      0
    ) - 12,
    0
  ) * 13 as penalizacion,
  (c.fecha_entrada + interval '3 days')::date as fecha_fin_propios,
  (c.fecha_entrada + interval '12 days')::date as fecha_fin_mapfre,
  (
    greatest(
      greatest(
        date_part('day', coalesce(c.fecha_salida, c.fecha_destino::timestamp, now()) - c.fecha_entrada::timestamp)::int,
        0
      ) - 12,
      0
    ) = 0
    and (
      12 - greatest(
        date_part('day', coalesce(c.fecha_salida, c.fecha_destino::timestamp, now()) - c.fecha_entrada::timestamp)::int,
        0
      )
    ) between 0 and 2
  ) as proximo_a_vencer
from public.coches c;

-- Ahora sí, se pueden borrar las columnas de la tabla.
alter table public.coches drop column if exists check_presencia;
alter table public.coches drop column if exists ultima_revision;
