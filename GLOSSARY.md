# Trọ Xinh — Bảng Thuật Ngữ Chuẩn (GLOSSARY)

Tài liệu này định nghĩa **Ngôn ngữ chung (Ubiquitous Language)** bắt buộc tuân thủ trong toàn bộ codebase, API, cơ sở dữ liệu và trao đổi kỹ thuật của dự án **Trọ Xinh**. Mọi Agent và Lập trình viên phải sử dụng chính xác các thuật ngữ này, tránh dùng các từ đồng nghĩa gây mập mờ hoặc xung đột logic.

---

## 1. Người Dùng & Phân Quyền (Identity & Roles)

* **`profiles` (Hồ sơ người dùng)**:
  * Bảng duy nhất trên Supabase lưu trữ thông tin tài khoản người dùng (`id`, `firebase_uid`, `full_name`, `email`, `avatar_url`, `app_role`, `is_verified`).
  * Mọi quan hệ khóa ngoại (Foreign Key) trong cơ sở dữ liệu đều phải tham chiếu tới `profiles(id)`.
  * **CẤM**: Tuyệt đối không tạo bảng `users` mới hoặc viết tính năng mới dựa vào bảng `users` cũ.

* **`Auth` (Xác thực danh tính)**:
  * **Firebase Authentication** là nguồn xác thực duy nhất (Google OAuth, Phone OTP, Email/Password).
  * Supabase chỉ đóng vai trò lưu trữ nghiệp vụ và cấp quyền RLS dựa trên `firebase_uid` hoặc `profile_id`.
  * Không tạo phiên giả, OTP giả trong môi trường production.

* **`renter` (Khách thuê)**:
  * Vai trò mặc định của người dùng khi mới đăng ký tài khoản (`app_role = 'renter'`).
  * Có quyền tìm phòng, tìm bạn ở ghép, đăng tin mua bán đồ cũ, đặt lịch hẹn và nhắn tin với chủ trọ.

* **`landlord` (Chủ trọ / Chủ nhà)**:
  * Vai trò dành cho người cho thuê phòng (`app_role = 'landlord'`).
  * Có quyền đăng phòng trọ, quản lý tòa nhà (`buildings`), cập nhật trạng thái phòng và duyệt lịch xem phòng.
  * *Lưu ý*: Trong codebase có thể xuất hiện từ `owner` ở giao diện UI (ví dụ: `OwnerUpgradePage`), nhưng trong database và logic nghiệp vụ chuẩn hóa là `landlord`.

* **`admin` (Quản trị viên)**:
  * Vai trò có quyền kiểm duyệt cao nhất (`app_role = 'admin'`).
  * Có quyền duyệt hồ sơ nâng cấp chủ trọ (`owner_applications`), duyệt tin vi phạm (`reports`), khóa bài viết và xem audit logs.

---

## 2. Các Thực Thể Nghiệp Vụ Chính (Core Domain Entities)

* **`rooms` (Phòng trọ / Bất động sản cho thuê)**:
  * Tin đăng cho thuê phòng trọ, căn hộ mini hoặc nhà nguyên căn.
  * Thuộc sở hữu của một `landlord` (`user_id REFERENCES profiles(id)`).
  * Đi kèm bảng hình ảnh `room_images`.

* **`roommate_posts` (Bài viết Tìm ở ghép)**:
  * Tin tìm bạn cùng thuê phòng, chia sẻ tiền nhà và sinh hoạt phí.
  * Thuộc sở hữu của một `renter`.

* **`marketplace_items` (Chợ đồ cũ / Sang nhượng đồ)**:
  * Tin đăng mua bán, thanh lý vật dụng, đồ nội thất sinh viên đã qua sử dụng.
  * Có trạng thái kiểm duyệt và hệ thống tự động ẩn tin nếu bị báo cáo vi phạm quá ngưỡng quy định (`c_auto_moderation_threshold = 3`).

* **`conversations` (Cuộc trò chuyện / Hội thoại)**:
  * Phiên chat kết nối trực tiếp giữa đúng 2 người dùng (`participant_1`, `participant_2`).
  * Lưu trữ tập trung 100% trên Supabase Cloud. Tuyệt đối không dùng `localStorage` làm nơi lưu trữ chính.

* **`messages` (Tin nhắn)**:
  * Bản ghi tin nhắn thuộc một `conversation` (`sender_id`, `receiver_id`, `content`, `item_context`).
  * Được phát sóng tức thì giữa các thiết bị thông qua kênh WebSocket của **Supabase Realtime**.

* **`owner_applications` (Đơn xin nâng cấp Chủ trọ)**:
  * Hồ sơ do `renter` nộp để xin nâng cấp tài khoản lên `landlord`.
  * Có trạng thái: `pending` (chờ duyệt), `approved` (đã duyệt), `rejected` (bị từ chối).
  * Được quản lý tập trung trên Supabase Cloud và tự động cập nhật Realtime trên trang Admin.

* **`transactions` (Giao dịch tài chính / Nạp điểm)**:
  * Bản ghi thanh toán dịch vụ (MoMo Gateway, VietQR dynamic).
  * Trạng thái thanh toán chỉ được xác nhận thông qua Webhook IPN hoặc đối soát máy chủ, frontend không được tự ý set `status = 'completed'`.

* **`reports` (Báo cáo vi phạm)**:
  * Khiếu nại từ cộng đồng nhắm vào: tin đăng (`tin_dang`), người dùng (`nguoi_dung`), hoặc tin nhắn vi phạm (`tin_nhan`).
  * Tự động kích hoạt cơ chế ẩn tin tạm thời khi đạt từ 3 báo cáo độc lập trở lên từ người dùng khác nhau.

---

## 3. Kiến Trúc & Trạng Thái Ứng Dụng (State & Storage Rules)

* **Server State (Dữ liệu máy chủ)**:
  * Quản lý 100% bằng **TanStack Query (`@tanstack/react-query`)**.
  * Dữ liệu nguồn chân lý (Single Source of Truth) là **Supabase Cloud Database**.

* **Client Transient State (Trạng thái UI tạm thời)**:
  * Quản lý bằng **Zustand**.
  * Chỉ dùng để lưu trạng thái UI ngắn hạn (mở modal, bộ lọc tạm thời, tab đang chọn, cache theme).
  * **CẤM**: Không sử dụng `localStorage` hay Zustand làm nơi lưu trữ chính thay thế database cho: danh sách phòng, phiên đăng nhập, tin nhắn chat, lịch hẹn hoặc tiền bạc.
