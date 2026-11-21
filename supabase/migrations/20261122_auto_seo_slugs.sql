-- ============================================================================
-- TRỌ XINH: MIGRATION TỰ ĐỘNG SINH VÀ LƯU TRỮ SLUG CHUẨN SEO
-- Áp dụng cho: rooms, marketplace_items, roommate_posts
-- Đặc tả kỹ thuật: specs/auto-url-and-routing/plan.md
-- ============================================================================

-- 1. Bổ sung cột slug cho bảng rooms (nếu chưa có)
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_slug ON public.rooms(slug);

-- 2. Bổ sung cột slug cho bảng marketplace_items (nếu chưa có)
ALTER TABLE public.marketplace_items 
ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_items_slug ON public.marketplace_items(slug);

-- 3. Bổ sung cột slug cho bảng roommate_posts (nếu chưa có)
ALTER TABLE public.roommate_posts 
ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_roommate_posts_slug ON public.roommate_posts(slug);

-- 4. Kích hoạt extension unaccent nếu chưa có
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 5. Hàm PostgreSQL tự động sinh slug tiếng Việt không dấu chuẩn SEO
CREATE OR REPLACE FUNCTION public.generate_seo_slug(title_text TEXT, record_id TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_title TEXT;
  short_id TEXT;
BEGIN
  IF title_text IS NULL OR trim(title_text) = '' THEN
    title_text := 'tin-dang';
  END IF;

  -- Lấy 6 ký tự cuối của ID để chống trùng lặp
  short_id := RIGHT(REPLACE(record_id, '-', ''), 6);
  
  -- Chuyển đổi tiếng Việt có dấu thành không dấu
  clean_title := lower(unaccent(title_text));
  -- Thay thế ký tự không phải chữ và số thành dấu gạch ngang
  clean_title := regexp_replace(clean_title, '[^a-z0-9]+', '-', 'g');
  -- Loại bỏ gạch ngang ở đầu và cuối
  clean_title := trim(both '-' from clean_title);
  -- Giới hạn độ dài tối đa 80 ký tự
  clean_title := substring(clean_title from 1 for 80);
  
  RETURN clean_title || '-' || short_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
