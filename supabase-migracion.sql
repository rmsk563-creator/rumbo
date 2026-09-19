-- ============================================================
-- RUMBO — esquema de cuentas y reservas (Supabase)
--
-- Se puede ejecutar más de una vez: todo lleva "if not exists" o
-- "create or replace", y las políticas se recrean.
--
-- Quién puede qué:
--   · Cada usuario ve, crea y cancela SOLO sus reservas.
--   · Nadie puede editar el total, las fechas ni el hotel de una
--     reserva ya creada: al rol "authenticated" solo se le concede
--     UPDATE sobre la columna "estado".
--   · Cada usuario ve y borra SOLO sus favoritos.
--   · "anon" (visitante sin sesión) no tiene acceso a nada.
-- ============================================================


-- ---------- 1. PERFILES ----------
-- Una fila por usuario de auth.users. El nombre viaja en los
-- metadatos del registro y un trigger lo copia aquí.
create table if not exists public.perfiles (
  id      uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null default '',
  creado  timestamptz not null default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "perfiles: ver el propio"       on public.perfiles;
drop policy if exists "perfiles: editar el propio"    on public.perfiles;

create policy "perfiles: ver el propio"
  on public.perfiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "perfiles: editar el propio"
  on public.perfiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- El perfil lo crea solo el trigger (security definer), no el cliente.
revoke all on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;
grant update (nombre) on public.perfiles to authenticated;

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Usuarios que ya existieran antes de esta migración.
insert into public.perfiles (id, nombre)
select u.id, coalesce(u.raw_user_meta_data ->> 'nombre', '')
from auth.users u
on conflict (id) do nothing;


-- ---------- 2. RESERVAS ----------
create table if not exists public.reservas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  codigo      text not null unique
              default 'RB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  hotel_id    integer not null,
  habitacion  text not null,
  entrada     date not null,
  salida      date not null,
  noches      integer not null check (noches > 0),
  adultos     integer not null check (adultos between 1 and 8),
  edades      integer[] not null default '{}',
  total       numeric(10, 2) not null check (total >= 0),
  estado      text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  creada      timestamptz not null default now(),
  check (salida > entrada)
);

create index if not exists reservas_user_idx on public.reservas (user_id, creada desc);

alter table public.reservas enable row level security;

drop policy if exists "reservas: ver las propias"     on public.reservas;
drop policy if exists "reservas: crear las propias"   on public.reservas;
drop policy if exists "reservas: cancelar las propias" on public.reservas;
drop policy if exists "reservas: borrar las propias"  on public.reservas;

create policy "reservas: ver las propias"
  on public.reservas for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "reservas: crear las propias"
  on public.reservas for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "reservas: cancelar las propias"
  on public.reservas for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- «Quitar del historial» solo tiene sentido para reservas ya canceladas.
create policy "reservas: borrar las propias"
  on public.reservas for delete
  to authenticated
  using (user_id = (select auth.uid()) and estado = 'cancelada');

revoke all on public.reservas from anon, authenticated;
grant select, insert, delete on public.reservas to authenticated;
grant update (estado) on public.reservas to authenticated;


-- ---------- 3. FAVORITOS ----------
-- Un hotel guardado por un usuario. La clave primaria compuesta evita
-- duplicados sin necesidad de comprobarlo desde el cliente: guardar dos
-- veces el mismo hotel es la misma fila, no dos.
-- No hay UPDATE: un favorito está o no está.
create table if not exists public.favoritos (
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  hotel_id    integer not null,
  creado_en   timestamptz not null default now(),
  primary key (usuario_id, hotel_id)
);

create index if not exists favoritos_usuario_idx on public.favoritos (usuario_id, creado_en desc);

alter table public.favoritos enable row level security;

drop policy if exists "favoritos: ver los propios"    on public.favoritos;
drop policy if exists "favoritos: crear los propios"  on public.favoritos;
drop policy if exists "favoritos: borrar los propios" on public.favoritos;

create policy "favoritos: ver los propios"
  on public.favoritos for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "favoritos: crear los propios"
  on public.favoritos for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "favoritos: borrar los propios"
  on public.favoritos for delete
  to authenticated
  using (usuario_id = (select auth.uid()));

revoke all on public.favoritos from anon, authenticated;
grant select, insert, delete on public.favoritos to authenticated;


-- ---------- 4. VERIFICACIÓN ----------
-- Debe devolver tres filas, las tres con rls_activo = true.
select c.relname as tabla, c.relrowsecurity as rls_activo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('perfiles', 'reservas', 'favoritos')
order by c.relname;
