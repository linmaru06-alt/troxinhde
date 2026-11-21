---
name: troxinh-routing-guard
description: Quy chuẩn kiến trúc định tuyến và bảo vệ URL cho Trọ Xinh. Dùng mỗi khi tạo màn hình mới, bóc tách luồng giao diện phân tầng, đăng ký route trong App.tsx, hoặc kiểm tra ranh giới bảo mật giữa Public SEO và Private Data.
---

# Trọ Xinh — Routing & URL Architecture Guard (troxinh-routing-guard)

Tài liệu này định nghĩa tiêu chuẩn định tuyến bắt buộc cho hệ thống Trọ Xinh (troxinh.vn). Áp dụng cho mọi lập trình viên và Agent AI khi tạo component trang mới, bóc tách phân tầng (Master-Detail, Tab, Multi-step) hoặc rà soát chất lượng code.

---

## 1. Triết lý Định tuyến Hai Vùng (Dual-Zone Philosophy)

Mọi đường dẫn URL trên Trọ Xinh phải thuộc về 1 trong 2 vùng chiến lược rõ ràng:

### VÙNG 1: Public SEO Zone (Trang Công Khai — Tối Ưu SEO)
* **Đối tượng:** Trang chủ, tìm kiếm, chi tiết phòng trọ, tìm ở ghép, chợ đồ cũ sinh viên, điều khoản, cẩm nang.
* **Cấu trúc URL:** Phải có tính ngữ nghĩa (Semantic SEO Slug), chứa từ khóa khu vực (Hà Nội, Cầu Giấy, Đống Đa...) và phân tách mã định danh bằng Double-Dash (`slug--id`).
  * Phòng trọ: `/phong-tro/:district/:slug--:id` hoặc `/phong/:slug--:id`
  * Ở ghép: `/tim-o-ghep/:district/:slug--:id` hoặc `/o-ghep/:slug--:id`
  * Đồ cũ: `/cho-do-cu/:category/:slug--:id` hoặc `/cho-do-cu/:slug--:id`
* **Tiêu chuẩn SEO:**
  * Nhúng `Helmet` chứa Title, Description, Canonical URL và Schema JSON-LD.
  * Tự động đồng bộ vào `sitemap.xml`.
  * Hỗ trợ backward-compatibility: URL cũ (chỉ có ID) vẫn phải mở được mà không gây lỗi 404.

### VÙNG 2: Private Deep-Link Zone (Trang Nghiệp Vụ — Bảo Mật Tuyệt Đối)
* **Đối tượng:** Tất cả các trang thuộc prefix `/chu-tro/*`, `/admin/*`, `/ho-so/*` (Hợp đồng, Tủ CCCD, Chốt số điện nước, Hóa đơn thu tiền, Ví xu).
* **Cấu trúc URL:** RESTful phân cấp rõ ràng theo tài nguyên, tuyệt đối không dùng query param che giấu phân tầng nghiệp vụ.
  * Lớp 1 (Tổng quan lưới phòng): `/chu-tro/hop-dong`
  * Lớp 2 (Danh sách thành viên phòng): `/chu-tro/hop-dong/phong/:roomId`
  * Lớp 3 (Hồ sơ CCCD & Hợp đồng chi tiết): `/chu-tro/hop-dong/chi-tiet/:contractId`
* **Tiêu chuẩn Bảo Mật:**
  * Bắt buộc bọc trong `<ProtectedRoute>`.
  * **Privacy Shield:** Bắt buộc có `<meta name="robots" content="noindex, nofollow" />` để ngăn Googlebot cào dữ liệu cá nhân (CCCD, tiền cọc, số điện thoại).

---

## 2. Checklist Bắt Buộc Khi Tạo Màn Hình Hoặc Phân Tầng Mới

Trước khi kết thúc tác vụ, kiểm tra từng mục sau:

- [ ] **1. Kiểm tra Route trong App.tsx:** File component mới đã được import và đăng ký `<Route path="..." element={<... />} />` chưa? Tuyệt đối không để trang "mồ côi" không có URL.
- [ ] **2. Phân tầng có Deep Link:** Nếu giao diện có luồng tương tác nhiều lớp (Lớp 1 → Lớp 2 → Lớp 3), mỗi lần người dùng bấm vào một thẻ/hàng thì URL trên thanh địa chỉ phải đổi tương ứng (dùng `navigate()`).
- [ ] **3. Hỗ trợ F5 & Browser History:** Bấm F5 hoặc gửi link mở ở tab mới có nạp đúng dữ liệu của lớp đó không? Bấm nút Back (`←`) của trình duyệt có lùi về lớp trước không?
- [ ] **4. Empty & Not Found State:** Nếu người dùng gõ sai ID trên URL (ví dụ `/chu-tro/hop-dong/phong/phong-khong-ton-tai`), giao diện có hiển thị Empty State lịch sự kèm nút quay lại không?
- [ ] **5. Quality Gate:** Chạy `npm run build` xác nhận không có lỗi gãy route hoặc circular dependency.
