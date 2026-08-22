# 🏠 Trọ Xinh - Nền Tảng Tìm Trọ & Quản Lý Nhà Trọ Đã Kiểm Duyệt (TroXinh.vn)

> **Tài liệu Handoff Chuẩn Hóa dành cho Developer & QA Engineers**  
> *Phiên bản: 1.2.0 | Cập nhật: 2026 | Khu vực hoạt động trọng điểm: Hà Nội*

---

## 📌 1. Giới Thiệu Tổng Quan

**Trọ Xinh (TroXinh.vn)** là nền tảng công nghệ kết nối trực tiếp giữa **Sinh viên / Người đi làm thuê trọ**, **Chủ nhà trọ đối tác** và **Đội ngũ Ban Quản Trị kiểm định**. Nền tảng giải quyết triệt để vấn nạn phòng ảo, lừa đảo tiền cọc và thông tin không minh bạch trên thị trường thuê nhà trọ hiện nay.

Giao diện được xây dựng bám sát chuẩn **1:1 từ hệ thống thiết kế Stitch**, áp dụng ngôn ngữ thiết kế hiện đại, tinh gọn với tông màu nhận diện chủ đạo **Forest Green (#006d37)**, font chữ tiếng Việt sắc nét **Be Vietnam Pro**, và cấu trúc dữ liệu mô phỏng thời gian thực (Realtime Mock Layer + LocalStorage Persistence).

---

## 🔐 2. Mô Hình Phân Quyền & Quản Lý Truy Cập (RBAC Model)

Hệ thống được thiết kế theo mô hình phân quyền chặt chẽ gồm **4 nhóm vai trò (Roles)** với cơ chế bảo vệ tuyến đường tự động (Route Guards):

```mermaid
graph TD
    A[Khách Vãng Lai / Guest] -->|Đăng Ký / Đăng Nhập| B(Người Thuê / Renter)
    B -->|Nộp hồ sơ /nang-cap-chu-tro| C{Đơn Chờ Thẩm Định / Pending}
    C -->|Admin Từ Chối| B
    C -->|Admin Phê Duyệt /admin/don-chu-tro| D(Chủ Trọ Đối Tác / Owner)
    E(Ban Quản Trị / Admin) -->|Kiểm duyệt tin & Thẩm định đối tác| D
```

### 2.1. Ma Trận Quyền Hạn Chi Tiết

| Chức Năng / Module | Khách (Guest) | Người Thuê (Renter) | Chủ Trọ (Owner) | Ban Quản Trị (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| Xem Trang Chủ, Tìm Kiếm, Bản Đồ | ✅ | ✅ | ✅ | ✅ |
| Xem Chi Tiết Phòng, Tòa Nhà, Hồ Sơ | ✅ | ✅ | ✅ | ✅ |
| Xem Chợ Đồ Cũ, Tìm Bạn Ở Ghép | ✅ | ✅ | ✅ | ✅ |
| Lưu phòng yêu thích (`/da-luu`) | ❌ *(Nhắc login)* | ✅ | ✅ | ✅ |
| Đặt lịch xem phòng (`/dat-lich/:id`) | ❌ *(Nhắc login)* | ✅ | ❌ | ❌ |
| Trò chuyện trực tiếp (`/tin-nhan`) | ❌ *(Nhắc login)* | ✅ | ✅ *(Chủ trọ)* | ✅ |
| Trung tâm thông báo (`/thong-bao`) | ❌ | ✅ | ✅ | ✅ |
| Nộp đơn nâng cấp chủ trọ (`/nang-cap-chu-tro`) | ❌ | ✅ | ❌ *(Đã là chủ trọ)*| ❌ |
| Bảng điều khiển SaaS Chủ Trọ (`/chu-tro/*`) | ❌ *(Chặn)* | ❌ *(Chặn + Prompt)*| ✅ | ❌ *(Chặn)* |
| Tạo tòa nhà mới 3 bước (`/chu-tro/toa-nha/tao-moi`)| ❌ | ❌ | ✅ | ❌ |
| Đăng tin phòng có Live Preview (`/chu-tro/phong/tao-moi`)| ❌ | ❌ | ✅ | ❌ |
| Hàng đợi duyệt tin phòng (`/admin/kiem-duyet`) | ❌ *(Chặn)* | ❌ *(Chặn)* | ❌ *(Chặn)* | ✅ |
| Thẩm định đơn đối tác chủ trọ (`/admin/don-chu-tro`)| ❌ *(Chặn)* | ❌ *(Chặn)* | ❌ *(Chặn)* | ✅ |
| Quản lý tài khoản & Analytics (`/admin/*`) | ❌ *(Chặn)* | ❌ *(Chặn)* | ❌ *(Chặn)* | ✅ |

---

## 🔄 3. Quy Trình Nâng Cấp Chủ Trọ & Phê Duyệt 24h (Owner Onboarding Flow)

Đây là quy trình khép kín đảm bảo 100% chủ nhà trên sàn đều được định danh hợp pháp:

```
[Người Thuê / Renter]
  └─► 1. Vào trang `/nang-cap-chu-tro`
  └─► 2. Điền form khai báo: Tên cụm nhà, Địa chỉ, Quận/Huyện, Số lượng phòng, Số CCCD, Ghi chú giấy tờ PCCC
  └─► 3. Gửi hồ sơ -> Trạng thái tài khoản chuyển thành 'pending'
  └─► 4. Xem trang tiến độ: `/nang-cap-chu-tro/trang-thai`

[Ban Quản Trị / Admin]
  └─► 5. Nhận thông báo hồ sơ mới & vào `/admin/don-chu-tro`
  └─► 6. Xem hồ sơ thẩm định -> Bấm "Phê duyệt" (hoặc "Từ chối" kèm lý do)

[Kết Quả / Transition]
  └─► Nếu Phê duyệt: Tài khoản Renter được nâng cấp thành 'owner' ngay lập tức
  └─► Chủ trọ có thể vào thẳng Bảng điều khiển SaaS: `/chu-tro` để quản lý tòa nhà & đăng phòng.
```

---

## 👥 4. Tài Khoản Demo Mẫu Dành Cho Dev/QA (1-Click Login)

Hệ thống tích hợp sẵn các tài khoản demo chuẩn cho từng vai trò:

| Vai Trò (Role) | Họ và Tên | Số Điện Thoại | Mật Khẩu | Điểm Bắt Đầu Đề Xuất | Ghi Chú Kỹ Thuật |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Người Thuê (Renter)** | Nguyễn Minh Anh | `0987654321` | `123456` | [`/tim-kiem`](http://localhost:3000/tim-kiem) | Sinh viên ĐHQG Hà Nội, đã lưu 2 phòng |
| **Chủ Trọ (Owner)** | Trần Quốc Tuấn | `0912345678` | `123456` | [`/chu-tro`](http://localhost:3000/chu-tro) | Sở hữu 3 tòa nhà tại Cầu Giấy, HBT, Đống Đa |
| **Ban Quản Trị (Admin)** | Admin Trọ Xinh | `1900888899` | `123456` | [`/admin`](http://localhost:3000/admin) | Quyền duyệt tin, duyệt đơn chủ trọ, thống kê |
| **Khách (Guest)** | *Chưa đăng nhập* | — | — | [`/`](http://localhost:3000/) | Thử nghiệm các tương tác chưa xác thực |

> 💡 **Mẹo Kiểm Thử Nhanh:** Sử dụng **Role Switcher Pill** ở góc phải thanh Navbar hoặc trang [`/debug`](http://localhost:3000/debug) để đổi vai trò tức thì mà không cần nhập mật khẩu.

---

## 🗺️ 5. Bản Đồ Tuyến Đường Đầy Đủ (Route Directory)

### 5.1. Công Khai (Public Core)
- `/` — **Trang Chủ (Landing Page)**: Hero search đa tiêu chí, cam kết kiểm duyệt, phòng nổi bật hôm nay, tìm bạn ghép & chợ đồ cũ preview.
- `/tim-kiem` & `/tim-phong` — **Danh Sách Phòng Trọ**: Bộ lọc theo Quận (Hà Nội), mức giá, loại phòng, tiện ích, kèm thanh sắp xếp giá/khoảng cách.
- `/ban-do` — **Bản Đồ Tương Tác**: Bản đồ mô phỏng vector định vị theo giá tiền, tích hợp các mốc đại học trọng điểm (ĐHQG, Bách Khoa, FTU) và sông Hồng.
- `/phong/:id` — **Chi Tiết Phòng Trọ**: Thư viện ảnh, thông tin giá điện nước, tiện nghi, đánh giá sao của người thuê trước, form liên hệ & đặt lịch.
- `/toa-nha/:id` — **Hồ Sơ Tòa Nhà**: Tổng quan tòa nhà đạt chuẩn, tiện ích chung, danh sách các phòng còn trống trong tòa.
- `/roommate` & `/tim-ban-cung-phong` — **Danh Sách Tìm Bạn Ở Ghép**: Bộ lọc giới tính, quận huyện, thẻ thói quen sinh hoạt (lifestyle tags).
- `/roommate/:id` & `/tim-ban-cung-phong/:id` — **Chi Tiết Bạn Ghép**: Hồ sơ cá nhân, phòng trọ đã liên kết, ngân sách chia sẻ.
- `/cho-do-cu` — **Chợ Đồ Cũ Sinh Viên**: Danh sách thanh lý nội thất, đồ gia dụng, sách vở (lọc đồ rẻ / tặng 0đ).
- `/cho-do-cu/:id` — **Chi Tiết Món Đồ**: Tình trạng món đồ, thông tin người đăng, số điện thoại liên hệ.
- `/ve-chung-toi/kiem-duyet` & `/trust/da-kiem-duyet` — **Trang Cam Kết Kiểm Định**: Minh bạch quy trình thẩm định 24h & chính sách bảo vệ tiền cọc.

### 5.2. Xác Thực & Bảo Mật (Authentication)
- `/dang-nhap` — Đăng nhập bằng Số điện thoại + Mật khẩu, hỗ trợ 1-Click Role Login.
- `/dang-ky` — Đăng ký tài khoản mới (Chọn vai trò Người thuê hoặc Chủ trọ).
- `/xac-thuc-otp` — Xác thực OTP 6 chữ số kèm bộ đếm ngược gửi lại mã.
- `/quen-mat-khau` — Quy trình 3 bước khôi phục mật khẩu (SĐT -> OTP -> Mật khẩu mới).

### 5.3. Người Thuê Trọ (Renter Protected Modules)
- `/onboarding` & `/onboarding/nguoi-thue` — 3 slide giới thiệu tính năng người thuê.
- `/toi` & `/ho-so` — Trang cá nhân, thông tin trường lớp, quản lý các lịch hẹn đã đặt.
- `/da-luu` — Danh sách phòng trọ yêu thích (hỗ trợ bỏ lưu và hoàn tác Toast).
- `/thong-bao` — Trung tâm thông báo hệ thống, cập nhật duyệt tin và tin nhắn mới.
- `/tin-nhan` & `/tin-nhan/:threadId` — Hộp thư chat trực tiếp giữa khách thuê và chủ trọ.
- `/dat-lich/:roomId` — Form đặt lịch hẹn xem phòng trực tiếp (chọn ngày và ca giờ).
- `/nang-cap-chu-tro` — Form gửi hồ sơ đăng ký trở thành Đối Tác Chủ Trọ.
- `/nang-cap-chu-tro/trang-thai` — Màn hình theo dõi tiến độ thẩm định hồ sơ chủ trọ.

### 5.4. Hệ Thống SaaS Chủ Trọ (Owner Protected Modules)
- `/chu-tro/onboarding` — Onboarding 3 bước dành riêng cho chủ nhà trọ.
- `/chu-tro` & `/chu-tro/tong-quan` — **Bảng Điều Khiển Tổng Quan (Owner Dashboard)**: 4 KPI thống kê, đổi trạng thái phòng nhanh (Còn trống / Đã cho thuê).
- `/chu-tro/toa-nha` — Quản lý danh mục các tòa nhà đang vận hành.
- `/chu-tro/toa-nha/tao-moi` — Stepper 3 bước khai báo tòa nhà mới.
- `/chu-tro/toa-nha/:id` — Quản lý chi tiết tòa nhà của chủ trọ.
- `/chu-tro/phong/tao-moi` & `/chu-tro/phong/tao-moi/:buildingId` — Form đăng phòng mới với **Live Preview Card tương tác trực tiếp**.
- `/chu-tro/phong/:id` — Chi tiết quản lý phòng trọ, chỉ số lượt xem/lưu, chỉnh sửa trạng thái.
- `/chu-tro/tin-nhan` — Kênh trao đổi với khách thuê của chủ trọ.
- `/chu-tro/thong-bao` — Thông báo vận hành và lịch xem phòng mới.
- `/chu-tro/toi` — Hồ sơ pháp lý chủ trọ đối tác.

### 5.5. Ban Quản Trị & Vận Hành (Admin Protected Modules)
- `/admin` & `/admin/kiem-duyet` — **Hàng Đợi Duyệt Tin Đăng Phòng**: Phê duyệt hoặc từ chối tin đăng kèm lý do bắt buộc.
- `/admin/don-chu-tro` — **Thẩm Định Đơn Đăng Ký Chủ Trọ**: Xem thông tin CCCD, giấy phép PCCC, duyệt hoặc từ chối nâng cấp.
- `/admin/nguoi-dung` — Quản lý tài khoản toàn hệ thống (tìm kiếm, lọc vai trò, khóa/mở tài khoản).
- `/admin/thong-ke` — Báo cáo tăng trưởng phòng trọ, người dùng, phân bổ theo quận tại Hà Nội.

### 5.6. Công Cụ QA & Kỹ Thuật (Developer Tools)
- [`/debug`](http://localhost:3000/debug) — Bảng điều khiển QA toàn diện:
  - 🔄 **Nút "Reset Dữ Liệu Demo Ban Đầu"**: Xóa sạch LocalStorage và phục hồi dữ liệu gốc.
  - ⚡ **Chuyển đổi vai trò nhanh (Khách / Renter / Owner / Admin)**.
  - 📋 **Danh mục truy cập nhanh 35+ routes** hỗ trợ kiểm thử không cần gõ URL.
- `/404` — Trang báo lỗi 404 thân thiện kèm nút quay về trang chủ.

---

## 💻 6. Cài Đặt & Khởi Chạy (Local Development)

### Yêu Cầu Môi Trường:
- **Node.js**: Phiên bản `>= 18.0.0`
- **NPM**: Phiên bản `>= 9.0.0`

### Các Bước Cài Đặt:
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển (Dev Server)
npm run dev
```
> Truy cập ứng dụng tại: **`http://localhost:3000/`**

### Kiểm Tra Build Sản Phẩm:
```bash
npm run build
```

---

## 🧪 7. Kịch Bản Kiểm Thử Chuẩn Dành Cho QA (Test Scenarios)

### Kịch Bản 1: Luồng Người Thuê Đặt Lịch & Chat với Chủ Trọ
1. Chuyển vai trò sang **Renter** (`Nguyễn Minh Anh`).
2. Vào [`/tim-kiem`](http://localhost:3000/tim-kiem), lọc theo `Quận Cầu Giấy`.
3. Bấm vào phòng *"Phòng Studio Ban Công Thoáng Mát View Công Viên Cầu Giấy"*.
4. Bấm nút **"Đặt Lịch Xem Phòng"** -> Chọn ngày, ca giờ -> Bấm xác nhận.
5. Kiểm tra toast thông báo thành công và chuyển hướng đến trang cá nhân [`/toi`](http://localhost:3000/toi) thấy lịch hẹn mới.
6. Quay lại phòng, bấm **"Nhắn Tin Trực Tiếp"** -> Gõ tin nhắn -> Kiểm tra luồng chat tại [`/tin-nhan`](http://localhost:3000/tin-nhan).

### Kịch Bản 2: Luồng Nộp Đơn Nâng Cấp Chủ Trọ & Admin Phê Duyệt
1. Đăng nhập tài khoản Renter chưa có quyền chủ trọ.
2. Truy cập [`/nang-cap-chu-tro`](http://localhost:3000/nang-cap-chu-tro).
3. Điền đầy đủ thông tin tòa nhà và số CCCD -> Bấm **"Gửi Hồ Sơ"**.
4. Màn hình chuyển sang trạng thái chờ duyệt [`/nang-cap-chu-tro/trang-thai`](http://localhost:3000/nang-cap-chu-tro/trang-thai).
5. Đổi vai trò sang **Admin** qua Role Switcher -> Vào [`/admin/don-chu-tro`](http://localhost:3000/admin/don-chu-tro).
6. Tìm thấy đơn vừa gửi -> Bấm **"Phê duyệt hồ sơ"**.
7. Đổi lại vai trò của user ban đầu -> User đã trở thành **Owner** và có thể truy cập thẳng [`/chu-tro`](http://localhost:3000/chu-tro).

### Kịch Bản 3: Luồng Chủ Trọ Tạo Tòa Nhà & Đăng Phòng Mới
1. Chuyển vai trò sang **Owner** (`Trần Quốc Tuấn`).
2. Vào [`/chu-tro/toa-nha/tao-moi`](http://localhost:3000/chu-tro/toa-nha/tao-moi), hoàn thành 3 bước tạo tòa nhà mới tại Hà Nội.
3. Vào [`/chu-tro/phong/tao-moi`](http://localhost:3000/chu-tro/phong/tao-moi), nhập thông tin phòng và quan sát **Live Preview Card** cập nhật theo thời gian thực.
4. Bấm **"Đăng Tin & Gửi Kiểm Duyệt"**.
5. Đổi sang vai trò **Admin** -> Vào [`/admin/kiem-duyet`](http://localhost:3000/admin/kiem-duyet) -> Bấm **"Duyệt Tin Nhanh"**.
6. Tin phòng xuất hiện công khai trên sàn tìm kiếm [`/tim-kiem`](http://localhost:3000/tim-kiem) với huy hiệu **Đã Kiểm Duyệt**.

---

## 📦 8. Cấu Trúc Mã Nguồn (Project Architecture)

```
trõinhdemo/
├── public/                 # Favicon & Static public assets
├── src/
│   ├── components/
│   │   ├── layout/         # Navbar, Footer, DashboardSidebar, MobileBottomNav
│   │   ├── search/         # GuestPromptBanner, SearchFilters
│   │   ├── rooms/          # GuestViewingBar, RoomComponents
│   │   └── ui/             # Badge, Button, Cards, Input, Modal, Skeleton, ToastContainer...
│   ├── data/
│   │   └── mockData.ts     # Dữ liệu ban đầu (Users, Buildings, Rooms, Roommates, Items, Reviews)
│   ├── pages/              # 35 màn hình trang ứng dụng (Public, Auth, Renter, Owner, Admin, QA)
│   ├── store/
│   │   └── useAppStore.ts  # Zustand store với LocalStorage Persistence & toàn bộ action handlers
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces & types (User, Room, Building, Application...)
│   ├── App.tsx             # Định tuyến Router v6, Route Guards (OwnerRoute, AdminRoute)
│   ├── index.css           # Tailwind base styles & tokens
│   └── main.tsx            # Entry point
├── .gitignore              # Cấu hình bỏ qua node_modules, cache, .env
├── vercel.json             # Cấu hình điều hướng Vercel SPA Rewrites
├── package.json            # Scripts & Danh sách dependencies
└── README.md               # Tài liệu handoff chuẩn cho Dev & QA
```

---

## 🛠️ 9. Công Nghệ & Thư Viện Sử Dụng

- **Core**: React 18.3, TypeScript 5.7, Vite 6.0
- **Styling**: Tailwind CSS v3 (Design Tokens bám sát Stitch)
- **Icons**: Lucide React Icons
- **Animation**: Framer Motion
- **State Management**: Zustand v5 (Persist middleware)
- **Routing**: React Router v6
- **Build & Bundle**: Rollup / Vite

---

*Tài liệu này được biên soạn và chuẩn hóa bởi **Antigravity IDE** phục vụ chuyển giao kỹ thuật và kiểm thử chất lượng sản phẩm TroXinh.vn.*
