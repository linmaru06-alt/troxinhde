-- 048_marketplace_room_closed_cycle.sql
-- USP 2: Vòng đời chuyển trọ khép kín: Gắn đồ cũ thanh lý / pass đồ trực tiếp với phòng trọ và tòa nhà

-- 1. Bổ sung các cột liên kết phòng và tòa nhà (an toàn, không phá hủy dữ liệu)
ALTER TABLE public.marketplace_items 
ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_room_transfer boolean DEFAULT false;

-- 2. Đánh chỉ mục Index tối ưu hóa truy vấn tốc độ cao (<10ms)
CREATE INDEX IF NOT EXISTS idx_marketplace_items_room_id 
ON public.marketplace_items(room_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_building_id 
ON public.marketplace_items(building_id);

-- 3. Cập nhật RLS Policy đảm bảo đồ khả dụng hiển thị công khai trên trang phòng
DROP POLICY IF EXISTS "Public can view available marketplace items" ON public.marketplace_items;
CREATE POLICY "Public can view available marketplace items" 
ON public.marketplace_items 
FOR SELECT 
USING (
  status = 'available' 
  OR auth.uid() = seller_id
);
