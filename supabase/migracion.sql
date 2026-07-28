-- ============================================================================
-- MIGRACIÓN COMPLETA A SUPABASE — ejecutar una sola vez
-- Dashboard de Supabase → SQL Editor → New query → pegar TODO este archivo
-- → Run.
--
-- Sustituye por completo a Neon + Vercel: ya no hace falta ninguna base de
-- datos ni cron job en Vercel. Supabase pone la base de datos (Postgres),
-- la autenticación (Supabase Auth) y el trabajo programado (pg_cron).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) PERFILES (usuarios de la app: rol y aprobación)
-- ----------------------------------------------------------------------------
-- El correo y la contraseña los guarda Supabase Auth solo (tabla
-- auth.users, que no tocamos). Aquí solo guardamos lo nuestro.

create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  usuario    text not null,
  correo     text not null,
  rol        text not null default 'chofer'
             check (rol in ('super_admin', 'admin', 'oficinista', 'chofer')),
  aprobado   boolean not null default false,
  creado_en  timestamptz not null default now()
);

create unique index if not exists idx_perfiles_usuario on public.perfiles (lower(usuario));

alter table public.perfiles enable row level security;

drop policy if exists "Ver propio perfil" on public.perfiles;
create policy "Ver propio perfil"
  on public.perfiles for select
  using (auth.uid() = id);

-- A propósito NO hay política de insert/update/delete para el usuario
-- normal: aprobar, cambiar rol, editar o eliminar cuentas se hace siempre
-- desde el servidor (rutas /api/admin/usuarios/...) con la service role
-- key, que se salta la RLS, tras comprobar que quien llama es super_admin.

-- Trigger: al registrarse (supabase.auth.signUp) se crea automáticamente
-- la fila de perfil, con aprobado = false. El nombre de usuario y el rol
-- solicitado llegan como metadatos del formulario de registro.
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, usuario, correo, rol, aprobado)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'usuario', split_part(new.email, '@', 1)),
    new.email,
    case
      when new.raw_user_meta_data->>'rol_solicitado' in ('admin', 'oficinista', 'chofer')
        then new.raw_user_meta_data->>'rol_solicitado'
      else 'chofer'
    end,
    false
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.manejar_nuevo_usuario();

-- Función auxiliar: rol del usuario que hace la petición actual. Se usa en
-- las políticas de coches/consignas de más abajo. security definer para
-- poder leer perfiles sin depender de su propia política de RLS.
create or replace function public.rol_actual()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

-- Nota sobre el primer super_admin: nadie puede registrarse como
-- super_admin desde el formulario público (el trigger de arriba lo
-- impide). La primera cuenta se crea con POST /api/auth/bootstrap (ver
-- README) usando la Admin API de Supabase, y su perfil se deja ya con
-- rol = 'super_admin' y aprobado = true.

-- ----------------------------------------------------------------------------
-- 2) COCHES
-- ----------------------------------------------------------------------------

create table if not exists public.coches (
  id                 bigint generated always as identity primary key,
  plaza              integer,
  fecha_entrada      date not null default current_date,
  tiene_llave        boolean not null default false,
  esta_calcinado     boolean not null default false,
  traslado           varchar(255),
  empresa_traslado   varchar(255),
  fecha_traslado     date,
  fecha_destino      date, -- fecha PREVISTA de salida (aún no ha salido, pero ya tiene destino asignado)
  bloqueado          boolean not null default false,
  matricula          varchar(20) not null,
  modelo             varchar(120),
  numero_expediente  varchar(80),
  fecha_salida       timestamp,
  observaciones      text
);

create index if not exists idx_coches_matricula on public.coches (matricula);
create index if not exists idx_coches_expediente on public.coches (numero_expediente);
create index if not exists idx_coches_activos on public.coches (fecha_salida) where fecha_salida is null;

-- Matrícula siempre en mayúsculas, se guarde como se guarde.
create or replace function public.mayusculas_matricula()
returns trigger
language plpgsql
as $$
begin
  new.matricula := upper(new.matricula);
  return new;
end;
$$;

drop trigger if exists trg_mayusculas_matricula on public.coches;
create trigger trg_mayusculas_matricula
before insert or update on public.coches
for each row execute function public.mayusculas_matricula();

alter table public.coches enable row level security;

-- Ver: cualquier usuario autenticado Y aprobado (choferes incluidos).
drop policy if exists "Ver coches" on public.coches;
create policy "Ver coches"
  on public.coches for select
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.aprobado));

-- Crear: cualquier usuario aprobado, incluidos los choferes (solo dan de
-- alta, la app ya no les deja fijar fecha_destino desde el formulario).
drop policy if exists "Crear coches" on public.coches;
create policy "Crear coches"
  on public.coches for insert
  with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.aprobado));

-- Editar / dar salida / bloquear: solo admin, oficinista o super_admin.
drop policy if exists "Editar coches" on public.coches;
create policy "Editar coches"
  on public.coches for update
  using (public.rol_actual() in ('admin', 'oficinista', 'super_admin'));

-- Eliminar: solo admin, oficinista o super_admin.
drop policy if exists "Eliminar coches" on public.coches;
create policy "Eliminar coches"
  on public.coches for delete
  using (public.rol_actual() in ('admin', 'oficinista', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 3) CONSIGNAS (varias por coche, con fecha y observación)
-- ----------------------------------------------------------------------------

create table if not exists public.consignas (
  id           bigint generated always as identity primary key,
  coche_id     bigint not null references public.coches (id) on delete cascade,
  fecha        date not null default current_date,
  observacion  varchar(255)
);

create index if not exists idx_consignas_coche on public.consignas (coche_id);

alter table public.consignas enable row level security;

drop policy if exists "Ver consignas" on public.consignas;
create policy "Ver consignas"
  on public.consignas for select
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.aprobado));

drop policy if exists "Crear consignas" on public.consignas;
create policy "Crear consignas"
  on public.consignas for insert
  with check (public.rol_actual() in ('admin', 'oficinista', 'super_admin'));

drop policy if exists "Eliminar consignas" on public.consignas;
create policy "Eliminar consignas"
  on public.consignas for delete
  using (public.rol_actual() in ('admin', 'oficinista', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 4) VISTA CON LOS CÁLCULOS DE CUSTODIA (días, penalización, vencimiento…)
-- ----------------------------------------------------------------------------
-- Reglas: 3 días propios + 9 días Mapfre = 12 días cubiertos. A partir del
-- día 13, 13€/día de penalización. "Próximo a vencer" = sin penalización
-- todavía, pero a 2 días o menos del día 12.

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

-- Las vistas heredan los permisos de quien consulta junto con la RLS de
-- las tablas base (coches/consignas), así que no hace falta activar RLS
-- ni crear políticas aparte para esta vista.

-- ----------------------------------------------------------------------------
-- 5) LIMPIEZA AUTOMÁTICA (retención de 1 año) — con pg_cron, sin Vercel
-- ----------------------------------------------------------------------------

create or replace function public.limpiar_registros_antiguos()
returns integer
language plpgsql
as $$
declare
  filas_borradas integer;
begin
  delete from public.coches where fecha_entrada < (current_date - interval '365 days');
  get diagnostics filas_borradas = row_count;
  return filas_borradas;
end;
$$;

-- Se puede probar manualmente con: select public.limpiar_registros_antiguos();

-- Activa la extensión pg_cron (una sola vez por proyecto) y programa la
-- limpieza a diario a las 03:00 UTC. Esto sustituye por completo al Vercel
-- Cron Job que se usaba antes.
create extension if not exists pg_cron;

select cron.schedule(
  'limpieza-diaria-coches',
  '0 3 * * *',
  $$ select public.limpiar_registros_antiguos(); $$
);

-- Para ver los jobs programados:      select * from cron.job;
-- Para cancelar este job si hiciera falta:
--   select cron.unschedule('limpieza-diaria-coches');
