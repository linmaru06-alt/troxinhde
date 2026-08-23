-- 003_interactions.sql
-- Create saved_rooms, viewing_requests, conversations, messages, notifications, reviews tables

create table if not exists public.saved_rooms (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, room_id)
);

create table if not exists public.viewing_requests (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  renter_id uuid references public.profiles(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  requested_date date not null,
  requested_time text not null,
  message text,
  contact_phone text,
  status text default 'pending'
    check (status in ('pending','confirmed','declined','completed')),
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete set null,
  participant_1 uuid references public.profiles(id) on delete cascade not null,
  participant_2 uuid references public.profiles(id) on delete cascade not null,
  last_message text,
  last_message_at timestamptz,
  unread_count_p1 integer default 0,
  unread_count_p2 integer default 0,
  created_at timestamptz default now(),
  unique(participant_1, participant_2, room_id)
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  cta_url text,
  cta_label text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  cleanliness_rating integer check (cleanliness_rating between 1 and 3),
  owner_rating integer check (owner_rating between 1 and 3),
  accuracy_rating integer check (accuracy_rating between 1 and 3),
  location_rating integer check (location_rating between 1 and 3),
  content text,
  rental_period text,
  image_urls jsonb default '[]',
  helpful_count integer default 0,
  created_at timestamptz default now(),
  unique(room_id, reviewer_id)
);
