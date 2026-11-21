# Đặc Tả Tính Năng: Hệ Thống Tự Động Hóa URL & Định Tuyến Hai Vùng (Dual-Zone Automatic URL & Routing System)
> Trạng thái: In-Review / Pending Approval  
> Ngày tạo: 2026-11-22 | Tác giả: Trọ Xinh Core Architecture Team  
> Tài liệu liên quan: [plan.md](./plan.md) | [tasks.md](./tasks.md)

---

## 1. Mục tiêu & Bối cảnh (What & Why)

### 1.1 Vấn đề cần giải quyết
1. **Thiếu liên kết sâu (Deep Linking) cho các luồng nghiệp vụ:** Trước đây, một số màn hình quản lý chia tầng (ví dụ luồng Hợp đồng Lớp 1 - 2 - 3) dùng `useState` nội bộ mà không đổi URL. Khi người dùng bấm F5, gửi link cho đồng nghiệp hoặc bấm nút Back trình duyệt thì bị reset về trang chủ hoặc mất ngữ cảnh.
2. **URL công khai chưa tối ưu SEO tối đa:** Các tài nguyên công khai hiện tại như phòng trọ (`/phong/:id`), đồ cũ (`/cho-do-cu/:id`) chủ yếu dựa vào ID thay vì URL ngữ nghĩa (Semantic SEO Slug) chứa quận huyện, tên phòng và từ khóa tìm kiếm của sinh viên.
3. **Nguy cơ nhầm lẫn giữa Public SEO và Private Data:** Cần một ranh giới bảo mật vững chắc để ngăn chặn việc bot tìm kiếm (Googlebot) vô tình lập chỉ mục (index) các trang hợp đồng, CCCD, hóa đơn của khách thuê.

### 1.2 Mục tiêu đạt được
* **100% trang & phân tầng đều có URL định danh:** Bất kỳ trang nào sinh ra (dù là người dùng đăng tin hay lập trình viên viết UI mới) đều tự động có URL riêng biệt, copy link gửi được và hỗ trợ hoàn hảo nút Back/Forward trình duyệt.
* **Tách bạch 2 vùng chiến lược (Dual-Zone Architecture):**
  * **Vùng 1 - Public SEO Zone:** Tự động tạo slug tiếng Việt không dấu chuẩn SEO, tích hợp OpenGraph, JSON-LD Schema và tự động cập nhật Sitemap XML.
  * **Vùng 2 - Private Deep Link Zone:** URL phân tầng sâu, bảo mật tuyệt đối, chặn bot bằng `noindex, nofollow`, kiểm soát RLS và Firebase Auth.
* **Skill kiểm soát tự động cho Agent & Dev (`url-routing-guard`):** Chốt chặn ngăn ngừa bất kỳ màn hình nào được code ra mà "mồ côi" không có route.

### 1.3 Phạm vi (Scope)
* **NẰM TRONG PHẠM VI (In-scope):**
  * Thiết kế kiến trúc slug tự động cho các bảng `rooms`, `roommate_posts`, `marketplace_items`.
  * Cơ chế điều hướng và đồng bộ URL cho tất cả các tầng giao diện (Master-Detail, Tab, Sub-routes).
  * Quy chuẩn cấu trúc URL cho luồng quản lý chủ trọ (K23 PMS, Hợp đồng, Tủ CCCD, Chốt số điện nước, Hóa đơn).
  * Bộ công cụ kiểm tra (Rule/Skill) bảo đảm mọi trang mới đều được đăng ký route hợp lệ.
* **NẰM NGOÀI PHẠM VI (Out-of-scope):**
  * Không thay đổi hệ thống Database chính đang hoạt động (không phá vỡ ID cũ, duy trì backward compatibility).
  * Không can thiệp vào các cổng thanh toán bên thứ ba (PayOS, MoMo).

---

## 2. Đối tượng người dùng & Vai trò (User Roles)

* **Khách vãng lai (`guest`) & Người tìm phòng (`user`):** Trải nghiệm URL chuẩn SEO thân thiện, dễ đọc, dễ nhớ, tìm kiếm thấy ngay trên Google top 1.
* **Chủ trọ (`owner`):** Dễ dàng lưu bookmark từng phòng, từng hợp đồng, gửi trực tiếp đường link hợp đồng/hóa đơn cho khách thuê hoặc quản lý tòa nhà mà không bị lạc trang.
* **Đội ngũ phát triển & AI Agents:** Có quy trình chuẩn hóa, không bao giờ quên gắn route cho màn hình mới.

---

## 3. Câu chuyện người dùng (User Stories)

1. **Là một người tìm phòng trọ tại Cầu Giấy,**  
   Tôi muốn đường link bài viết có dạng `/phong-tro/cau-giay/phong-studio-ban-cong-k23-abc12`,  
   Để tôi dễ dàng nhận biết khu vực, loại phòng và dễ tìm lại trên kết quả tìm kiếm Google.

2. **Là một chủ nhà trọ đang quản lý phòng P.302,**  
   Tôi muốn bấm vào phòng P.302 thì URL tự động đổi sang `/chu-tro/hop-dong/phong/P-302`,  
   Để khi tôi gửi link này cho nhân viên quản lý hoặc bấm F5 thì trang vẫn giữ nguyên danh sách khách của phòng P.302.

3. **Là một khách thuê trọ có hợp đồng thuê nhà,**  
   Tôi muốn hợp đồng và ảnh CCCD của tôi được bảo mật tuyệt đối,  
   Để Googlebot không bao giờ có thể tìm thấy hoặc hiển thị thông tin cá nhân của tôi ra ngoài Internet.

---

## 4. Tiêu chí nghiệm thu (Acceptance Criteria)

- [ ] **AC 1 (Public Slug Generator):** Khi người dùng đăng mới phòng trọ, đồ cũ hoặc tìm ở ghép, hệ thống tự động sinh ra trường `slug` tiếng Việt không dấu chuẩn SEO có kèm mã hash ngắn chống trùng lặp.
- [ ] **AC 2 (Backward Compatibility):** Hệ thống hỗ trợ cả URL mới dạng slug và URL cũ dạng ID (`/phong/:id`), tự động canonical hoặc redirect 301 mà không gây chết link cũ.
- [ ] **AC 3 (Deep-linking State Sync):** Tất cả các phân tầng quản trị của chủ nhà (Lớp 1: Tổng quan, Lớp 2: Phòng, Lớp 3: Chi tiết) đều phản ánh đúng trên thanh địa chỉ URL.
- [ ] **AC 4 (Privacy Shield Enforcement):** Toàn bộ các trang trong prefix `/chu-tro/*`, `/admin/*`, `/ho-so/*` đều được gắn thẻ `noindex, nofollow` và được bảo vệ bằng `ProtectedRoute`.
- [ ] **AC 5 (Automated Routing Guard):** Có skill kiểm tra định kỳ hoặc trước khi commit để cảnh báo các component trang chưa được khai báo `<Route>` trong `src/App.tsx`.

---

## 5. Các trường hợp ngoại lệ & Giới hạn (Edge Cases)

1. **Trùng lặp tiêu đề:** Hai bài đăng có tiêu đề giống hệt nhau (ví dụ "Phòng trọ giá rẻ") -> Giải pháp: Tự động gắn hậu tố short hash (ví dụ `-a8f2`, `-9b1c`).
2. **Ký tự đặc biệt trong tiêu đề:** Người dùng nhập emoji, dấu câu phức tạp hoặc ký tự unicode lạ -> Giải pháp: Hàm sanitize lọc sạch, chỉ giữ lại `[a-z0-9-]`.
3. **URL không tồn tại / ID phòng sai lệch:** Người dùng nhập tay URL không hợp lệ (ví dụ `/chu-tro/hop-dong/phong/khong-ton-tai`) -> Giải pháp: Hiển thị Empty State rõ ràng kèm nút "Quay lại danh sách".
