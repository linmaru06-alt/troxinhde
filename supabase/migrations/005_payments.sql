-- 005_payments.sql
-- Create transactions and user_subscriptions tables

create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  order_code text unique not null,
  plan_id text,
  room_id uuid references public.rooms(id) on delete set null,
  amount integer not null,
  status text default 'pending'
    check (status in ('pending','success','failed','expired')),
  payment_method text,
  payos_payment_link_id text,
  idempotency_key text unique,
  activated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.user_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plan_id text not null,
  started_at timestamptz default now(),
  expires_at timestamptz not null,
  transaction_id uuid references public.transactions(id) on delete set null
);
