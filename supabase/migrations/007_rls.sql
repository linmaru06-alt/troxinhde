-- 007_rls.sql
-- Enable Row Level Security (RLS) and create security policies

alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
alter table public.saved_rooms enable row level security;
alter table public.viewing_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.roommate_posts enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.reports enable row level security;
alter table public.owner_applications enable row level security;
alter table public.transactions enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.view_history enable row level security;
alter table public.search_history enable row level security;
alter table public.push_subscriptions enable row level security;

-- Profiles: Public viewable, user update own
drop policy if exists "Public profiles viewable" on public.profiles;
create policy "Public profiles viewable"
  on public.profiles for select using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Buildings: Public view active, owner manage own
drop policy if exists "Public view active buildings" on public.buildings;
create policy "Public view active buildings"
  on public.buildings for select
  using (status = 'active');

drop policy if exists "Owners manage own buildings" on public.buildings;
create policy "Owners manage own buildings"
  on public.buildings for all
  using (auth.uid() = owner_id);

-- Rooms: Public view approved, owner manage own
drop policy if exists "Public view approved rooms" on public.rooms;
create policy "Public view approved rooms"
  on public.rooms for select
  using (moderation_status = 'approved' and status != 'hidden');

drop policy if exists "Owners manage own rooms" on public.rooms;
create policy "Owners manage own rooms"
  on public.rooms for all
  using (auth.uid() = owner_id);

-- Room Images: Public viewable, owner manage
drop policy if exists "Public view room images" on public.room_images;
create policy "Public view room images"
  on public.room_images for select using (true);

drop policy if exists "Owners manage room images" on public.room_images;
create policy "Owners manage room images"
  on public.room_images for all using (
    exists (
      select 1 from public.rooms
      where rooms.id = room_images.room_id and rooms.owner_id = auth.uid()
    )
  );

-- Saved rooms: Users manage own saved
drop policy if exists "Users manage own saved" on public.saved_rooms;
create policy "Users manage own saved"
  on public.saved_rooms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Viewing requests: Renter and owner can view and manage
drop policy if exists "Users view own viewing requests" on public.viewing_requests;
create policy "Users view own viewing requests"
  on public.viewing_requests for select
  using (auth.uid() = renter_id or auth.uid() = owner_id);

drop policy if exists "Renters create viewing requests" on public.viewing_requests;
create policy "Renters create viewing requests"
  on public.viewing_requests for insert
  with check (auth.uid() = renter_id);

drop policy if exists "Owners update viewing requests" on public.viewing_requests;
create policy "Owners update viewing requests"
  on public.viewing_requests for update
  using (auth.uid() = owner_id or auth.uid() = renter_id);

-- Conversations: Participants only
drop policy if exists "Participants view conversations" on public.conversations;
create policy "Participants view conversations"
  on public.conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

drop policy if exists "Participants create conversations" on public.conversations;
create policy "Participants create conversations"
  on public.conversations for insert
  with check (auth.uid() = participant_1 or auth.uid() = participant_2);

drop policy if exists "Participants update conversations" on public.conversations;
create policy "Participants update conversations"
  on public.conversations for update
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

-- Messages: Participants only
drop policy if exists "Participants view messages" on public.messages;
create policy "Participants view messages"
  on public.messages for select using (
    auth.uid() in (
      select participant_1 from public.conversations where id = conversation_id
      union
      select participant_2 from public.conversations where id = conversation_id
    )
  );

drop policy if exists "Authenticated send messages" on public.messages;
create policy "Authenticated send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- Notifications: Only recipient
drop policy if exists "Users view own notifications" on public.notifications;
create policy "Users view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Reviews: Public view, authenticated create
drop policy if exists "Public view reviews" on public.reviews;
create policy "Public view reviews"
  on public.reviews for select using (true);

drop policy if exists "Authenticated create reviews" on public.reviews;
create policy "Authenticated create reviews"
  on public.reviews for insert
  with check (auth.uid() = reviewer_id);

-- Roommate posts: Public view active, poster manage
drop policy if exists "Public view active roommate posts" on public.roommate_posts;
create policy "Public view active roommate posts"
  on public.roommate_posts for select using (status = 'active');

drop policy if exists "Posters manage roommate posts" on public.roommate_posts;
create policy "Posters manage roommate posts"
  on public.roommate_posts for all
  using (auth.uid() = poster_id);

-- Marketplace: Public view available, seller manage
drop policy if exists "Public view marketplace" on public.marketplace_items;
create policy "Public view marketplace"
  on public.marketplace_items for select using (status = 'available');

drop policy if exists "Sellers manage items" on public.marketplace_items;
create policy "Sellers manage items"
  on public.marketplace_items for all
  using (auth.uid() = seller_id);

-- Owner applications: User create & view own
drop policy if exists "Users manage own owner application" on public.owner_applications;
create policy "Users manage own owner application"
  on public.owner_applications for all
  using (auth.uid() = user_id);

-- Transactions: User view own
drop policy if exists "Users view own transactions" on public.transactions;
create policy "Users view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

-- Subscriptions: User view own
drop policy if exists "Users view own subscriptions" on public.user_subscriptions;
create policy "Users view own subscriptions"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- Push subscriptions: User manage own
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);
