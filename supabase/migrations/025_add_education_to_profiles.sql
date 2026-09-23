-- ==============================================================================
-- MIGRATION: 025_add_education_to_profiles.sql
-- Bổ sung các cột thông tin học vấn (university, student_year) vào bảng public.profiles
-- ==============================================================================

-- 1. Bổ sung các cột học vấn vào bảng profiles nếu chưa tồn tại
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_year TEXT;

-- 2. Đảm bảo tính tương thích ngược và đồng bộ dữ liệu hiện có giữa school <-> university và year <-> student_year
UPDATE public.profiles
SET university = school
WHERE university IS NULL AND school IS NOT NULL;

UPDATE public.profiles
SET student_year = year
WHERE student_year IS NULL AND year IS NOT NULL;

-- 3. Tạo comment giải thích ý nghĩa các cột
COMMENT ON COLUMN public.profiles.university IS 'Lưu tên Trường Đại học / Nơi làm việc của người dùng';
COMMENT ON COLUMN public.profiles.student_year IS 'Lưu Năm học (ví dụ: Năm 1, Năm 4, Cựu sinh viên)';
