# HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH TRỌ XINH TRÊN VERCEL (PUBLIC BETA)

Tài liệu này hướng dẫn chi tiết quy trình triển khai phiên bản **Trọ Xinh Public Beta** lên nền tảng **Vercel Production**, kết nối với Supabase Cloud và Firebase Authentication.

---

## 1. YÊU CẦU CHUẨN BỊ
1. Tài khoản GitHub chứa repository: `https://github.com/linmaru06-alt/troxinhde`
2. Tài khoản [Vercel](https://vercel.com)
3. Dự án [Supabase](https://supabase.com)
4. Dự án [Firebase Console](https://console.firebase.google.com)

---

## 2. BƯỚC 1: CẬP NHẬT DATABASE TRÊN SUPABASE CLOUD
1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard) ➔ Chọn dự án Trọ Xinh.
2. Vào mục **SQL Editor** ➔ Tạo truy vấn mới.
3. Mở file [`supabase/migrations/010_unified_public_beta_schema.sql`](file:///c:/Users/Windows/.gemini/antigravity-ide/scratch/trõinhdemo/supabase/migrations/010_unified_public_beta_schema.sql) trong thư mục dự án, sao chép toàn bộ nội dung và dán vào SQL Editor.
4. Bấm **Run** để khởi tạo bảng `profiles`, `audit_logs`, các hàm PostgreSQL Helper và phân quyền RLS.

---

## 3. BƯỚC 2: TẠO PROJECT TRÊN VERCEL
1. Đăng nhập [Vercel Dashboard](https://vercel.com/new).
2. Chọn **Add New Project** ➔ Chọn repository `linmaru06-alt/troxinhde`.
3. Tại phần cấu hình:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

---

## 4. BƯỚC 3: CẤU HÌNH BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES TRÊN VERCEL)
Tại mục **Environment Variables** trên Vercel, thêm các khóa sau:

| Tên biến (Key) | Giá trị mẫu / Mô tả |
| :--- | :--- |
| `VITE_SUPABASE_URL` | URL Supabase (VD: `https://nanhmbnpihlaojbwfebb.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Khóa Public Anon của Supabase |
| `VITE_FIREBASE_API_KEY` | Web API Key từ Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ID dự án Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | `<project-id>.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID từ Firebase |
| `VITE_FIREBASE_APP_ID` | App ID từ Firebase |
| `VITE_APP_ENV` | `production` |

---

## 5. BƯỚC 4: TRIỂN KHAI VÀ GẮN TÊN MIỀN RIÊNG (CUSTOM DOMAIN)
1. Bấm nút **Deploy** trên Vercel. Quá trình build sẽ hoàn tất trong khoảng 30–45 giây.
2. Để gắn tên miền `troxinh.vn`:
   - Vào **Project Settings** ➔ **Domains** ➔ Thêm `troxinh.vn` và `www.troxinh.vn`.
   - Cấu hình bản ghi DNS theo hướng dẫn của Vercel (bản ghi A `76.76.21.21` hoặc CNAME `cname.vercel-dns.com`).

---

## 6. KIỂM THỬ NHANH SAU TRIỂN KHAI (SMOKE TEST CHECKLIST)
- [ ] Truy cập trang chủ `/`: Giao diện hiển thị đủ phòng trọ, slogan chuẩn.
- [ ] Bấm đăng nhập Demo Admin: Vào trang `/admin/kiem-duyet` kiểm duyệt tin.
- [ ] Bấm đăng nhập Demo Chủ trọ: Vào trang `/chu-tro` đăng phòng trọ mới.
- [ ] Bấm đăng nhập Demo Sinh viên: Đặt lịch xem phòng và gửi tin nhắn chat realtime.
- [ ] Mở trên điện thoại di động: Đảm bảo responsive mượt mà, không bị tràn ngang.
