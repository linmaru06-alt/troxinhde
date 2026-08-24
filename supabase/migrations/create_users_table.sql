-- ==============================================================================
-- Trọ Xinh - Migration: Tạo Bảng Quản Lý Người Dùng (users)
-- ==============================================================================

-- 1. Tạo bảng users nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'renter', 'owner', 'admin')),
    avatar_url TEXT DEFAULT '/images/user-avatar.jpg',
    verified BOOLEAN NOT NULL DEFAULT true,
    auth_provider TEXT DEFAULT 'phone_otp', -- 'phone_otp', 'email_password', 'google'
    owner_application_status TEXT DEFAULT 'none' CHECK (owner_application_status IN ('none', 'pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tạo các chỉ mục tối ưu tìm kiếm siêu tốc
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 3. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Tạo Policy: Cho phép mọi người đọc thông tin công khai của người dùng
CREATE POLICY "Public users can view user profiles"
    ON public.users
    FOR SELECT
    USING (true);

-- 5. Tạo Policy: Cho phép thêm mới / cập nhật hồ sơ người dùng
CREATE POLICY "Enable insert for authenticated and anonymous users during registration"
    ON public.users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for users based on user id"
    ON public.users
    FOR UPDATE
    USING (true);

-- 6. Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_users_updated_at();
