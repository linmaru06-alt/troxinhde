-- 050_geo_coordinates.sql
-- Bổ sung tọa độ địa lý (lat/lng) và địa chỉ chi tiết cho phòng trọ và tin tìm bạn ở ghép
-- Bảo toàn dữ liệu hiện có, an toàn chạy lại nhiều lần (idempotent)

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE public.roommate_posts
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS linked_room_title text,
  ADD COLUMN IF NOT EXISTS linked_room_price integer,
  ADD COLUMN IF NOT EXISTS linked_room_area numeric;

-- Kế thừa địa chỉ và tọa độ từ tòa nhà cho các phòng hiện có chưa có tọa độ
UPDATE public.rooms r
SET
  address = COALESCE(r.address, b.address),
  district = COALESCE(r.district, b.district),
  lat = COALESCE(r.lat, b.lat),
  lng = COALESCE(r.lng, b.lng)
FROM public.buildings b
WHERE r.building_id = b.id
  AND (r.lat IS NULL OR r.lng IS NULL OR r.address IS NULL OR r.district IS NULL);

-- Chỉ mục hỗ trợ truy vấn vị trí bản đồ nhanh
CREATE INDEX IF NOT EXISTS idx_buildings_lat_lng ON public.buildings (lat, lng);
CREATE INDEX IF NOT EXISTS idx_rooms_lat_lng ON public.rooms (lat, lng);
CREATE INDEX IF NOT EXISTS idx_roommate_posts_lat_lng ON public.roommate_posts (lat, lng);

COMMENT ON COLUMN public.rooms.lat IS 'Vĩ độ thực tế của phòng trọ hiển thị trên bản đồ';
COMMENT ON COLUMN public.rooms.lng IS 'Kinh độ thực tế của phòng trọ hiển thị trên bản đồ';
COMMENT ON COLUMN public.roommate_posts.address IS 'Địa chỉ phòng đang ở hoặc đường/khu vực mong muốn ở ghép';
COMMENT ON COLUMN public.roommate_posts.lat IS 'Vĩ độ hiển thị ghim tin tìm người ở ghép trên bản đồ';
COMMENT ON COLUMN public.roommate_posts.lng IS 'Kinh độ hiển thị ghim tin tìm người ở ghép trên bản đồ';

