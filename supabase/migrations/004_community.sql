-- 004_community.sql
-- Create roommate_posts, marketplace_items, reports, owner_applications tables

create table if not exists public.roommate_posts (
  id uuid default gen_random_uuid() primary key,
  poster_id uuid references public.profiles(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete set null,
  nickname text not null,
  age integer,
  gender text check (gender in ('male','female','any')),
  preferred_gender text check (preferred_gender in ('male','female','any')),
  budget_per_person integer,
  lifestyle_tags jsonb default '[]',
  self_intro text,
  status text default 'active' check (status in ('active','closed')),
  created_at timestamptz default now()
);

create table if not exists public.marketplace_items (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  price integer,
  is_free boolean default false,
  condition text check (condition in ('new90','used','needs_repair')),
  category text check (category in
    ('furniture','electronics','books','household','other')),
  district text,
  description text,
  image_urls jsonb default '[]',
  status text default 'available'
    check (status in ('available','sold','given')),
  created_at timestamptz default now()
);

create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  target_type text check (target_type in
    ('room','roommate_post','marketplace_item','user')),
  target_id uuid not null,
  reason text not null,
  custom_reason text,
  status text default 'pending'
    check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz default now()
);

create table if not exists public.owner_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  full_name text not null,
  phone text not null,
  cccd text not null,
  cccd_image_url text,
  room_count text not null,
  district text not null,
  description text,
  status text default 'pending'
    check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
