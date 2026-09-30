-- ==============================================================================
-- Migration 029: Tự động duyệt tin đăng & Sửa quyền RLS hiển thị công khai
-- (Auto-Approve & Public Visibility for Rooms, Marketplace, and Roommates)
-- ==============================================================================
-- 1. Bảo đảm đầy đủ các cột dữ liệu cần thiết cho cả 3 bảng (Idempotent)
-- 2. Sửa lỗi RLS bảng roommate_posts: cấp quyền INSERT/UPDATE/DELETE cho người dùng
-- 3. Đặt mặc định Auto-Approve (approved/available) cho bảng rooms
-- 4. Cập nhật Trigger và RLS bảng marketplace_items cho phép tự động duyệt tin ngay
-- 5. Kích hoạt toàn bộ tin cũ đang bị kẹt ở trạng thái pending sang approved
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. BẢO ĐẢM CÁC CỘT DỮ LIỆU CẦN THIẾT TỒN TẠI (TRÁNH LỖI THIẾU CỘT 42703)
-- ------------------------------------------------------------------------------
-- Cột cho roommate_posts
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Cột cho rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Cột cho marketplace_items
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS delivery_methods JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT false;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ------------------------------------------------------------------------------
-- 1. BẢNG ROOMMATE_POSTS: SỬA LỖI RLS INSERT/UPDATE/DELETE
-- ------------------------------------------------------------------------------
ALTER TABLE public.roommate_posts ENABLE ROW LEVEL SECURITY;

-- Công chúng và khách: xem được mọi tin đang tìm bạn ở ghép
DROP POLICY IF EXISTS "Public view roommate posts" ON public.roommate_posts;
CREATE POLICY "Public view roommate posts" 
  ON public.roommate_posts FOR SELECT 
  USING (true);

-- Người dùng (cả Firebase Auth lẫn Demo): được phép tạo bài đăng tìm bạn ở ghép
DROP POLICY IF EXISTS "Users can insert roommate posts" ON public.roommate_posts;
CREATE POLICY "Users can insert roommate posts" 
  ON public.roommate_posts FOR INSERT 
  WITH CHECK (true);

-- Chủ bài đăng hoặc Admin: được phép cập nhật bài đăng của mình
DROP POLICY IF EXISTS "Users can update own roommate posts" ON public.roommate_posts;
CREATE POLICY "Users can update own roommate posts" 
  ON public.roommate_posts FOR UPDATE 
  USING (
    poster_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    poster_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  );

-- Chủ bài đăng hoặc Admin: được phép xóa bài đăng
DROP POLICY IF EXISTS "Users can delete own roommate posts" ON public.roommate_posts;
CREATE POLICY "Users can delete own roommate posts" 
  ON public.roommate_posts FOR DELETE 
  USING (
    poster_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  );

-- ------------------------------------------------------------------------------
-- 2. BẢNG ROOMS: AUTO-APPROVE VÀ KÍCH HOẠT HIỂN THỊ CÔNG KHAI
-- ------------------------------------------------------------------------------
-- Đổi giá trị mặc định sang approved và available
ALTER TABLE public.rooms ALTER COLUMN moderation_status SET DEFAULT 'approved';
ALTER TABLE public.rooms ALTER COLUMN status SET DEFAULT 'available';
ALTER TABLE public.rooms ALTER COLUMN availability_status SET DEFAULT 'available';

-- Đảm bảo RLS cho rooms cho phép công chúng xem phòng
DROP POLICY IF EXISTS "Public view rooms" ON public.rooms;
CREATE POLICY "Public view rooms" 
  ON public.rooms FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Approved rooms are public" ON public.rooms;
CREATE POLICY "Approved rooms are public" 
  ON public.rooms FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Owners insert rooms" ON public.rooms;
CREATE POLICY "Owners insert rooms" 
  ON public.rooms FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owners update rooms" ON public.rooms;
CREATE POLICY "Owners update rooms" 
  ON public.rooms FOR UPDATE 
  USING (
    owner_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    owner_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "Owners delete rooms" ON public.rooms;
CREATE POLICY "Owners delete rooms" 
  ON public.rooms FOR DELETE 
  USING (
    owner_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  );

-- Kích hoạt ngay toàn bộ các phòng trọ đang bị kẹt ở trạng thái pending/chờ duyệt
UPDATE public.rooms 
SET 
  moderation_status = 'approved',
  status = 'available',
  availability_status = 'available',
  rejection_reason = NULL
WHERE 
  moderation_status IS NULL 
  OR moderation_status = 'pending'
  OR status = 'Chờ duyệt'
  OR status = 'pending';

-- ------------------------------------------------------------------------------
-- 3. BẢNG MARKETPLACE_ITEMS: AUTO-APPROVE CHO CHỢ ĐỒ CŨ
-- ------------------------------------------------------------------------------
-- Đổi giá trị mặc định sang available và approved
ALTER TABLE public.marketplace_items ALTER COLUMN status SET DEFAULT 'available';
ALTER TABLE public.marketplace_items ALTER COLUMN moderation_status SET DEFAULT 'approved';

-- Cập nhật Function Trigger guard để tin mới tự động được duyệt (Auto-Approve)
CREATE OR REPLACE FUNCTION public.marketplace_items_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID;
BEGIN
  IF COALESCE(public.is_admin(), false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_caller := public.current_profile_id();
    -- Nếu có caller hợp lệ và chưa có seller_id thì tự gán
    IF v_caller IS NOT NULL AND NEW.seller_id IS NULL THEN
      NEW.seller_id := v_caller;
    END IF;

    -- TỰ ĐỘNG DUYỆT (Auto-Approve): tin mới hiển thị công khai ngay
    IF NEW.status IS NULL OR NEW.status = 'pending' THEN
      NEW.status := 'available';
    END IF;
    NEW.moderation_status := 'approved';
    NEW.rejection_reason := NULL;
    NEW.closed_at := NULL;
    NEW.deleted_at := NULL;
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Trường hợp UPDATE
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Cập nhật RPC cập nhật tin chợ đồ cũ không bị ép về pending khi sửa
CREATE OR REPLACE FUNCTION public.marketplace_update_item(p_item_id UUID, p_changes JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_is_admin BOOLEAN;
  v_item public.marketplace_items%ROWTYPE;
  v_price NUMERIC;
  v_is_free BOOLEAN;
  v_title TEXT;
  v_category TEXT;
  v_condition TEXT;
  v_district TEXT;
  v_location TEXT;
  v_description TEXT;
  v_images JSONB;
  v_delivery JSONB;
  v_is_negotiable BOOLEAN;
  v_show_phone BOOLEAN;
BEGIN
  v_caller := public.current_profile_id();
  v_is_admin := COALESCE(public.is_admin(), false);

  SELECT * INTO v_item FROM public.marketplace_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tin không tồn tại' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_is_admin AND (v_caller IS NULL OR v_item.seller_id IS DISTINCT FROM v_caller) THEN
    RAISE EXCEPTION 'Bạn không có quyền sửa tin này' USING ERRCODE = '42501';
  END IF;

  IF v_item.status = 'deleted' THEN
    RAISE EXCEPTION 'Tin đã bị xóa, không thể chỉnh sửa' USING ERRCODE = '22000';
  END IF;

  -- Phân tích dữ liệu JSON đầu vào
  v_title := CASE WHEN p_changes ? 'title' THEN btrim(p_changes->>'title') ELSE v_item.title END;
  v_price := CASE WHEN p_changes ? 'price' THEN (p_changes->>'price')::numeric ELSE v_item.price END;
  v_is_free := CASE WHEN p_changes ? 'is_free' THEN (p_changes->>'is_free')::boolean ELSE v_item.is_free END;
  IF v_is_free OR v_price < 0 THEN
    v_price := 0;
  END IF;

  v_category := CASE WHEN p_changes ? 'category' THEN btrim(p_changes->>'category') ELSE v_item.category END;
  v_condition := CASE WHEN p_changes ? 'condition' THEN btrim(p_changes->>'condition') ELSE v_item.condition END;
  v_district := CASE WHEN p_changes ? 'district' THEN btrim(p_changes->>'district') ELSE v_item.district END;
  v_location := CASE WHEN p_changes ? 'location' THEN btrim(p_changes->>'location') ELSE v_item.location END;
  v_description := CASE WHEN p_changes ? 'description' THEN btrim(p_changes->>'description') ELSE v_item.description END;

  v_images := CASE WHEN p_changes ? 'image_urls' THEN p_changes->'image_urls' 
                   WHEN p_changes ? 'images' THEN p_changes->'images' 
                   ELSE v_item.image_urls END;

  v_delivery := CASE WHEN p_changes ? 'delivery_methods' THEN p_changes->'delivery_methods' ELSE COALESCE(v_item.delivery_methods, '[]'::jsonb) END;
  v_is_negotiable := CASE WHEN p_changes ? 'is_negotiable' THEN (p_changes->>'is_negotiable')::boolean ELSE COALESCE(v_item.is_negotiable, false) END;
  v_show_phone := CASE WHEN p_changes ? 'show_phone' THEN (p_changes->>'show_phone')::boolean ELSE COALESCE(v_item.show_phone, true) END;

  UPDATE public.marketplace_items
  SET
      title = COALESCE(v_title, v_item.title),
      price = v_price,
      is_free = v_is_free,
      category = v_category,
      condition = v_condition,
      district = v_district,
      location = v_location,
      description = v_description,
      image_urls = v_images,
      images = v_images,
      delivery_methods = v_delivery,
      is_negotiable = v_is_negotiable,
      show_phone = v_show_phone,
      -- Tự động giữ nguyên trạng thái hoặc chuyển sang available/approved
      status = CASE WHEN v_item.status = 'closed' OR v_item.status = 'sold' THEN v_item.status ELSE 'available' END,
      moderation_status = 'approved',
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN to_jsonb(v_item);
END;
$$;

-- Đảm bảo RLS cho phép tạo và xem tin chợ đồ cũ
DROP POLICY IF EXISTS "marketplace_items_insert_owner" ON public.marketplace_items;
CREATE POLICY "marketplace_items_insert_owner" ON public.marketplace_items
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "marketplace_items_select_public" ON public.marketplace_items;
CREATE POLICY "marketplace_items_select_public" ON public.marketplace_items
  FOR SELECT
  USING (status IN ('available', 'sold', 'closed') AND moderation_status = 'approved');

-- Kích hoạt toàn bộ tin chợ cũ đang bị pending sang available và approved
UPDATE public.marketplace_items 
SET 
  status = 'available',
  moderation_status = 'approved',
  rejection_reason = NULL
WHERE 
  status = 'pending' 
  OR moderation_status = 'pending'
  OR status IS NULL 
  OR moderation_status IS NULL;
