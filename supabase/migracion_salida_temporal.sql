-- ============================================================================
-- Al deshacer una salida (revertir_salida), se pregunta opcionalmente el
-- motivo del regreso, se guarda con su fecha, y se anota automáticamente
-- en las observaciones: "Regresó a base el DD/MM/AAAA · Motivo: ...".
--
-- NO hay una salida "temporal" separada de la normal — sigue habiendo una
-- sola salida (fecha_salida) y una sola forma de deshacerla.
--
-- Dashboard de Supabase → SQL Editor → New query → pegar TODO este archivo
-- → Run. Solo hace falta si tu proyecto ya estaba desplegado. Si despliegas
-- desde cero, la versión actual de `supabase/migracion.sql` ya lo trae.
--
-- Si llegaste a ejecutar una versión anterior de este archivo, no pasa
-- nada: la vista "coches_calculado" depende de las columnas que vamos a
-- quitar (fuera_temporalmente, fecha_salida_temporal), así que Postgres no
-- deja tocarlas mientras la vista siga ahí. Por eso primero se borra la
-- vista por completo — no hay problema, se vuelve a crear al final de
-- este mismo archivo, ya con las columnas correctas.
-- ============================================================================

drop view if exists public.coches_calculado;

alter table public.coches drop column if exists fuera_temporalmente;
alter table public.coches drop column if exists fecha_salida_temporal;
alter table public.coches add column if not exists fecha_regreso timestamptz;
alter table public.coches add column if not exists motivo_salida text;

create or replace view public.coches_calculado as
select
  c.id, c.plaza, c.fecha_entrada, c.tiene_llave, c.esta_calcinado, c.bloqueado, c.traslado,
  c.traslado_previsto, c.empresa_traslado, c.fecha_traslado, c.fecha_destino, c.matricula, c.modelo,
  c.tipo_vehiculo, c.numero_expediente, c.fecha_salida, c.observaciones, c.base_id,
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
  ) as proximo_a_vencer,
  -- Columnas nuevas de esta migración, al final para no romper la vista:
  c.fecha_regreso, c.motivo_salida
from public.coches c
left join public.bases b on b.id = c.base_id;
