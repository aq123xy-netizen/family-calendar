create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  color text not null default '#4285f4',
  icon text not null default 'bi-person-fill',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_household_name_unique
on public.profiles (household_id, lower(name));

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  category text not null default 'Family',
  date date not null,
  time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  category text not null default 'House maintenance',
  due_date date not null,
  repeat_rule text,
  reminder_notice text,
  color text not null default '#0f766e',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists set_maintenance_reminders_updated_at on public.maintenance_reminders;
create trigger set_maintenance_reminders_updated_at
before update on public.maintenance_reminders
for each row execute function public.set_updated_at();

create or replace function public.my_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid();
$$;

grant execute on function public.my_household_ids() to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.maintenance_reminders enable row level security;

drop policy if exists "households_select" on public.households;
create policy "households_select"
on public.households
for select
to authenticated
using (id in (select public.my_household_ids()));

drop policy if exists "households_insert" on public.households;
create policy "households_insert"
on public.households
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "households_update" on public.households;
create policy "households_update"
on public.households
for update
to authenticated
using (id in (select public.my_household_ids()))
with check (id in (select public.my_household_ids()));

drop policy if exists "household_members_select" on public.household_members;
create policy "household_members_select"
on public.household_members
for select
to authenticated
using (household_id in (select public.my_household_ids()));

drop policy if exists "household_members_insert" on public.household_members;
create policy "household_members_insert"
on public.household_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  or household_id in (
    select household_id
    from public.household_members
    where user_id = auth.uid()
      and role = 'owner'
  )
);

drop policy if exists "household_members_update" on public.household_members;
create policy "household_members_update"
on public.household_members
for update
to authenticated
using (
  household_id in (
    select household_id
    from public.household_members
    where user_id = auth.uid()
      and role = 'owner'
  )
)
with check (
  household_id in (
    select household_id
    from public.household_members
    where user_id = auth.uid()
      and role = 'owner'
  )
);

drop policy if exists "profiles_all" on public.profiles;
create policy "profiles_all"
on public.profiles
for all
to authenticated
using (household_id in (select public.my_household_ids()))
with check (household_id in (select public.my_household_ids()));

drop policy if exists "events_all" on public.events;
create policy "events_all"
on public.events
for all
to authenticated
using (household_id in (select public.my_household_ids()))
with check (household_id in (select public.my_household_ids()));

drop policy if exists "maintenance_reminders_all" on public.maintenance_reminders;
create policy "maintenance_reminders_all"
on public.maintenance_reminders
for all
to authenticated
using (household_id in (select public.my_household_ids()))
with check (household_id in (select public.my_household_ids()));
