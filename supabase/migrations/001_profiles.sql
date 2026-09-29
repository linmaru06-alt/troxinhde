-- 001_profiles.sql
-- Create public.profiles table and automatic trigger on auth.users creation

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text,
  phone text unique,
  avatar_url text,
  role text not null default 'user'
    check (role in ('user','owner','admin')),
  owner_application_status text default 'none'
    check (owner_application_status in
      ('none','pending','approved','rejected')),
  owner_application_date timestamptz,
  owner_rejection_reason text,
  onboarding_completed boolean default false,
  owner_onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger function to create profile automatically when auth.users is inserted
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, phone, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Người dùng Trọ Xinh'),
    new.email,
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'avatar_url', '/images/user-avatar.jpg'),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = coalesce(excluded.email, profiles.email),
    phone = coalesce(excluded.phone, profiles.phone),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
