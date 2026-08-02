-- ============================================================================
-- Migración incremental: bases, tipo de vehículo, plaza con letras, más
-- caracteres en los campos, traslado previsto, consignas editables y
-- aviso de vencimiento a 5 días.
--
-- Dashboard de Supabase → SQL Editor → New query → pegar TODO este archivo
-- → Run. Solo hace falta si tu proyecto ya estaba desplegado. Si despliegas
-- desde cero, `supabase/migracion.sql` ya trae todo esto incluido.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabla de bases (ubicaciones)
-- ----------------------------------------------------------------------------

create table if not exists public.bases (
  id         bigint generated always as identity primary key,
  numero     text not null,
  nombre     text not null,
  direccion  text,
  creado_en  timestamptz not null default now()
);

create unique index if not exists idx_bases_numero on public.bases (lower(numero));

alter table public.bases enable row level security;

drop policy if exists "Ver bases" on public.bases;
create policy "Ver bases"
  on public.bases for select
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.aprobado));

drop policy if exists "Crear bases" on public.bases;
create policy "Crear bases"
  on public.bases for insert
  with check (public.rol_actual() in ('admin', 'oficinista', 'super_admin'));

drop policy if exists "Editar bases" on public.bases;
create policy "Editar bases"
  on public.bases for update
  using (public.rol_actual() in ('admin', 'oficinista', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 2) Columnas nuevas en coches + más caracteres + plaza con letras
-- ----------------------------------------------------------------------------

-- Postgres no deja cambiar el tipo de una columna mientras una vista
-- dependa de ella ("cannot alter type of a column used by a view or
-- rule"), así que hay que borrar la vista primero. Se vuelve a crear al
-- final de este archivo (paso 4), ya con las columnas nuevas.
drop view if exists public.coches_calculado;

alter table public.coches
  add column if not exists tipo_vehiculo text not null default 'coche' check (tipo_vehiculo in ('coche', 'moto'));

alter table public.coches
  add column if not exists base_id bigint references public.bases (id);

alter table public.coches
  add column if not exists traslado_previsto boolean not null default false;

-- Plaza pasa a admitir letras (antes solo números).
alter table public.coches alter column plaza type text using plaza::text;

-- Sin límite de caracteres (antes varchar con tope corto).
alter table public.coches alter column matricula type text;
alter table public.coches alter column modelo type text;
alter table public.coches alter column numero_expediente type text;
alter table public.coches alter column traslado type text;
alter table public.coches alter column empresa_traslado type text;
alter table public.consignas alter column observacion type text;

-- ----------------------------------------------------------------------------
-- 3) Permitir editar consignas (antes solo se podían crear o borrar)
-- ----------------------------------------------------------------------------

drop policy if exists "Editar consignas" on public.consignas;
create policy "Editar consignas"
  on public.consignas for update
  using (public.rol_actual() in ('admin', 'oficinista', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 4) Vista actualizada: nuevas columnas + join con bases + aviso a 5 días
-- ----------------------------------------------------------------------------

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
  ) as proximo_a_vencer
from public.coches c
left join public.bases b on b.id = c.base_id;
