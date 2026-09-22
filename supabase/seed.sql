-- ==============================================================================
-- SUPABASE SEED DATA (TÒA NHÀ & PHÒNG TRỌ BAN ĐẦU)
-- ==============================================================================
DO $$
DECLARE
    v_owner_id UUID;
    v_bld_caugiay UUID;
    v_bld_dongda UUID;
    v_bld_haiba UUID;
BEGIN
    -- Lấy 1 profile chủ trọ có sẵn, nếu chưa có tạo 1 profile mặc định
    SELECT id INTO v_owner_id FROM public.profiles WHERE app_role = 'owner' OR role = 'owner' LIMIT 1;
    
    IF v_owner_id IS NULL THEN
        SELECT id INTO v_owner_id FROM public.profiles LIMIT 1;
    END IF;

    IF v_owner_id IS NULL THEN
        INSERT INTO public.profiles (id, full_name, role, app_role, phone, email)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Chủ Trọ Trọ Xinh', 'owner', 'owner', '0912345678', 'chutro@troxinh.vn')
        ON CONFLICT (id) DO UPDATE SET app_role = 'owner', role = 'owner'
        RETURNING id INTO v_owner_id;
    END IF;

    IF v_owner_id IS NOT NULL THEN
        -- 1. Seed Tòa nhà
        INSERT INTO public.buildings (id, owner_id, name, address, district, city, lat, lng, description, amenities, cover_image_url, status)
        VALUES 
        (
            'b0000000-0000-0000-0000-000000000001',
            v_owner_id,
            'Tòa Nhà TroXinh Cầu Giấy Complex',
            'Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng',
            'Quận Cầu Giấy',
            'Hà Nội',
            21.0368,
            105.7905,
            'Tòa nhà căn hộ dịch vụ và phòng trọ cao cấp, camera an ninh 24/7, thang máy, khóa vân tay.',
            '["Thang máy", "Khóa vân tay", "PCCC đạt chuẩn", "Để xe miễn phí"]'::jsonb, 
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
            'active'
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.buildings (id, owner_id, name, address, district, city, lat, lng, description, amenities, cover_image_url, status)
        VALUES 
        (
            'b0000000-0000-0000-0000-000000000002',
            v_owner_id,
            'Chung Cư Mini Đống Đa - Chùa Láng',
            'Số 82 Chùa Láng, P. Láng Thượng',
            'Quận Đống Đa',
            'Hà Nội',
            21.0227,
            105.8023,
            'Chung cư mini cao cấp gần ĐH Ngoại Thương, ĐH Luật, Ngoại Giao. Giờ giấc tự do 100%.',
            '["Thang máy", "Bếp riêng", "Ban công thoáng", "Khóa vân tay"]'::jsonb,
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
            'active'
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.buildings (id, owner_id, name, address, district, city, lat, lng, description, amenities, cover_image_url, status)
        VALUES 
        (
            'b0000000-0000-0000-0000-000000000003',
            v_owner_id,
            'Khu Trọ Sinh Viên Bách Khoa - Kinh Tế',
            'Số 45 Ngõ 10 Tạ Quang Bửu, P. Bách Khoa',
            'Quận Hai Bà Trưng',
            'Hà Nội',
            21.0042,
            105.8458,
            'Vị trí đắc địa cách Bách Khoa 200m, Kinh Tế Quốc Dân 400m, Xây Dựng 500m. Khu dân trí cao, yên tĩnh.',
            '["Điều hòa", "Bình nóng lạnh", "Chỗ để xe rộng", "Camera an ninh"]'::jsonb,
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            'active'
        )
        ON CONFLICT (id) DO NOTHING;

        -- 2. Seed Phòng Trọ Thực Tế
        INSERT INTO public.rooms (
            id, building_id, owner_id, name, title, room_number, price, deposit, area, floor, room_type,
            amenities, description, status, availability_status, moderation_status, images, is_boosted, boost_badge
        )
        VALUES 
        (
            'r0000000-0000-0000-0000-000000000001',
            'b0000000-0000-0000-0000-000000000001',
            v_owner_id,
            'Phòng Studio Full Đồ Ban Công Thoáng Mát Cầu Giấy',
            'Phòng Studio Full Đồ Ban Công Thoáng Mát Cầu Giấy',
            'P.302',
            3500000,
            3500000,
            25,
            3,
            'Phòng khép kín',
            '["Điều hòa", "Nóng lạnh", "Tủ lạnh", "Máy giặt chung", "Ban công", "Khóa vân tay", "Thang máy"]'::jsonb,
            'Phòng trọ cao cấp thiết kế hiện đại, đầy đủ tiện nghi, view thoáng mát, cách ĐHQG và ĐH Sư Phạm 800m. Có ban công riêng đón ánh sáng tự nhiên.',
            'Còn trống',
            'available',
            'approved',
            '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"]'::jsonb,
            true,
            'Phòng Nổi Bật VIP'
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.rooms (
            id, building_id, owner_id, name, title, room_number, price, deposit, area, floor, room_type,
            amenities, description, status, availability_status, moderation_status, images, is_boosted, boost_badge
        )
        VALUES 
        (
            'r0000000-0000-0000-0000-000000000002',
            'b0000000-0000-0000-0000-000000000002',
            v_owner_id,
            'Căn Hộ Mini Khép Kín Gần ĐH Ngoại Thương',
            'Căn Hộ Mini Khép Kín Gần ĐH Ngoại Thương',
            'P.501',
            4200000,
            4200000,
            32,
            5,
            'Chung cư mini',
            '["Điều hòa Inverter", "Nóng lạnh", "Tủ bếp riêng", "Máy giặt riêng", "Giường nệm cao cấp", "Thang máy", "PCCC chuẩn"]'::jsonb,
            'Căn hộ mini cao cấp cách cổng trường Ngoại Thương và Ngoại Giao 500m. Thiết kế bếp riêng biệt không ám mùi, giờ giấc tự do, bảo vệ 24/7.',
            'Còn trống',
            'available',
            'approved',
            '["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]'::jsonb,
            true,
            'Xác Minh PCCC'
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.rooms (
            id, building_id, owner_id, name, title, room_number, price, deposit, area, floor, room_type,
            amenities, description, status, availability_status, moderation_status, images, is_boosted, boost_badge
        )
        VALUES 
        (
            'r0000000-0000-0000-0000-000000000003',
            'b0000000-0000-0000-0000-000000000003',
            v_owner_id,
            'Phòng Trọ Giá Rẻ Sinh Viên Bách Kinh Xây',
            'Phòng Trọ Giá Rẻ Sinh Viên Bách Kinh Xây',
            'P.201',
            2600000,
            2600000,
            20,
            2,
            'Phòng trọ giá rẻ',
            '["Điều hòa", "Nóng lạnh", "Wifi tốc độ cao", "Để xe tầng 1"]'::jsonb,
            'Phòng trọ sạch sẽ, điện nước giá dân có công tơ riêng, cách trường ĐH Bách Khoa chỉ 3 phút đi bộ. Phù hợp cho 1-2 bạn sinh viên.',
            'Còn trống',
            'available',
            'approved',
            '["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800", "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800"]'::jsonb,
            false,
            NULL
        )
        ON CONFLICT (id) DO NOTHING;

    END IF;
END $$;
