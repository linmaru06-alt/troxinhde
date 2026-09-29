# Trọ Xinh — Agent Rules

## 1. Phạm vi và cách làm việc

- Giao tiếp, giải thích và báo cáo bằng tiếng Việt.
- Phân biệt rõ yêu cầu: tư vấn/audit/lập kế hoạch hay triển khai code.
- Nếu người dùng chỉ yêu cầu báo cáo, đề xuất hoặc prompt thì không sửa code.
- Khi triển khai, chỉ sửa đúng phạm vi và giữ nguyên thay đổi hiện có của người dùng.
- Không tự thiết kế lại giao diện, kiến trúc hoặc nghiệp vụ ngoài yêu cầu.

## 2. Kiến trúc bắt buộc

- Firebase là hệ thống xác thực duy nhất.
- Supabase là nguồn dữ liệu nghiệp vụ, realtime, storage và RLS duy nhất.
- Hồ sơ người dùng sử dụng `profiles`, `firebase_uid` và `app_role`.
- Không xây thêm chức năng mới dựa trên bảng `users`.
- TanStack Query quản lý dữ liệu máy chủ; Zustand chỉ giữ trạng thái UI tạm thời.
- Không dùng localStorage làm nguồn chính cho phiên, quyền, phòng, lịch hẹn, tin nhắn hoặc thanh toán.

## 3. Tính đúng đắn và bảo mật

- Không tạo OTP giả, phiên giả, dữ liệu giả hoặc kết quả thành công giả trong production.
- Chỉ đánh dấu đã xác minh sau khi Firebase xác thực thành công.
- Mọi lỗi Firebase, Supabase và webhook phải được trả về giao diện rõ ràng.
- Không đưa secret, service-role key, mật khẩu demo hoặc khóa thanh toán vào frontend, Git, log hay tài liệu.
- Migration phải bảo toàn dữ liệu; thay đổi bảng hoặc RLS phải kiểm tra theo từng vai trò.
- Frontend không được tự xác nhận giao dịch đã thanh toán.
- Demo login được giữ lại nhưng phải có nhãn demo và audit log.

## 4. UI/UX và triển khai

- Giữ bố cục và phong cách trang chủ hiện tại nếu người dùng không yêu cầu thiết kế lại.
- Mọi nút phải có hành động, loading, success hoặc error rõ ràng.
- Giữ đúng ngữ cảnh và `returnUrl` qua đăng nhập.
- Vercel là hosting chính thức; không thêm hoặc khôi phục deploy Netlify.

## 5. Hoàn thành tác vụ

- Trước khi sửa: kiểm tra `git status` và đọc đầy đủ luồng liên quan.
- Sau khi sửa: kiểm tra diff, chạy `npm run build` và test liên quan.
- Test phải sử dụng đường code production, không viết lại logic giả để test luôn thành công.
- Khi người dùng yêu cầu đồng bộ hoặc đẩy code: kiểm tra build thành công và đẩy trực tiếp lên nhánh `main`.
- Báo cáo: nguyên nhân, thay đổi, kiểm thử đã chạy và hạn chế còn lại.

Khi tác vụ liên quan auth, Supabase/RLS, thanh toán hoặc hành trình nhiều trang, đọc thêm `.agents/skills/troxinh-workflow/SKILL.md`.
