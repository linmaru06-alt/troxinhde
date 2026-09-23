-- ==============================================================================
-- MIGRATION 021: VÁ TOÀN DIỆN LỖ HỔNG RLS GUEST LEAK, TÁCH PROFILE_PRIVATE & DENORMALIZE
-- ==============================================================================

-- 1. CẬP NHẬT FUNCTION public.current_profile_id():
-- Bỏ vế khớp email, chỉ khớp firebase_uid để tránh nhận nhầm/chiếm quyền profile.
-- Thêm SET search_path chống leo quyền qua schema injection.
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT id FROM public.profiles
  WHERE firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id')
  LIMIT 1;
$$;

-- 2. FUNCTION HELPER public.is_admin():
-- Đọc app_role hoặc role từ profiles theo current_profile_id()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = public.current_profile_id()
      AND (app_role = 'admin' OR role = 'admin' OR admin_role = 'superadmin')
  );
$$;

-- 3. TẠO BẢNG public.profile_private VÀ DI CHUYỂN DỮ LIỆU NHẠY CẢM (IDEMPOTENT)
CREATE TABLE IF NOT EXISTS public.profile_private (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  student_card_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner or admin select private profile" ON public.profile_private;
DROP POLICY IF EXISTS "Owner or admin insert private profile" ON public.profile_private;
DROP POLICY IF EXISTS "Owner or admin update private profile" ON public.profile_private;
DROP POLICY IF EXISTS "Admins delete private profile" ON public.profile_private;

CREATE POLICY "Owner or admin select private profile" ON public.profile_private
  FOR SELECT USING (
    profile_id = public.current_profile_id() 
    OR public.is_admin()
  );

CREATE POLICY "Owner or admin insert private profile" ON public.profile_private
  FOR INSERT WITH CHECK (
    profile_id = public.current_profile_id()
    OR public.is_admin()
    OR profile_id IN (
      SELECT id FROM public.profiles 
      WHERE firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id')
    )
  );

CREATE POLICY "Owner or admin update private profile" ON public.profile_private
  FOR UPDATE USING (
    profile_id = public.current_profile_id() 
    OR public.is_admin()
  );

CREATE POLICY "Admins delete private profile" ON public.profile_private
  FOR DELETE USING (public.is_admin());

-- Copy dữ liệu từ profiles sang profile_private nếu cột còn tồn tại
DO $$
BEGIN
  -- Tạo sẵn dòng profile_private cho toàn bộ profiles hiện có nếu chưa có
  INSERT INTO public.profile_private (profile_id)
  SELECT id FROM public.profiles
  ON CONFLICT (profile_id) DO NOTHING;

  -- Copy email
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    UPDATE public.profile_private pp
    SET email = p.email
    FROM public.profiles p
    WHERE pp.profile_id = p.id AND p.email IS NOT NULL AND pp.email IS NULL;
    
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
  END IF;

  -- Copy student_card_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'student_card_url'
  ) THEN
    UPDATE public.profile_private pp
    SET student_card_url = p.student_card_url
    FROM public.profiles p
    WHERE pp.profile_id = p.id AND p.student_card_url IS NOT NULL AND pp.student_card_url IS NULL;

    ALTER TABLE public.profiles DROP COLUMN IF EXISTS student_card_url;
  END IF;
END $$;

-- Trigger tự động tạo dòng profile_private khi có profile mới được chèn
CREATE OR REPLACE FUNCTION public.handle_new_profile_private()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  INSERT INTO public.profile_private (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_profile_private ON public.profiles;
CREATE TRIGGER trg_new_profile_private
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_private();


-- 4. DENORMALIZE THÔNG TIN LIÊN HỆ CÔNG KHAI VÀO 3 BẢNG TIN ĐĂNG + REVIEWS
-- 4.1. Bảng marketplace_items:
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS seller_avatar TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS seller_phone TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;

-- Copy dữ liệu hiện có từ profiles sang marketplace_items
UPDATE public.marketplace_items m
SET 
  seller_name = COALESCE(p.full_name, p.name, m.seller_name, 'Sinh viên Trọ Xinh'),
  seller_avatar = COALESCE(p.avatar_url, m.seller_avatar, '/images/user-avatar.jpg'),
  seller_phone = CASE 
    WHEN m.status IN ('sold', 'hidden', 'rejected', 'Đã bán', 'Đã ẩn', 'Bị từ chối') THEN NULL
    ELSE COALESCE(p.phone, m.seller_phone, m.contact_phone)
  END
FROM public.profiles p
WHERE (m.user_id = p.id OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'seller_id') AND m.seller_id = p.id));

-- 4.2. Bảng rooms:
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner_avatar TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;

UPDATE public.rooms r
SET 
  owner_name = COALESCE(p.full_name, p.name, r.owner_name, 'Chủ trọ'),
  owner_avatar = COALESCE(p.avatar_url, r.owner_avatar, '/images/user-avatar.jpg'),
  owner_phone = CASE 
    WHEN r.availability_status = 'rented' OR r.status IN ('rented', 'hidden', 'Đã cho thuê', 'Chờ duyệt') THEN NULL
    ELSE COALESCE(p.phone, r.owner_phone)
  END
FROM public.profiles p
WHERE r.owner_id = p.id;

-- 4.3. Bảng roommate_posts:
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS poster_name TEXT;
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS poster_avatar TEXT;
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS poster_phone TEXT;
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;

UPDATE public.roommate_posts r
SET 
  poster_name = COALESCE(p.full_name, p.name, r.poster_name, 'Thành viên Trọ Xinh'),
  poster_avatar = COALESCE(p.avatar_url, r.poster_avatar, '/images/user-avatar.jpg'),
  poster_phone = CASE 
    WHEN r.status IN ('closed', 'hidden', 'Đã ghép', 'Đã ẩn') THEN NULL
    ELSE COALESCE(p.phone, r.poster_phone, r.contact_phone)
  END
FROM public.profiles p
WHERE (r.user_id = p.id OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roommate_posts' AND column_name = 'poster_id') AND r.poster_id = p.id));

-- 4.4. Bảng reviews:
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_avatar TEXT;

UPDATE public.reviews rev
SET 
  reviewer_name = COALESCE(p.full_name, p.name, rev.reviewer_name, 'Khách thuê Trọ Xinh'),
  reviewer_avatar = COALESCE(p.avatar_url, rev.reviewer_avatar, '/images/user-avatar.jpg')
FROM public.profiles p
WHERE (rev.reviewer_id = p.id OR rev.user_id = p.id);


-- 5. TRIGGERS TỰ ĐỘNG HÓA DENORMALIZE & BẢO VỆ SỐ ĐIỆN THOẠI
-- 5.1. Trigger BEFORE INSERT OR UPDATE trên marketplace_items:
CREATE OR REPLACE FUNCTION public.sync_marketplace_item_seller_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_phone TEXT;
  v_name TEXT;
  v_avatar TEXT;
BEGIN
  v_uid := COALESCE(NEW.user_id, (CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'seller_id') THEN NEW.seller_id ELSE NULL END));
  
  IF v_uid IS NOT NULL THEN
    SELECT full_name, avatar_url, phone
    INTO v_name, v_avatar, v_phone
    FROM public.profiles
    WHERE id = v_uid;
    
    NEW.seller_name := COALESCE(v_name, NEW.seller_name, 'Sinh viên Trọ Xinh');
    NEW.seller_avatar := COALESCE(v_avatar, NEW.seller_avatar, '/images/user-avatar.jpg');
    
    -- Nếu show_phone = true và tin đang available/còn hàng thì gán số điện thoại
    IF (NEW.show_phone IS TRUE OR NEW.show_phone IS NULL) AND
       NEW.status NOT IN ('sold', 'hidden', 'rejected', 'Đã bán', 'Đã ẩn', 'Bị từ chối') THEN
      NEW.seller_phone := v_phone;
      NEW.contact_phone := v_phone;
    ELSE
      NEW.seller_phone := NULL;
      NEW.contact_phone := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_marketplace_item_seller ON public.marketplace_items;
CREATE TRIGGER trg_sync_marketplace_item_seller
  BEFORE INSERT OR UPDATE ON public.marketplace_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_marketplace_item_seller_info();

-- 5.2. Trigger BEFORE INSERT OR UPDATE trên rooms:
CREATE OR REPLACE FUNCTION public.sync_room_owner_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_phone TEXT;
  v_name TEXT;
  v_avatar TEXT;
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    SELECT full_name, avatar_url, phone
    INTO v_name, v_avatar, v_phone
    FROM public.profiles
    WHERE id = NEW.owner_id;
    
    NEW.owner_name := COALESCE(v_name, NEW.owner_name, 'Chủ trọ');
    NEW.owner_avatar := COALESCE(v_avatar, NEW.owner_avatar, '/images/user-avatar.jpg');
    
    -- Nếu phòng chưa thuê và show_phone = true
    IF (NEW.show_phone IS TRUE OR NEW.show_phone IS NULL) AND
       (NEW.availability_status IS NULL OR NEW.availability_status <> 'rented') AND
       (NEW.status IS NULL OR NEW.status NOT IN ('rented', 'hidden', 'Đã cho thuê', 'Chờ duyệt')) THEN
      NEW.owner_phone := v_phone;
    ELSE
      NEW.owner_phone := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_room_owner ON public.rooms;
CREATE TRIGGER trg_sync_room_owner
  BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_room_owner_info();

-- 5.3. Trigger BEFORE INSERT OR UPDATE trên roommate_posts:
CREATE OR REPLACE FUNCTION public.sync_roommate_post_poster_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID;
  v_phone TEXT;
  v_name TEXT;
  v_avatar TEXT;
BEGIN
  v_uid := COALESCE(NEW.user_id, (CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roommate_posts' AND column_name = 'poster_id') THEN NEW.poster_id ELSE NULL END));
  
  IF v_uid IS NOT NULL THEN
    SELECT full_name, avatar_url, phone
    INTO v_name, v_avatar, v_phone
    FROM public.profiles
    WHERE id = v_uid;
    
    NEW.poster_name := COALESCE(v_name, NEW.poster_name, 'Thành viên Trọ Xinh');
    NEW.poster_avatar := COALESCE(v_avatar, NEW.poster_avatar, '/images/user-avatar.jpg');
    
    IF (NEW.show_phone IS TRUE OR NEW.show_phone IS NULL) AND
       NEW.status NOT IN ('closed', 'hidden', 'Đã ghép', 'Đã ẩn') THEN
      NEW.poster_phone := v_phone;
      NEW.contact_phone := v_phone;
    ELSE
      NEW.poster_phone := NULL;
      NEW.contact_phone := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_roommate_post_poster ON public.roommate_posts;
CREATE TRIGGER trg_sync_roommate_post_poster
  BEFORE INSERT OR UPDATE ON public.roommate_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_roommate_post_poster_info();

-- 5.4. Trigger AFTER UPDATE ON profiles:
-- Khi người dùng đổi tên, avatar hoặc số điện thoại thì tự động cập nhật các tin đăng của họ
CREATE OR REPLACE FUNCTION public.propagate_profile_updates_to_listings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Chỉ chạy nếu full_name, avatar_url hoặc phone thực sự thay đổi
  IF (NEW.full_name IS DISTINCT FROM OLD.full_name) OR
     (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url) OR
     (NEW.phone IS DISTINCT FROM OLD.phone) THEN
     
    -- Cập nhật marketplace_items
    UPDATE public.marketplace_items
    SET 
      seller_name = COALESCE(NEW.full_name, NEW.name, seller_name),
      seller_avatar = COALESCE(NEW.avatar_url, seller_avatar),
      seller_phone = CASE 
        WHEN (show_phone IS TRUE OR show_phone IS NULL) AND status NOT IN ('sold', 'hidden', 'rejected', 'Đã bán', 'Đã ẩn', 'Bị từ chối') THEN NEW.phone
        ELSE NULL 
      END
    WHERE (user_id = NEW.id OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'seller_id') AND seller_id = NEW.id));
    
    -- Cập nhật rooms
    UPDATE public.rooms
    SET 
      owner_name = COALESCE(NEW.full_name, NEW.name, owner_name),
      owner_avatar = COALESCE(NEW.avatar_url, owner_avatar),
      owner_phone = CASE 
        WHEN (show_phone IS TRUE OR show_phone IS NULL) AND availability_status <> 'rented' AND status NOT IN ('rented', 'hidden', 'Đã cho thuê', 'Chờ duyệt') THEN NEW.phone
        ELSE NULL 
      END
    WHERE owner_id = NEW.id;
    
    -- Cập nhật roommate_posts
    UPDATE public.roommate_posts
    SET 
      poster_name = COALESCE(NEW.full_name, NEW.name, poster_name),
      poster_avatar = COALESCE(NEW.avatar_url, poster_avatar),
      poster_phone = CASE 
        WHEN (show_phone IS TRUE OR show_phone IS NULL) AND status NOT IN ('closed', 'hidden', 'Đã ghép', 'Đã ẩn') THEN NEW.phone
        ELSE NULL 
      END
    WHERE (user_id = NEW.id OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roommate_posts' AND column_name = 'poster_id') AND poster_id = NEW.id));
    
    -- Cập nhật reviews
    UPDATE public.reviews
    SET 
      reviewer_name = COALESCE(NEW.full_name, NEW.name, reviewer_name),
      reviewer_avatar = COALESCE(NEW.avatar_url, reviewer_avatar)
    WHERE (reviewer_id = NEW.id OR user_id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_profile_updates ON public.profiles;
CREATE TRIGGER trg_propagate_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_profile_updates_to_listings();

-- 5.5. Trigger AFTER DELETE ON profiles: Xóa/set NULL liên hệ denormalize
CREATE OR REPLACE FUNCTION public.handle_profile_deleted_denormalize()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  UPDATE public.marketplace_items
  SET seller_phone = NULL, seller_name = 'Người dùng đã xóa tài khoản'
  WHERE (user_id = OLD.id OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'seller_id') AND seller_id = OLD.id));

  UPDATE public.rooms
  SET owner_phone = NULL, owner_name = 'Chủ phòng đã xóa tài khoản'
  WHERE owner_id = OLD.id;

  UPDATE public.roommate_posts
  SET poster_phone = NULL, poster_name = 'Người dùng đã xóa tài khoản'
  WHERE (user_id = OLD.id OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roommate_posts' AND column_name = 'poster_id') AND poster_id = OLD.id));

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_deleted_denormalize ON public.profiles;
CREATE TRIGGER trg_profile_deleted_denormalize
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_deleted_denormalize();


-- 6. TRIGGER BẢO VỆ CỘT HỆ THỐNG TRÊN PROFILES
CREATE OR REPLACE FUNCTION public.protect_profile_system_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF (NEW.app_role IS DISTINCT FROM OLD.app_role) OR
     (NEW.role IS DISTINCT FROM OLD.role) OR
     (NEW.admin_role IS DISTINCT FROM OLD.admin_role) OR
     (NEW.is_banned IS DISTINCT FROM OLD.is_banned) OR
     (NEW.banned_until IS DISTINCT FROM OLD.banned_until) OR
     (NEW.banned_reason IS DISTINCT FROM OLD.banned_reason) THEN
    
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Bạn không có quyền sửa đổi các trường hệ thống của tài khoản' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_system_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_system_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_system_columns();


-- 7. CẬP NHẬT RLS POLICIES AN TOÀN TUYỆT ĐỐI CHO TẤT CẢ CÁC BẢNG

-- 7.1. PROFILES: KHÓA CHẶT SELECT BẰNG current_profile_id() IS NOT NULL
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Chỉ người ĐÃ ĐĂNG NHẬP mới đọc được profiles (chặn cào dữ liệu SĐT bằng anon key)
CREATE POLICY "Authenticated users read profiles" ON public.profiles
  FOR SELECT USING (public.current_profile_id() IS NOT NULL);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id')
    OR public.is_admin()
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    id = public.current_profile_id() 
    OR public.is_admin()
  );

-- 7.2. CONVERSATIONS: Vá triệt để lộ cuộc trò chuyện cho khách
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can delete conversations" ON public.conversations;

CREATE POLICY "Participants view conversations" ON public.conversations
  FOR SELECT USING (
    public.current_profile_id() IS NOT NULL
    AND (
      participant_1 = public.current_profile_id()
      OR participant_2 = public.current_profile_id()
      OR public.is_admin()
    )
  );

CREATE POLICY "Participants update conversations" ON public.conversations
  FOR UPDATE USING (
    public.current_profile_id() IS NOT NULL
    AND (
      participant_1 = public.current_profile_id()
      OR participant_2 = public.current_profile_id()
      OR public.is_admin()
    )
  );

CREATE POLICY "Admins can delete conversations" ON public.conversations
  FOR DELETE USING (public.is_admin());

-- 7.3. MESSAGES: Vá triệt để lộ tin nhắn riêng tư
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access messages" ON public.messages;
DROP POLICY IF EXISTS "Participants view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own text messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON public.messages;

CREATE POLICY "Participants view messages" ON public.messages
  FOR SELECT USING (
    public.current_profile_id() IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND (c.participant_1 = public.current_profile_id() OR c.participant_2 = public.current_profile_id())
      )
    )
  );

CREATE POLICY "Users can insert own text messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id IS NOT NULL 
    AND sender_id = public.current_profile_id()
    AND (type = 'text' OR type IS NULL)
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_1 = sender_id OR c.participant_2 = sender_id)
    )
  );

CREATE POLICY "Admins can delete messages" ON public.messages
  FOR DELETE USING (public.is_admin());

-- 7.4. REPORTS: Dọn dẹp policy cũ 017 và bắt buộc đăng nhập
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view and manage all reports" ON public.reports;
DROP POLICY IF EXISTS "Users view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins manage reports" ON public.reports;

CREATE POLICY "Users can insert own reports" ON public.reports
  FOR INSERT WITH CHECK (
    reporter_id IS NOT NULL
    AND reporter_id = public.current_profile_id()
  );

CREATE POLICY "Users view own reports" ON public.reports
  FOR SELECT USING (
    public.current_profile_id() IS NOT NULL
    AND (
      reporter_id = public.current_profile_id()
      OR public.is_admin()
    )
  );

CREATE POLICY "Admins manage reports" ON public.reports
  FOR ALL USING (public.is_admin());

-- 7.5. MARKETPLACE_ITEMS: Mở SELECT công khai, giới hạn INSERT/UPDATE/DELETE
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access marketplace_items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Public view marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Owners manage own items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Owners or admins manage marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Owners or admins insert marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Owners or admins update marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Owners or admins delete marketplace items" ON public.marketplace_items;

CREATE POLICY "Public view marketplace items" ON public.marketplace_items
  FOR SELECT USING (true);

CREATE POLICY "Owners or admins insert marketplace items" ON public.marketplace_items
  FOR INSERT WITH CHECK (
    user_id = public.current_profile_id()
    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'seller_id') AND seller_id = public.current_profile_id())
    OR public.is_admin()
  );

CREATE POLICY "Owners or admins update marketplace items" ON public.marketplace_items
  FOR UPDATE USING (
    user_id = public.current_profile_id()
    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'seller_id') AND seller_id = public.current_profile_id())
    OR public.is_admin()
  );

CREATE POLICY "Owners or admins delete marketplace items" ON public.marketplace_items
  FOR DELETE USING (
    user_id = public.current_profile_id()
    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'seller_id') AND seller_id = public.current_profile_id())
    OR public.is_admin()
  );

-- 7.6. ROOMS: Đảm bảo công chúng đọc được tin phòng có thông tin chủ trọ đã denormalize
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view rooms" ON public.rooms;
CREATE POLICY "Public view rooms" ON public.rooms FOR SELECT USING (true);

-- 7.7. ROOMMATE_POSTS: Đảm bảo công chúng đọc được tin bạn trọ có thông tin đã denormalize
ALTER TABLE public.roommate_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view roommate posts" ON public.roommate_posts;
CREATE POLICY "Public view roommate posts" ON public.roommate_posts FOR SELECT USING (true);

-- 7.8. REVIEWS: Đảm bảo công chúng đọc được đánh giá có reviewer_name/avatar đã denormalize
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view reviews" ON public.reviews;
CREATE POLICY "Public view reviews" ON public.reviews FOR SELECT USING (true);
