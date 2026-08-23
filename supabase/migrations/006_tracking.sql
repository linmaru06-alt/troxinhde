-- 006_tracking.sql
-- Create view_history, search_history, push_subscriptions tables

create table if not exists public.view_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade not null,
  duration_seconds integer default 0,
  session_id text,
  created_at timestamptz default now()
);

create table if not exists public.search_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  query text,
  filters_json jsonb,
  result_count integer,
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);
