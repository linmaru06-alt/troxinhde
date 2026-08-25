# BÁO CÁO AUDIT TOÀN DIỆN & KẾ HOẠCH NÂNG CẤP HỆ THỐNG TRỌ XINH (GIAI ĐOẠN 0)
**Dự án:** Trọ Xinh (TroXinh.vn)  
**Mục tiêu:** Nâng cấp từ bản Demo hiện tại thành bản **Public Beta** hoạt động ổn định, bảo mật và đồng bộ trên Internet.  
**Branch thực hiện:** `upgrade/core-public-beta`  
**Repository:** [https://github.com/linmaru06-alt/troxinhde](https://github.com/linmaru06-alt/troxinhde)  
**Tác giả:** Kỹ sư trưởng phụ trách nâng cấp hệ thống  
**Thời gian lập báo cáo:** 25/08/2026

---

## 1. TỔNG QUAN HIỆN TRẠNG & BASELINE BUILD

- **Baseline Build:** Đã kiểm tra qua `npm run build` (`tsc && vite build`). Kết quả: `✓ built in 45.39s` với **0 lỗi TypeScript/Vite**.
- **Hệ thống hiện tại:** Đang vận hành theo mô hình lai (Hybrid):
  - Frontend SPA sử dụng **React 18 + Vite + TailwindCSS + Zustand + React Router v6**.
  - Database Cloud trên **Supabase PostgreSQL** (`https://nanhmbnpihlaojbwfebb.supabase.co`).
  - Xác thực người dùng đang bị phân mảnh giữa **Firebase Auth** (Google / Phone / Email Password) và **Supabase Auth** (Magic Link / OTP), kèm cơ chế Fallback Mock trong `sessionStorage`/`localStorage`.
  - Dữ liệu demo và dữ liệu thật đang bị trộn lẫn trong store Zustand với key lưu trữ cục bộ `troxinh_storage_v3`.

---

## 2. KIỂM KÊ TOÀN BỘ ROUTES, MÀN HÌNH, NÚT BẤM & HÀNH ĐỘNG

| Đường dẫn (Route) | Màn hình (Component) | Phân loại hoạt động | Nguồn dữ liệu hiện tại | Hành động & Nút bấm chính | Đánh giá & Điểm cần sửa |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `LandingPage.tsx` | Lai (Supabase + Mock) | Supabase Cloud (`fetchInitialCloudData`) / Fallback Zustand | Tìm kiếm (Hero bar), Filter pills, Xem phòng, Xem bạn ở ghép, Xem chợ đồ cũ, CTA Chủ trọ | Cần sửa số liệu 50k sinh viên; Khách chưa login không được load tin nhắn/thông báo mẫu; Dữ liệu phòng lấy 100% từ Supabase qua TanStack Query. |
| `/tim-kiem` & `/tim-phong` | `SearchPage.tsx` | Lai (Supabase + Mock) | `useAppStore.rooms` | Search Autocomplete, Chips lọc nhanh, Bộ lọc nâng cao (Quận, Trường, Giá, Loại phòng, Tiện nghi), Đặt lịch, Lưu phòng | Đồng bộ trạng thái URL với bộ lọc; dùng TanStack Query thay vì đọc Zustand static. |
| `/ban-do` | `MapViewPage.tsx` | Lai (Supabase + Mock) | `useAppStore.rooms` + Leaflet Map | Chọn Trường ĐH (bán kính 2km), Lọc giá, Chuyển Map/List trên mobile, Slide-up preview card, Click pin xem chi tiết | Dùng chung query cache với trang tìm kiếm để tối ưu hiệu năng và không re-fetch. |
| `/phong/:id` | `RoomDetailPage.tsx` | Lai (Supabase + Mock) | `useAppStore.rooms` | Gallery ảnh, Web Share API, Sao chép link, Báo cáo tin, Thêm đánh giá, Gọi điện (`tel:`), Chat, Đặt lịch xem phòng | Đánh giá cần lưu vào bảng `reviews` thật trên Supabase; Chỉ cho phép người đã hoàn thành xem phòng hoặc Admin cấp phép đánh giá. |
| `/toa-nha/:id` | `BuildingDetailPage.tsx` | Lai (Supabase + Mock) | `useAppStore.buildings` + `rooms` | Danh sách phòng trong tòa, Bộ lọc phòng theo tầng, Tiện ích tòa nhà, Chỉ đường bản đồ | Kết nối dữ liệu quan hệ `buildings(rooms(*))` qua Supabase. |
| `/dang-nhap` | `LoginPage.tsx` | Firebase + Supabase Auth + Mock | Firebase SDK / Supabase Auth / Hardcoded Demo | Tab Email/Password, Tab OTP (Gmail/SMS), Nút Google Login, 3 Nút Demo 1-chạm (Admin, Chủ trọ, Sinh viên) | **Cực kỳ quan trọng:** Mật khẩu demo đang hardcoded `'12345678'` trong frontend. Cần chuyển sang Firebase Function cấp Custom Token. Xóa bỏ Supabase Auth quản lý session. |
| `/dang-ky` | `RegisterPage.tsx` | Firebase + Supabase Sync | Firebase Auth | Form đăng ký họ tên, email/phone, mật khẩu, role (`renter` / `owner`) | Gán Custom Claims Firebase (`app_role`, `role: authenticated`) qua Cloud Function. |
| `/quen-mat-khau` | `ForgotPasswordPage.tsx` | Firebase Auth | Firebase `sendPasswordResetEmail` | Nhập email nhận link khôi phục | Kiểm tra và gửi mail thật qua Firebase. |
| `/xac-thuc-otp` | `OtpVerificationPage.tsx` | Firebase / Mock Fallback | Firebase Phone / `sessionStorage` mock OTP | Nhập 6 số OTP, Đếm ngược gửi lại mã | Xóa mã OTP giả định (`isSimulated`), đảm bảo 100% qua Firebase Phone OTP hoặc Email link. |
| `/da-luu` | `SavedRoomsPage.tsx` | Cục bộ (Zustand) | `localStorage` (`savedRoomIds`) | Xem phòng đã lưu, Bỏ lưu, Đặt lịch | Cần lưu vào bảng `saved_rooms` thật trên Supabase qua profile ID. |
| `/thong-bao` | `NotificationsPage.tsx` | Cục bộ (Zustand) | `localStorage` (`notifications`) | Đọc thông báo, Đánh dấu tất cả đã đọc, Điều hướng theo CTA | Chuyển sang bảng `notifications` trên Supabase với Realtime Subscription. |
| `/tin-nhan` & `/tin-nhan/:threadId` | `ChatPage.tsx` | Lai (Zustand + Supabase API) | Zustand `threads`/`messages` + `api/messages.ts` | Chọn cuộc trò chuyện, Gửi tin nhắn, Gợi ý nhanh (Quick chips), Gọi điện | Xung đột `thread_id` vs `conversation_id`, `text` vs `content`. Cần chuẩn hóa hoàn toàn về Supabase Realtime Channel. |
| `/dat-lich/:roomId` | `BookingPage.tsx` | Cục bộ (Zustand) | `localStorage` (`bookings`) | Chọn ngày, Khung giờ, Số điện thoại, Ghi chú, Gửi yêu cầu | Cần insert vào bảng `viewing_requests` thật trên Supabase, gửi thông báo Realtime cho Chủ trọ. |
| `/toi` & `/ho-so` | `RenterProfilePage.tsx` | Lai (Zustand + Supabase Sync) | `useAppStore.currentUser` | Đổi avatar, Cập nhật thông tin sinh viên (Trường, Niên khóa, Bio), Đăng xuất | Đọc và update trực tiếp vào bảng `profiles` trên Supabase. |
| `/onboarding` | `RenterOnboardingPage.tsx` | Cục bộ (Zustand) | Zustand | Chọn trường ĐH, mức giá mong muốn, tiện nghi yêu thích | Lưu preference vào profile người dùng. |
| `/nang-cap-chu-tro` | `OwnerUpgradePage.tsx` | Cục bộ (Zustand) | `localStorage` (`ownerApplications`) | Nhập CCCD, Ảnh CCCD, Tên tòa nhà, Địa chỉ, Số phòng, Nộp hồ sơ | Lưu vào bảng `owner_applications` thật trên Supabase; Kích hoạt thông báo cho Admin. |
| `/nang-cap-chu-tro/trang-thai` | `OwnerApplicationStatusPage.tsx` | Cục bộ (Zustand) | Zustand `currentUser.ownerApplicationStatus` | Xem trạng thái (Pending/Approved/Rejected), Nộp lại hồ sơ | Đọc trạng thái thật từ Supabase. |
| `/chu-tro` & `/chu-tro/tong-quan` | `OwnerDashboardPage.tsx` | Lai (Zustand + Supabase) | `useAppStore` (Mock + Cloud) | Thống kê số phòng, doanh thu ước tính, lịch hẹn mới, tin nhắn mới | Viết RPC / Query tổng hợp từ bảng `rooms`, `viewing_requests`, `transactions` thuộc `owner_id`. |
| `/chu-tro/toa-nha` | `OwnerBuildingListPage.tsx` | Lai (Supabase) | Supabase `buildings` | Danh sách tòa nhà của tôi, Thêm tòa nhà mới, Xem chi tiết | RLS kiểm soát `owner_id = current_profile_id()`. |
| `/chu-tro/toa-nha/tao-moi` | `OwnerCreateBuildingPage.tsx` | Lai (Zustand + Supabase) | Form state | Tên tòa, Địa chỉ, Quận, Tiện ích, Giá điện nước, Upload ảnh Cloudinary | Insert vào bảng `buildings` thật trên Supabase. |
| `/chu-tro/phong/tao-moi` | `OwnerCreateRoomPage.tsx` | Lai (Zustand + Supabase) | Form state | Chọn tòa nhà, Số phòng, Loại phòng, Giá thuê, Tiền cọc, Tiện nghi, Upload ảnh, Đăng tin | Insert vào bảng `rooms` với `moderation_status = 'pending'`. Bắt buộc phải chọn Tòa nhà trước. |
| `/chu-tro/phong/:id` | `OwnerRoomDetailPage.tsx` | Lai (Zustand + Supabase) | `useAppStore.rooms` | Đổi trạng thái phòng (Còn trống / Đã thuê), Sửa thông tin, Đẩy tin nổi bật | Update trực tiếp bảng `rooms`. |
| `/chu-tro/nang-cap-tin/:roomId` | `OwnerBoostRoomPage.tsx` | Mock Payment | Zustand | Chọn gói đẩy tin (3 ngày, 7 ngày, 30 ngày), Thanh toán | Kết nối qua cổng thanh toán VietQR/PayOS ở Giai đoạn 7. |
| `/chu-tro/quan-ly-goi` | `OwnerSubscriptionManagePage.tsx` | Mock | Zustand | Quản lý gói cước chủ trọ, Lịch sử hóa đơn | Kết nối bảng `user_subscriptions` và `transactions`. |
| `/chu-tro/toi` | `OwnerProfilePage.tsx` | Cục bộ (Zustand) | Zustand `currentUser` | Cập nhật hồ sơ chủ trọ, Số điện thoại Zalo, Giờ tiếp khách | Đọc và update bảng `profiles`. |
| `/admin` & `/admin/kiem-duyet` | `AdminModerationPage.tsx` | Lai (Zustand + Supabase) | Zustand `rooms` | Duyệt phòng trọ, Từ chối kèm lý do, Khóa phòng | Cần audit log ghi lại `admin_id`, hành động `approve_room`/`reject_room`. |
| `/admin/don-chu-tro` | `AdminOwnerApplicationsPage.tsx` | Lai (Zustand + Supabase) | Zustand `ownerApplications` | Duyệt hồ sơ chủ trọ, Cấp quyền `owner`, Từ chối kèm lý do | Ghi `audit_logs`, update `profiles.app_role = 'owner'` và cập nhật Custom Claims Firebase. |
| `/admin/nguoi-dung` | `AdminUsersPage.tsx` | Lai (Zustand + Supabase) | `users` / `profiles` | Danh sách người dùng, Khóa/Mở khóa tài khoản, Đổi role | Ghi `audit_logs`, chặn quyền sửa role của Admin khác trái phép. |
| `/admin/thong-ke` | `AdminAnalyticsPage.tsx` | Cục bộ (Zustand) | Zustand Mock data | Biểu đồ người dùng, số phòng, doanh thu, tỷ lệ lấp đầy | Query thống kê thực tế từ Supabase. |
| `/roommate` & `/tim-ban-cung-phong` | `RoommateListPage.tsx` | Lai (Supabase Cloud) | Supabase `roommate_posts` | Danh sách tìm bạn ở ghép, Lọc theo trường/quận/ngân sách, Đăng bài | Giữ ổn định (triển khai hoàn thiện ở Giai đoạn 8). |
| `/roommate/:id` | `RoommateDetailPage.tsx` | Lai (Supabase Cloud) | Supabase `roommate_posts` | Chi tiết thói quen, ngân sách, Liên hệ chat/gọi điện | Giữ ổn định. |
| `/cho-do-cu` | `MarketplaceListPage.tsx` | Lai (Supabase Cloud) | Supabase `marketplace_items` | Danh sách đồ pass, Lọc danh mục, Đăng đồ cũ | Giữ ổn định (triển khai hoàn thiện ở Giai đoạn 8). |
| `/cho-do-cu/:id` | `MarketplaceDetailPage.tsx` | Lai (Supabase Cloud) | Supabase `marketplace_items` | Chi tiết món đồ, Liên hệ người bán | Giữ ổn định. |
| `/bang-gia` & `/nang-cap` | `PricingPage.tsx` | Tĩnh (UI) | `SUBSCRIPTION_PLANS` constant | Bảng giá Gói Miễn Phí, Gói Cơ Bản, Gói Pro VIP, Nút chọn gói | Dẫn sang `/thanh-toan/:planId`. |
| `/thanh-toan/:planId` | `CheckoutPage.tsx` | VietQR / PayOS Sandbox | Edge Function `create-payment-link` + VietQR EMVCo | Tạo mã VietQR Techcombank (STK `0888110789`), Quét mã ngân hàng, Polling trạng thái | Chỉ kích hoạt live ở Giai đoạn 7. |
| `/thanh-toan/ket-qua` | `PaymentResultPage.tsx` | UI Callback | Query params | Hiển thị kết quả thanh toán, Xuất hóa đơn PDF/Ảnh | Không dùng trang này để tự kích hoạt gói; phải dựa trên Webhook server. |
| `/ve-chung-toi/kiem-duyet` | `TrustVerificationPage.tsx` | Tĩnh (UI) | Static Content | Quy trình 5 bước xác minh phòng trọ, Cam kết PCCC | Cần chuẩn hóa nội dung đúng quy trình thực tế. |
| `/hop-dong-mau` | `ContractTemplatePage.tsx` | Tiện ích (Client) | Helper jsPDF / html2canvas | Mẫu hợp đồng thuê phòng trọ chuẩn pháp lý, Xuất file PDF/In | Hoạt động tốt phía client. |
| `/bien-ban-dat-coc` | `DepositContractPage.tsx` | Tiện ích (Client) | Helper jsPDF / html2canvas | Biên bản đặt cọc giữ phòng 3 bên, Xuất file PDF | Hoạt động tốt phía client. |
| `/dieu-khoan` | `TermsPage.tsx` | Tĩnh (UI) | Static Content | Điều khoản dịch vụ TroXinh.vn | Hoạt động tốt. |
| `/chinh-sach-bao-mat` | `PrivacyPolicyPage.tsx` | Tĩnh (UI) | Static Content | Chính sách bảo mật thông tin cá nhân | Hoạt động tốt. |
| `/debug` | `DebugPage.tsx` | Tiện ích QA | Zustand / Supabase Direct | Kiểm tra trạng thái dữ liệu, reset mock data | Cần chặn không cho Google index (`noindex, nofollow`). |
| `/404` & `*` | `NotFoundPage.tsx` | Tĩnh (UI) | Static | Thông báo trang không tồn tại, Nút quay về Trang chủ | Hoạt động tốt. |

---

## 3. PHÂN TÍCH KIẾN TRÚC XÁC THỰC (FIREBASE AUTH & SUPABASE AUTH)

### 3.1. Hiện trạng xung đột xác thực
1. **Frontend đang sử dụng 2 hệ thống song song:**
   - `firebase.ts`: Cấu hình Firebase App `troxinh-eb`, gọi `signInWithPhoneNumber`, `signInWithPopup`, `signInWithEmailAndPassword`.
   - `supabase.ts` & `authService.ts`: Gọi `supabase.auth.signInWithOtp` và `supabase.auth.verifyOtp` với Magic Link Gmail.
   - `App.tsx`: Lắng nghe `supabase.auth.onAuthStateChange` để tự login người dùng.
2. **Cơ chế Fake User & Mock OTP nguy hiểm:**
   - Trong `authService.ts`: Khi Supabase Auth lỗi hoặc quá Rate Limit, code tự động sinh mã OTP ngẫu nhiên lưu vào `sessionStorage` (`otp_email_...`), dẫn đến việc người dùng nhập mã giả vẫn đăng nhập thành công.
3. **Mật khẩu Demo bị lộ trong Bundle:**
   - Trong `LoginPage.tsx`: Hàm `selectDemoAccount` truyền thẳng mật khẩu `'12345678'` trong bundle JavaScript client.
4. **Quyền người dùng (Role) không được bảo vệ từ Server:**
   - Role đang được gán trực tiếp trong Zustand (`currentUser.role`) và lưu vào `localStorage`. Bất kỳ ai sửa `localStorage` cũng có thể biến thành `admin` hoặc `owner` ở tầng UI!

### 3.2. Yêu cầu kiến trúc chuẩn cho Public Beta (Giai đoạn 1)
- **Firebase Authentication là nguồn định danh duy nhất.**
- **Supabase Third-Party Auth:** Cấu hình Supabase kiểm tra JWT từ Firebase Project `troxinh-eb`.
- **Custom Claims trên Firebase:**
  - `role: "authenticated"`
  - `app_role: "renter" | "owner" | "admin"`
  - `is_demo_account: boolean`
- **Tài khoản Demo an toàn:** Viết Cloud Function cấp Custom Token cho 3 tài khoản Demo, không để lộ bất kỳ mật khẩu nào ở frontend.

---

## 4. PHÂN TÍCH SCHEMA DATABASE, RLS & CÁC ĐIỂM BẤT ĐỒNG BỘ (MISMATCHES)

### 4.1. Mismatch 1: Bảng Người dùng (`users` vs `profiles`)
- **Tình trạng:**
  - `supabase/migrations/001_profiles.sql` tạo bảng `public.profiles` với `id UUID PRIMARY KEY REFERENCES auth.users(id)`.
  - `supabase/migrations/create_users_table.sql` tạo bảng `public.users` với `id TEXT PRIMARY KEY`.
  - `supabase/schema.sql` lại định nghĩa `public.users` với `id UUID PRIMARY KEY`.
  - Frontend `supabaseAuthSync.ts` đọc/ghi bảng `users`, nhưng các query quan hệ trong `supabaseDataService.ts` lại join `profiles:owner_id(*)`.
- **Giải pháp Giai đoạn 2:**
  - Thống nhất duy nhất một bảng `public.profiles` chứa:
    - `id` (UUID, Primary Key nội bộ Supabase).
    - `firebase_uid` (TEXT, UNIQUE, NOT NULL - lưu UID từ Firebase).
    - `email`, `phone`, `full_name`, `avatar_url`, `app_role` (`renter` | `owner` | `admin`), `owner_status`, `is_demo_account`, `created_at`, `updated_at`.
  - Tạo hàm PostgreSQL ánh xạ:
    - `current_profile_id()`: đọc `auth.jwt() ->> 'sub'` (Firebase UID) và trả về `profiles.id` tương ứng.
    - `current_app_role()`: đọc custom claim `auth.jwt() ->> 'app_role'`.

### 4.2. Mismatch 2: Tin nhắn & Cuộc trò chuyện (`threads` vs `conversations`)
- **Tình trạng:**
  - Schema cũ dùng `public.threads` với khóa `participants JSONB` và `public.messages` có trường `text TEXT`.
  - Migration `003_interactions.sql` và `src/lib/api/messages.ts` lại dùng `public.conversations` (`participant_1 UUID`, `participant_2 UUID`) và `public.messages` có trường `content TEXT`, `conversation_id UUID`.
  - Frontend `ChatPage.tsx` và `types/index.ts` lại dùng interface `Thread` và `Message.text`.
- **Giải pháp:**
  - Chuẩn hóa toàn bộ schema và frontend về: `conversations` (`id`, `participant_1`, `participant_2`, `room_id`, `last_message`, `last_message_at`) và `messages` (`id`, `conversation_id`, `sender_id`, `content`, `is_read`, `created_at`).

### 4.3. Mismatch 3: Trạng thái Phòng & Tiêu chí Lọc
- **Tình trạng:**
  - `types/index.ts`: `status: 'Còn trống' | 'Đã cho thuê' | 'Chờ duyệt' | 'Bị từ chối'`. Trộn lẫn trạng thái kiểm duyệt (moderation) và trạng thái còn phòng (availability).
  - `schema.sql`: `moderation_status` (`draft`, `pending`, `approved`, `rejected`, `hidden`) và `status` (`available`, `reserved`, `rented`).
- **Giải pháp:**
  - Tách bạch 2 trường rõ ràng:
    - `moderation_status`: `'draft' | 'pending' | 'approved' | 'rejected' | 'hidden'` (do Admin kiểm duyệt).
    - `availability_status`: `'available' | 'reserved' | 'rented'` (do Chủ trọ cập nhật).
  - Khách vãng lai và Người thuê chỉ được xem phòng có `moderation_status = 'approved'` và `moderation_status != 'hidden'`.

### 4.4. Mismatch 4: Trạng thái Lịch hẹn Xem phòng (`viewing_requests`)
- **Tình trạng:**
  - `types/index.ts`: `status: 'Chờ chủ trọ xác nhận' | 'Đã xác nhận' | 'Đã hủy'`.
  - `schema.sql`: `status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show'`.
- **Giải pháp:**
  - Chuẩn hóa ENUM tiếng Anh chuẩn database: `pending`, `confirmed`, `rescheduled`, `completed`, `cancelled`, `no_show`. Frontend map hiển thị tiếng Việt thân thiện tương ứng.

---

## 5. KIỂM TRA MÔI TRƯỜNG, CI/CD, HOSTING & SECRETS

1. **Git Branching:** Đã chuyển sang branch `upgrade/core-public-beta`.
2. **Quản lý Secrets & .env:**
   - File `.env` chứa `SUPABASE_SERVICE_ROLE_KEY` và API keys. File này đã được đưa vào `.gitignore`.
   - Cần đảm bảo `SUPABASE_SERVICE_ROLE_KEY` không bao giờ được import vào code frontend (`VITE_...`). Mọi thao tác admin đặc quyền đều thông qua Edge Function hoặc Custom Claims.
3. **CI/CD & Hosting:**
   - Trong `.github/workflows/deploy.yml` vẫn còn job deploy sang Netlify (`nwtgck/actions-netlify@v3.0`).
   - Theo quyết định đã khóa: Hosting chính thức duy nhất là **Vercel**. Sẽ loại bỏ Netlify và cấu hình CI kiểm tra Typecheck, Lint, Test trước khi merge PR.

---

## 6. DANH MỤC RỦI RO KỸ THUẬT (RISK REGISTER)

| Mã rủi ro | Mô tả rủi ro | Mức độ | Biện pháp giảm thiểu & Kiểm soát |
| :--- | :--- | :---: | :--- |
| **R-01** | Lộ quyền Admin/Chủ trọ do Frontend tự phong quyền qua localStorage | **Nghiêm trọng (P0)** | Khóa hoàn toàn quyền qua Firebase Custom Claims (`app_role`) và RLS Supabase. Frontend chỉ đọc claim từ Token đã ký. |
| **R-02** | Xung đột ID người dùng khi merge bảng `users` và `profiles` | **Cao (P1)** | Không xóa bảng cũ ngay; tạo migration bổ sung; map Firebase UID -> `profiles.id` (UUID); xuất log các bản ghi không ghép được để xử lý thủ công. |
| **R-03** | Khách dùng Supabase Realtime bị ngắt kết nối hoặc rò rỉ tin nhắn | **Cao (P1)** | Thiết lập RLS nghiêm ngặt cho `conversations` và `messages` (chỉ participant 1 & 2 mới được select/insert); thêm cơ chế thử lại (Retry) khi gửi tin nhắn lỗi. |
| **R-04** | Đánh giá ảo và Spam báo cáo | **Trung bình (P2)** | Khóa quyền đánh giá: Chỉ tài khoản có `viewing_request` ở trạng thái `completed` với phòng đó mới được gửi review vào bảng `reviews`. |
| **R-05** | Rate Limit SMS OTP của Firebase | **Trung bình (P2)** | Cung cấp song song đăng nhập Google OAuth 1-chạm và 3 tài khoản Demo dùng Custom Token không tốn quota SMS. |

---

## 7. KẾ HOẠCH THỰC HIỆN CHI TIẾT TỪNG GIAI ĐOẠN

### 🔹 Giai đoạn 1: Firebase Auth kết nối Supabase (Third-Party Auth)
- Cấu hình Supabase JWT Validator khớp với Firebase Project `troxinh-eb`.
- Viết Cloud Function cấp Custom Claims (`role: authenticated`, `app_role: renter|owner|admin`, `is_demo_account: boolean`).
- Viết Cloud Function cấp Demo Token cho 3 tài khoản Demo không cần lộ password ở frontend.
- Cập nhật client Supabase tự động đính kèm Firebase ID Token.

### 🔹 Giai đoạn 2: Thống nhất Database & Viết RLS
- Tạo migration bổ sung chuẩn hóa bảng `profiles` với `firebase_uid`.
- Tạo hàm `current_profile_id()` và `current_app_role()`.
- Chuẩn hóa các bảng core: `buildings`, `rooms`, `room_images`, `saved_rooms`, `viewing_requests`, `conversations`, `messages`, `notifications`, `reviews`, `reports`, `owner_applications`, `audit_logs`.
- Viết bộ RLS Policies hoàn chỉnh cho 4 nhóm đối tượng: Guest, Renter, Owner, Admin.

### 🔹 Giai đoạn 3: Xây dựng tầng Dữ liệu Frontend (TanStack Query)
- Thay thế việc đọc/ghi localStorage trong Zustand bằng TanStack Query (`useQuery`, `useMutation`).
- Zustand chỉ lưu trạng thái UI tạm thời (modal open/close, active tab, toast).
- Viết API Services/Repositories riêng biệt cho từng module có xử lý optimistic updates và rollback khi lỗi.

### 🔹 Giai đoạn 4: Hoàn thiện Luồng Người Thuê (Core Renter Journey)
- Đồng bộ bộ lọc Trang chủ, Tìm kiếm, Bản đồ qua URL Params.
- Dữ liệu phòng lấy 100% từ Supabase (bỏ mock fallback âm thầm).
- Đăng nhập chuyển hướng thông minh (`returnUrl`), lưu phòng, nhắn tin, đặt lịch xem phòng hoạt động thật.

### 🔹 Giai đoạn 5: Hoàn thiện Phân hệ Chủ Trọ & Quản Trị Viên (Owner SaaS & Admin)
- Chủ trọ: Nộp hồ sơ nâng cấp, tạo tòa nhà trước khi tạo phòng, upload ảnh có progress, quản lý phòng, nhận duyệt/từ chối.
- Admin: Duyệt phòng, duyệt chủ trọ, quản lý user, xử lý báo cáo, ghi `audit_logs` cho mọi thao tác.

### 🔹 Giai đoạn 6: Kiểm thử E2E, Tối ưu Hiệu năng & Vercel Production
- Xóa bỏ deploy Netlify khỏi GitHub Actions.
- Thiết lập CI kiểm tra Typecheck, Lint, Test.
- Kiểm tra Responsive 360px - 430px, Tablet, Desktop; đo lường Core Web Vitals (LCP <= 2.5s, CLS <= 0.1).

### 🔹 Giai đoạn 7: Cổng Thanh toán Thật (VietQR / PayOS)
- Tích hợp Webhook xác thực chữ ký số HMAC-SHA256 phía server.
- Kích hoạt gói chủ trọ và hóa đơn sau khi nhận IPN thành công.

### 🔹 Giai đoạn 8: Cộng đồng Sinh viên (Bạn ở ghép & Chợ đồ cũ) & Hoàn thiện
- Kiểm duyệt bài tìm bạn cùng phòng và đồ cũ.
- Tinh chỉnh hệ thống và bàn giao toàn diện.

---

## 8. CÁC THAO TÁC CẦN NGƯỜI DÙNG THỰC HIỆN THỦ CÔNG (KHI BƯỚC VÀO GIAI ĐOẠN 1)

Khi bắt đầu Giai đoạn 1, tôi sẽ cung cấp hướng dẫn chi tiết từng bước để bạn thao tác trên:
1. **Firebase Console:** Kích hoạt Authentication (Google, Email/Password, Phone), tải file `serviceAccountKey.json` hoặc cấp quyền Cloud Functions.
2. **Supabase Dashboard:** Truy cập **Project Settings -> Authentication -> Third-Party Auth**, thêm Firebase làm Third-Party Provider (nhập Firebase Project ID `troxinh-eb`).
3. **Vercel Dashboard:** Cấu hình các biến môi trường Production an toàn.
