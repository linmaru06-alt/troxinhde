---
name: troxinh-workflow
description: Use only when implementing or reviewing authentication, Supabase/RLS, payment, or multi-page user flows in TroXinh. Provides conditional implementation and verification checklists.
---

# TroXinh — Conditional Engineering Checklists

Sử dụng checklist có điều kiện tương ứng với từng phân hệ, không tải toàn bộ lý thuyết.

---

## 1. Phân tích phạm vi trước khi sửa

Agent phải:

- Xác định màn hình, route, service, bảng dữ liệu và vai trò bị ảnh hưởng.
- Đọc luồng đầy đủ từ UI → service → Firebase/Supabase → UI phản hồi.
- Kiểm tra `git status` trước khi sửa.
- Không sửa file ngoài phạm vi nếu không thật sự cần.
- Không tự thay đổi kiến trúc chỉ để giải quyết một lỗi nhỏ.

---

## 2. Kiểm tra đăng nhập và OTP

Chỉ áp dụng khi tác vụ liên quan đến đăng nhập, đăng ký hoặc phân quyền:

- Firebase là hệ thống xác thực duy nhất.
- Chỉ cho đăng nhập sau khi OTP hoặc nhà cung cấp OAuth xác thực thành công.
- Không tạo OTP giả hoặc trả `success: true` khi dịch vụ lỗi.
- Không gán `verified: true` trước khi xác minh thật.
- Sau xác thực, đồng bộ hồ sơ vào `profiles` bằng `firebase_uid`.
- Nếu tạo Firebase thành công nhưng ghi Supabase thất bại, không cho vào ứng dụng; phải báo lỗi và xử lý phiên an toàn.
- Refresh trang không được làm mất phiên hợp lệ.
- Quyền phải lấy từ token hoặc Supabase, không lấy từ `localStorage`.
- Demo login phải tách biệt, có `is_demo_account` và audit log.

---

## 3. Kiểm tra Supabase, dữ liệu và RLS

Chỉ áp dụng khi sửa database hoặc nghiệp vụ:

- `profiles` là bảng hồ sơ duy nhất; không phát triển thêm trên `users`.
- Khóa ngoại người dùng sử dụng `profiles.id`.
- Firebase UID được ánh xạ qua `current_profile_id()`.
- Migration phải có khả năng chạy lại an toàn và tránh xóa dữ liệu cũ.
- Viết policy riêng cho `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- Kiểm tra ít nhất các vai trò: khách, renter, owner và admin.
- Không dùng service-role key trong frontend.
- Supabase lỗi phải trả lỗi thật; không chuyển sang dữ liệu mẫu rồi báo thành công.

---

## 4. Kiểm tra frontend và hành trình người dùng

Chỉ áp dụng khi sửa UI hoặc luồng thao tác:

- Dữ liệu máy chủ dùng Supabase/TanStack Query.
- Zustand chỉ giữ trạng thái giao diện tạm thời.
- Không dùng `localStorage` làm nguồn chính cho phòng, tin nhắn, lịch hẹn, quyền hoặc thanh toán.
- Mỗi thao tác phải có trạng thái loading, success, error và retry phù hợp.
- Không tạo nút không có hành động.
- Giữ lại `returnUrl` khi đăng nhập giữa một hành trình.
- Không đặt `button` bên trong `link` hoặc ngược lại.
- Giữ giao diện trang chủ hiện tại nếu yêu cầu không nói thiết kế lại.
- Kiểm tra mobile ở chiều rộng tối thiểu 360px.

---

## 5. Kiểm tra thanh toán

Chỉ nạp phần này khi tác vụ liên quan thanh toán:

- Mã đơn và số tiền phải được tạo hoặc xác nhận phía server.
- Frontend không được tự đặt trạng thái `paid`.
- Chỉ webhook hợp lệ mới kích hoạt gói.
- Webhook phải kiểm tra chữ ký và chống xử lý trùng.
- Tài khoản demo chỉ dùng sandbox.
- Không coi mở QR, mở ứng dụng ngân hàng hoặc quay lại trang kết quả là thanh toán thành công.
- Không đặt số tài khoản, khóa thanh toán hoặc bí mật trong `SKILL.md`.

---

## 6. Xác minh trước khi bàn giao

Agent phải:

- Kiểm tra diff để phát hiện thay đổi ngoài phạm vi.
- Chạy `npm run build`.
- Chạy kiểm thử liên quan nếu dự án đã có script phù hợp.
- Test phải đi qua code production; không viết lại logic giả trong file test.
- Không tuyên bố thành công khi lệnh chưa chạy hoặc bị lỗi.
- Không commit, push, merge hay deploy nếu người dùng chưa yêu cầu rõ.
- Báo cáo ngắn: nguyên nhân, file đã sửa, kiểm thử đã chạy và hạn chế còn lại.
