# Danh Sách Nhiệm Vụ: Hệ Thống Tự Động Hóa URL & Định Tuyến Hai Vùng
> Liên kết Kế hoạch: [plan.md](./plan.md)  
> Tiến độ: 100% Hoàn thành  

---

## Giai đoạn 1: Chuẩn bị CSDL & Tiện ích Sinh Slug (Database & Utilities)
- [x] **Task 1.1:** Xuất đoạn mã 1-Click SQL bổ sung cột `slug` và hàm sinh slug tự động cho các bảng `rooms`, `marketplace_items`, `roommate_posts` (`supabase/migrations/20261122_auto_seo_slugs.sql`).
- [x] **Task 1.2:** Viết tiện ích tạo slug TypeScript phía client tại `src/utils/slugify.ts` (bổ sung `buildRoomSeoUrl`, `buildRoommateSeoUrl`, `buildMarketplaceSeoUrl` với hỗ trợ quận huyện và danh mục).
- [x] **Task 1.3:** Cập nhật TypeScript types trong `src/types/index.ts` và `src/types/supabase.ts` hỗ trợ trường `slug?: string`.

## Giai đoạn 2: Chuẩn hóa Định tuyến Quản trị Sâu (Private Deep Linking Zone)
- [x] **Task 2.1:** Rà soát và xác nhận toàn bộ 3 Lớp Sổ khách & Hợp đồng (`/chu-tro/hop-dong`, `/phong/:roomId`, `/chi-tiet/:contractId`) đồng bộ 100% với URL trình duyệt.
- [x] **Task 2.2:** Rà soát các tính năng K23 PMS khác (Chốt điện nước, Hóa đơn, Đẩy tin) bảo đảm mọi tầng chi tiết đều có đường dẫn sâu.
- [x] **Task 2.3:** Thêm component bảo vệ Privacy Shield tự động inject `<meta name="robots" content="noindex, nofollow" />` vào `ProtectedRoute.tsx` cho toàn bộ các route nội bộ (`/chu-tro/*`, `/admin/*`, `/ho-so/*`).

## Giai đoạn 3: Nâng cấp URL Chuẩn SEO Công Khai (Public SEO Zone)
- [x] **Task 3.1:** Cập nhật `src/App.tsx` hỗ trợ đầy đủ các định dạng: Route cũ (`/phong/:id`) và Route SEO mới (`/phong-tro/:id`, `/phong-tro/:district/:id`, `/tim-o-ghep/:district/:id`, `/cho-do-cu/:category/:id`).
- [x] **Task 3.2:** Bóc tách ID thông minh với cơ chế Double-Dash (`slug--id`) giúp các trang chi tiết đọc chuẩn ID mà không phụ thuộc vào độ dài hay thay đổi của slug.
- [x] **Task 3.3:** Giữ vững 100% khả năng tương thích ngược (Backward Compatibility) với các link đã tạo trước đây.

## Giai đoạn 4: Thiết lập Chốt chặn Tự động cho Agent (Agent Skill & Rules)
- [x] **Task 4.1:** Tạo Skill mới `.agents/skills/troxinh-routing-guard/SKILL.md` hướng dẫn AI tự động kiểm tra route mỗi khi code màn hình mới.
- [x] **Task 4.2:** Viết script kiểm tra tự động `scripts/test-routing-parity.mjs` quét toàn bộ codebase để kiểm thử thuật toán và bảo vệ route.

## Giai đoạn 5: Kiểm thử & Nghiệm thu (Quality Gates)
- [x] **Task 5.1:** Kiểm tra kiểu dữ liệu TypeScript không có lỗi.
- [x] **Task 5.2:** Chạy `npm run build` (`vite build`) thành công 100% trong 17.89s.
- [x] **Task 5.3:** Chạy `node scripts/test-routing-parity.mjs` và các test suite hệ thống vượt qua 100%.
