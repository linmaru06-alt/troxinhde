-- 012_roommate_posts_enrichment.sql
-- Bổ sung các cột phục vụ tìm bạn cùng phòng thực tế: trường, quận, danh sách ảnh

ALTER TABLE public.roommate_posts
  ADD COLUMN IF NOT EXISTS school TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Chỉ mục hỗ trợ lọc nhanh theo quận và trạng thái
CREATE INDEX IF NOT EXISTS idx_roommate_posts_district ON public.roommate_posts(district);
CREATE INDEX IF NOT EXISTS idx_roommate_posts_status_created ON public.roommate_posts(status, created_at DESC);

-- Chú thích tài liệu
COMMENT ON COLUMN public.roommate_posts.school IS 'Trường đại học hoặc nơi làm việc của người tìm bạn';
COMMENT ON COLUMN public.roommate_posts.district IS 'Quận/Huyện mong muốn tìm phòng ghép tại Hà Nội';
COMMENT ON COLUMN public.roommate_posts.images IS 'Danh sách URL ảnh phòng trọ hoặc không gian sống thực tế';
