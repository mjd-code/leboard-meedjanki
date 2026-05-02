create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo text default '',
  bio text default '',
  total_points integer default 0,
  previous_rank integer,
  assigned_goals jsonb not null default '[]'::jsonb,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.master_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  points integer not null default 0,
  category_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'system',
  action text not null,
  details text default '',
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.page_views (
  date date primary key,
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  path text,
  device text not null default 'desktop',
  is_admin boolean not null default false,
  session_id text not null,
  ref_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;
alter table public.master_goals enable row level security;
alter table public.categories enable row level security;
alter table public.activity_logs enable row level security;
alter table public.page_views enable row level security;
alter table public.settings enable row level security;
alter table public.app_events enable row level security;

do $$ declare t text; begin
  for t in select unnest(array['students','master_goals','categories','activity_logs','page_views','settings','app_events']) loop
    begin execute format('create policy "Public read %1$s" on public.%1$I for select using (true)', t); exception when duplicate_object then null; end;
    begin execute format('create policy "Public insert %1$s" on public.%1$I for insert with check (true)', t); exception when duplicate_object then null; end;
    begin execute format('create policy "Public update %1$s" on public.%1$I for update using (true)', t); exception when duplicate_object then null; end;
    begin execute format('create policy "Public delete %1$s" on public.%1$I for delete using (true)', t); exception when duplicate_object then null; end;
  end loop;
end $$;