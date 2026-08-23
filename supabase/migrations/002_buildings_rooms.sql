-- 002_buildings_rooms.sql
-- Create public.buildings, public.rooms, public.room_images tables

create table if not exists public.buildings (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  address text not null,
  district text not null,
  city text default 'Hà Nội',
  lat double precision,
  lng double precision,
  description text,
  amenities jsonb default '[]',
  cover_image_url text,
  status text default 'active'
    check (status in ('active','inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.rooms (
  id uuid default gen_random_uuid() primary key,
  building_id uuid references public.buildings(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  price integer not null,
  area numeric not null,
  room_type text not null
    check (room_type in ('single','shared','studio','apartment')),
  amenities jsonb default '[]',
  description text,
  status text default 'available'
    check (status in ('available','rented','hidden')),
  moderation_status text default 'pending'
    check (moderation_status in ('pending','approved','rejected')),
  rejection_reason text,
  view_count integer default 0,
  save_count integer default 0,
  boost_type text,
  boost_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.room_images (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  url text not null,
  order_index integer default 0,
  is_cover boolean default false,
  created_at timestamptz default now()
);
