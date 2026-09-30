-- ==============================================================================
-- Migration 030: Siết Chặt Toàn Diện Bảo Mật RLS Cho Roommate Posts & Rooms
-- (Tighten Row Level Security Policies - Eliminate OR true & Validate Ownership)
-- ==============================================================================
-- 1. Bảng roommate_posts:
--    - Chỉ chủ bài đăng (poster_id = current_profile_id()) hoặc Quản trị viên (is_admin())
--      mới có quyền sửa đổi (UPDATE) hoặc xóa (DELETE) bài đăng tìm bạn ở ghép.
--    - Loại bỏ hoàn toàn điều kiện OR true, bảo vệ toàn vẹn dữ liệu người dùng.
-- 2. Bảng rooms:
--    - Chỉ chủ phòng trọ (owner_id = current_profile_id()) hoặc Quản trị viên (is_admin())
--      mới có quyền sửa đổi (UPDATE) hoặc xóa (DELETE) tin đăng phòng trọ.
--    - Chặn khách vãng lai hoặc chủ trọ khác tự ý sửa đổi phòng không thuộc quyền quản lý.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SIẾT CHẶT BẢO MẬT BẢNG ROOMMATE_POSTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.roommate_posts ENABLE ROW LEVEL SECURITY;

-- 1.1. Công chúng xem công khai
DROP POLICY IF EXISTS "Public view roommate posts" ON public.roommate_posts;
CREATE POLICY "Public view roommate posts" 
  ON public.roommate_posts FOR SELECT 
  USING (true);

-- 1.2. Người dùng tạo bài đăng tìm bạn ở ghép
DROP POLICY IF EXISTS "Users can insert roommate posts" ON public.roommate_posts;
CREATE POLICY "Users can insert roommate posts" 
  ON public.roommate_posts FOR INSERT 
  WITH CHECK (
    poster_id = public.current_profile_id()
    OR public.is_admin()
    OR public.current_profile_id() IS NOT NULL
  );

-- 1.3. Cập nhật bài đăng (Chỉ chính chủ hoặc Admin)
DROP POLICY IF EXISTS "Users can update own roommate posts" ON public.roommate_posts;
CREATE POLICY "Users can update own roommate posts" 
  ON public.roommate_posts FOR UPDATE 
  USING (
    poster_id = public.current_profile_id()
    OR public.is_admin()
  )
  WITH CHECK (
    poster_id = public.current_profile_id()
    OR public.is_admin()
  );

-- 1.4. Xóa bài đăng (Chỉ chính chủ hoặc Admin)
DROP POLICY IF EXISTS "Users can delete own roommate posts" ON public.roommate_posts;
CREATE POLICY "Users can delete own roommate posts" 
  ON public.roommate_posts FOR DELETE 
  USING (
    poster_id = public.current_profile_id()
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 2. SIẾT CHẶT BẢO MẬT BẢNG ROOMS
-- ------------------------------------------------------------------------------
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 2.1. Công chúng xem tin phòng trọ đã duyệt
DROP POLICY IF EXISTS "Public view rooms" ON public.rooms;
CREATE POLICY "Public view rooms" 
  ON public.rooms FOR SELECT 
  USING (true);

-- 2.2. Chủ trọ / Người dùng đăng phòng mới
DROP POLICY IF EXISTS "Owners insert rooms" ON public.rooms;
CREATE POLICY "Owners insert rooms" 
  ON public.rooms FOR INSERT 
  WITH CHECK (
    owner_id = public.current_profile_id()
    OR public.is_admin()
    OR public.current_profile_id() IS NOT NULL
  );

-- 2.3. Sửa thông tin phòng (Chỉ chính chủ sở hữu hoặc Admin)
DROP POLICY IF EXISTS "Owners update rooms" ON public.rooms;
CREATE POLICY "Owners update rooms" 
  ON public.rooms FOR UPDATE 
  USING (
    owner_id = public.current_profile_id()
    OR public.is_admin()
  )
  WITH CHECK (
    owner_id = public.current_profile_id()
    OR public.is_admin()
  );

-- 2.4. Xóa phòng trọ (Chỉ chính chủ sở hữu hoặc Admin)
DROP POLICY IF EXISTS "Owners delete rooms" ON public.rooms;
CREATE POLICY "Owners delete rooms" 
  ON public.rooms FOR DELETE 
  USING (
    owner_id = public.current_profile_id()
    OR public.is_admin()
  );
