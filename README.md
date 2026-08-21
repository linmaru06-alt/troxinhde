# Trọ Xinh - Nền Tảng Tìm Trọ & Quản Lý Nhà Trọ An Tâm (TroXinh.vn)

Ứng dụng web hoàn chỉnh được xây dựng bám sát **1:1 thiết kế Stitch**, phục vụ toàn diện 3 vai trò người dùng: **Người thuê (Renter)**, **Chủ trọ (Owner)**, và **Ban Quản Trị (Admin)**.

---

## 🌟 Tính Năng Nổi Bật

1. **100% Tiếng Việt Chuẩn Xác**: Toàn bộ nhãn, thông báo, form validate, toast, modal và trạng thái rỗng (empty state) đều được Việt hóa chuyên nghiệp.
2. **Typography Chuẩn**: Font chữ **Be Vietnam Pro** hiển thị dấu tiếng Việt sắc nét, tối ưu trên mọi màn hình.
3. **UX/UI Mượt Mà**:
   - Skeleton loading khi tải dữ liệu.
   - Trạng thái rỗng (Empty state) cho từng trang.
   - Hệ thống Toast thông báo tương tác tức thì.
   - Modal báo cáo vi phạm, xác nhận thao tác nguy hiểm.
4. **Mobile-First & Bottom Navigation**:
   - Tối ưu hiển thị Responsive trên Mobile/Tablet/Desktop.
   - Thanh điều hướng đáy (Bottom Navigation) linh hoạt theo từng vai trò (Người thuê / Chủ trọ / Admin).
5. **Điều Hướng & Trạng Thái 100% Khép Kín (Không Dead-End)**:
   - Tất cả các nút bấm, liên kết đều có phản hồi hoặc điều hướng chính xác theo luồng logic.
6. **Lưu Trữ & Mô Phỏng Realtime (LocalStorage + Mock Layer)**:
   - Tự động lưu trữ danh sách phòng đã lưu, tin nhắn hội thoại, thông báo, lịch hẹn và các phòng mới tạo.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Khởi động môi trường phát triển (Dev Server):
```bash
npm run dev
```
> Ứng dụng sẽ chạy tại địa chỉ: **`http://localhost:3000/`**

### 2. Kiểm tra Build sản phẩm:
```bash
npm run build
```

---

## 👥 Hướng Dẫn Đăng Nhập Demo 3 Vai Trò (1-Click Login)

Bạn có thể nhanh chóng chuyển đổi hoặc đăng nhập các vai trò thông qua:
1. **Pill Switcher** góc trên bên phải thanh Navbar (`Role: RENTER / OWNER / ADMIN / KHÁCH`).
2. **Nút bấm 1-Click** tại trang đăng nhập: [`/dang-nhap`](http://localhost:3000/dang-nhap).
3. **Bảng điều khiển QA:** [`/debug`](http://localhost:3000/debug).

| Vai Trò (Role) | Tên Người Dùng | Số Điện Thoại | Mật Khẩu | Trang Chủ Mặc Định |
| :--- | :--- | :--- | :--- | :--- |
| **Người Thuê (Renter)** | Nguyễn Minh Anh | `0987654321` | `123456` | `/tim-kiem` |
| **Chủ Trọ (Owner)** | Trần Quốc Tuấn | `0912345678` | `123456` | `/chu-tro` |
| **Ban Quản Trị (Admin)** | Admin Trọ Xinh | `1900888899` | `123456` | `/admin` |

---

## 🗺️ Bản Đồ Điều Hướng (Route Map)

### 1. Công Khai (Public Core)
- `/` — Trang chủ (Landing page với Hero search, cam kết kiểm duyệt, phòng nổi bật).
- `/tim-kiem` — Danh sách phòng trọ + Bộ lọc đa tiêu chí (khu vực, giá, loại phòng, tiện ích, sắp xếp).
- `/ban-do` — Bản đồ nhà trọ trực quan tương tác 2 chiều (Pin giá tiền ↔ Danh sách phòng).
- `/phong/:id` — Chi tiết phòng (Gallery ảnh, bảng giá, tiện nghi, đánh giá sao, đặt lịch, nhắn tin).
- `/toa-nha/:id` — Hồ sơ tòa nhà tổng quan & danh sách các phòng còn trống.
- `/roommate` & `/roommate/:id` — Tìm bạn ở ghép (Roommate matching theo ngân sách & lối sống).
- `/cho-do-cu` & `/cho-do-cu/:id` — Chợ đồ cũ sinh viên (Đồ thanh lý giá rẻ & Đồ tặng miễn phí 0đ).
- `/ve-chung-toi/kiem-duyet` — Trang giải thích quy trình kiểm định 24h & an tâm tiền cọc.

### 2. Xác Thực (Authentication)
- `/dang-nhap` — Đăng nhập phân quyền + Nút đăng nhập nhanh 1-Click.
- `/dang-ky` — Đăng ký tài khoản (Người thuê / Chủ trọ).
- `/xac-thuc-otp` — Nhập mã OTP 6 số với đồng hồ đếm ngược gửi lại mã.
- `/quen-mat-khau` — Quy trình 3 bước khôi phục mật khẩu.

### 3. Người Thuê (Renter)
- `/onboarding` — 3 slide giới thiệu tính năng người thuê.
- `/toi` — Trang hồ sơ cá nhân, lịch hẹn xem phòng.
- `/da-luu` — Danh sách phòng trọ đã lưu yêu thích (hỗ trợ bỏ lưu / hoàn tác).
- `/thong-bao` — Trung tâm thông báo (Duyệt tin, tin nhắn, hệ thống).
- `/tin-nhan` & `/tin-nhan/:threadId` — Hộp thư trò chuyện trực tiếp (hỗ trợ gợi ý tin nhắn nhanh).
- `/dat-lich/:roomId` — Form đặt lịch xem phòng trực tiếp (chọn ngày & khung giờ).

### 4. Chủ Trọ (Owner SaaS Dashboard)
- `/chu-tro/onboarding` — 3 slide onboarding dành cho đối tác chủ nhà.
- `/chu-tro` — Bảng điều khiển tổng quan (4 chỉ số thống kê, đổi trạng thái phòng nhanh).
- `/chu-tro/toa-nha` — Quản lý danh mục tòa nhà.
- `/chu-tro/toa-nha/tao-moi` — Stepper 3 bước khai báo tòa nhà mới.
- `/chu-tro/phong/tao-moi` — Form đăng phòng với **Live Preview Card thời gian thực**.
- `/chu-tro/phong/:id` — Quản lý chi tiết phòng, chỉ số lượt xem/lưu, xóa phòng.
- `/chu-tro/tin-nhan` & `/chu-tro/thong-bao` — Kênh liên lạc và thông báo của chủ trọ.
- `/chu-tro/toi` — Hồ sơ chủ nhà trọ đối tác.

### 5. Ban Quản Trị (Admin)
- `/admin` — Hàng đợi kiểm duyệt tin đăng (Duyệt ngay / Từ chối kèm lý do bắt buộc).
- `/admin/nguoi-dung` — Quản lý danh sách tài khoản người dùng.
- `/admin/thong-ke` — Báo cáo tăng trưởng, phân bổ khu vực & tỷ lệ kiểm duyệt.

### 6. Trang QA & Debug Dành Cho Dev
- [`/debug`](http://localhost:3000/debug) — Nút **"Reset Dữ Liệu Demo Ban Đầu"**, chuyển đổi vai trò và kiểm tra danh mục tất cả 30+ routes.

---

## 🛠️ Công Nghệ Sử Dụng
- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Match 100% design tokens & màu sắc từ Stitch)
- **Icons**: Lucide Icons
- **Animation**: Framer Motion
- **State Management**: Zustand với LocalStorage persistence
- **Routing**: React Router v6
