-- 3-tier hierarchy: Groups → Categories → Master Goals
-- Run this manually in your Supabase SQL editor (project qrxpzineivikjgfgbcfv).

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "order" integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists group_id uuid references public.groups(id) on delete set null,
  add column if not exists "order" integer not null default 0;

alter table public.master_goals
  add column if not exists "order" integer not null default 0,
  add column if not exists category_name text;

update public.master_goals mg
   set category_name = c.name
  from public.categories c
 where mg.category_id = c.id
   and (mg.category_name is null or mg.category_name = '');

alter table public.groups enable row level security;

drop policy if exists "Public can read groups" on public.groups;
create policy "Public can read groups" on public.groups for select using (true);

drop policy if exists "Authenticated can write groups" on public.groups;
create policy "Authenticated can write groups" on public.groups for all using (true) with check (true);

create index if not exists categories_group_id_idx on public.categories(group_id);
create index if not exists categories_order_idx on public.categories("order");
create index if not exists master_goals_order_idx on public.master_goals("order");
create index if not exists groups_order_idx on public.groups("order");
