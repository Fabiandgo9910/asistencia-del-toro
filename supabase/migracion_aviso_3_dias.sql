-- ============================================================================
-- Ajustar el aviso de "próximo a vencer":
--   - Ahora avisa a 3 días de vencer (antes eran 2).
--   - Solo avisa si el coche NO tiene fecha de salida prevista. Si ya
--     tiene una fecha de salida prevista, no hace falta avisar (ya se
--     sabe cuándo sale) — solo se sigue mostrando lo que hay que abonar
--     si la custodia YA está vencida, eso no cambia.
--
-- Dashboard de Supabase → SQL Editor → New query → pegar esto → Run.
-- Solo hace falta si tu proyecto ya estaba desplegado con la versión
-- anterior de `supabase/migracion.sql`. Si despliegas desde cero, la
-- versión actual de ese archivo ya trae este cambio.
-- ============================================================================

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
    c.fecha_salida is null
    and c.fecha_destino is null
    and greatest(
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
    ) between 0 and 3
  ) as proximo_a_vencer
from public.coches c;
