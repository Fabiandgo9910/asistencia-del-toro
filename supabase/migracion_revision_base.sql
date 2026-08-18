-- ============================================================================
-- Revisión semanal de bases (que la base física coincida con la digital)
--
-- Dashboard de Supabase → SQL Editor → New query → pegar TODO este archivo
-- → Run. Solo hace falta si tu proyecto ya estaba desplegado. Si despliegas
-- desde cero, la versión actual de `supabase/migracion.sql` ya lo trae.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Fecha de la última revisión, por base
-- ----------------------------------------------------------------------------

alter table public.bases add column if not exists ultima_revision timestamptz;

-- Ya existe la política "Editar bases" (admin/oficinista/super_admin) de la
-- migración v3, así que no hace falta ninguna RLS nueva para poder marcar
-- una base como revisada: ya está cubierto.

-- ----------------------------------------------------------------------------
-- 2) Interruptor global: activar/desactivar el aviso semanal
-- ----------------------------------------------------------------------------
-- Una sola fila (id siempre 1) que guarda si el aviso está activado o no.

create table if not exists public.configuracion (
  id                          int primary key default 1,
  revision_semanal_activada  boolean not null default true,
  constraint configuracion_una_sola_fila check (id = 1)
);

insert into public.configuracion (id, revision_semanal_activada)
values (1, true)
on conflict (id) do nothing;

alter table public.configuracion enable row level security;

-- Cualquier usuario aprobado puede ver si el aviso está activado (para
-- saber si debe mostrarlo).
drop policy if exists "Ver configuración" on public.configuracion;
create policy "Ver configuración"
  on public.configuracion for select
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.aprobado));

-- Solo admin/oficinista/super_admin pueden activarlo o desactivarlo (los
-- choferes no gestionan esto, igual que no gestionan coches ni bases).
drop policy if exists "Editar configuración" on public.configuracion;
create policy "Editar configuración"
  on public.configuracion for update
  using (public.rol_actual() in ('admin', 'oficinista', 'super_admin'));
