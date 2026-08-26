# 🌟 Quy Tắc Phát Triển & Chỉ Thị Dự Án Trọ Xinh (TroXinh.vn)

Tài liệu này định nghĩa các nguyên tắc phát triển, phong cách thiết kế và quy trình làm việc tự động bắt buộc cho AI Agent khi thao tác trên codebase **Trọ Xinh (TroXinh.vn)**.

---

## 🎯 1. Nguyên Tắc Ứng Xử & Quyền Tự Chủ (Autonomy)
1. **Ngôn ngữ**: Luôn giao tiếp bằng **Tiếng Việt** tự nhiên, chuyên nghiệp, súc tích và rõ ràng.
2. **Tự động hóa 100%**: Khi nhận yêu cầu chỉnh sửa hoặc phát triển tính năng:
   - Tự động phân tích, sửa code và kiểm tra.
   - Tự động chạy `npm run build` để kiểm tra lỗi biên dịch TypeScript.
   - Tự động commit và đẩy mã nguồn lên cả 2 nhánh Git (`upgrade/core-public-beta` và `main`).
   - Tuyệt đối không yêu cầu người dùng phải bấm submit hay xác nhận thủ công các lệnh thông thường.

---

## 🎨 2. Tiêu Chuẩn Giao Diện & Thiết Kế (UI/UX Guidelines)
1. **Phong cách chủ đạo**: Chuẩn phong cách sàn thương mại **Chợ Tốt (Chotot.com)** kết hợp công nghệ hiện đại.
2. **Bảng màu thương hiệu**:
   - Màu xanh thương hiệu chính: `#00a854` (Hover: `#009249`, Nền nhạt: `#e6f7ef`).
   - Màu nhận diện Ví MoMo: `#A50064` / `#D82D8B`.
   - Màu phụ trợ: Vàng ấm `#ffba00`, Đỏ cảnh báo `#e53935`.
3. **Typography**:
   - Sử dụng font chữ **Be Vietnam Pro** hoặc **Inter** hỗ trợ 100% tiếng Việt chuẩn xác.
4. **Mascot & Hình ảnh**:
   - Sử dụng hình ảnh linh vật 3D Trọ Xinh tại `public/images/mascot.png` cho các Popup Modal và trang chủ.
   - Không sử dụng ảnh hỏng hoặc ảnh placeholder vô nghĩa.

---

## 🔐 3. Tiêu Chuẩn Xác Thực (Unified Authentication)
1. **Động cơ Hợp nhất 1-Luồng**: Không tách riêng form đăng ký và đăng nhập.
2. **Luồng Số điện thoại**: Người dùng nhập SĐT ➔ Gửi OTP ➔ Xác thực 6 số ➔ Tự động lưu Supabase `users` (Đăng ký nếu mới, Đăng nhập nếu cũ).
3. **Luồng Mạng xã hội**: Bật popup chính thức Google Account Chooser, Facebook Login, Apple Sign-in.

---

## 💳 4. Tiêu Chuẩn Cổng Thanh Toán (Payment Gateways)
1. **Ví MoMo**:
   - Hỗ trợ **Deeplink 1-chạm** trên điện thoại: `momo://app?action=pay...`.
   - Hỗ trợ **Dynamic VietQR Napas MoMo (Mã 970422)** trên máy tính.
   - Tự động điền số tiền và mã hóa đơn, kèm đồng hồ đếm ngược 15 phút.
2. **VietQR / PayOS**: Chuyển khoản liên ngân hàng 24/7 qua 40+ app ngân hàng.
3. **Hóa đơn & Biên lai**: Tự động xuất biên lai PDF chuẩn kế toán khi giao dịch thành công.

---

## 🛠️ 5. Công Nghệ Nền Tảng (Tech Stack)
- **Frontend**: React 18.3, TypeScript 5.7, Vite 6, Tailwind CSS v3, Lucide React, Framer Motion.
- **Backend & Database**: Supabase PostgreSQL (`users`, `rooms`, `buildings`, `notifications`).
- **Auth Provider**: Firebase Auth SDK (Google, Phone, Facebook).
- **PWA**: vite-plugin-pwa (Hỗ trợ cài đặt trên iOS, Android, Desktop).
