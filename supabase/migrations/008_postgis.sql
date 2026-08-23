-- 008_postgis.sql
-- Enable PostGIS extension, add geography location column, auto-update trigger, and radius search RPC

-- 1. Enable PostGIS extension
create extension if not exists postgis;

-- 2. Add geography location point to buildings table
alter table public.buildings
  add column if not exists location geography(POINT, 4326);

-- Update existing rows
update public.buildings
  set location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  where lat is not null and lng is not null;

-- 3. Trigger auto-update location when lat/lng change
create or replace function public.update_building_location()
returns trigger as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location = ST_SetSRID(
      ST_MakePoint(new.lng, new.lat), 4326
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_building_location on public.buildings;
create trigger trigger_update_building_location
  before insert or update of lat, lng on public.buildings
  for each row execute procedure public.update_building_location();

-- 4. RPC function to query rooms within a radius (in kilometers)
create or replace function public.find_rooms_near_location(
  target_lat double precision,
  target_lng double precision,
  radius_km double precision default 2.0
)
returns table(
  room_id uuid,
  distance_m double precision
)
language sql stable as $$
  select
    r.id as room_id,
    ST_Distance(
      b.location,
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326)
    ) as distance_m
  from public.rooms r
  join public.buildings b on b.id = r.building_id
  where b.location is not null
    and ST_DWithin(
      b.location,
      ST_SetSRID(ST_MakePoint(target_lng, target_lat), 4326),
      radius_km * 1000
    )
    and r.moderation_status = 'approved'
    and r.status != 'hidden'
  order by distance_m asc;
$$;
