-- ============================================================================
-- Control de salida y regreso temporal por vehículo (distinto de la salida
-- definitiva): el coche sigue contando como "en base" en general, pero se
-- deja constancia de que hizo una excursión puntual — cuándo salió, cuándo
-- volvió, y por qué.
--
-- Dashboard de Supabase → SQL Editor → New query → pegar TODO este archivo
-- → Run. Solo hace falta si tu proyecto ya estaba desplegado. Si despliegas
-- desde cero, la versión actual de `supabase/migracion.sql` ya lo trae.
-- ============================================================================

alter table public.coches add column if not exists fuera_temporalmente boolean not null default false;
alter table public.coches add column if not exists fecha_salida_temporal timestamptz;
alter table public.coches add column if not exists fecha_regreso timestamptz;
alter table public.coches add column if not exists motivo_salida text;

-- La vista hay que recrearla entera para que incluya las columnas nuevas
-- (create or replace view no permite añadir columnas a mitad, solo al
-- final, así que se repite completa tal cual queda en migracion.sql).
create or replace view public.coches_calculado as
select
  c.id, c.plaza, c.fecha_entrada, c.tiene_llave, c.esta_calcinado, c.bloqueado, c.traslado,
  c.traslado_previsto, c.empresa_traslado, c.fecha_traslado, c.fecha_destino, c.matricula, c.modelo,
  c.tipo_vehiculo, c.numero_expediente, c.fecha_salida, c.observaciones, c.base_id,
  c.fuera_temporalmente, c.fecha_salida_temporal, c.fecha_regreso, c.motivo_salida,
  b.numero as base_numero, b.nombre as base_nombre,
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
    ) between 0 and 5
  ) as proximo_a_vencer
from public.coches c
left join public.bases b on b.id = c.base_id;
