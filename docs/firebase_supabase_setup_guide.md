# HƯỚNG DẪN CẤU HÌNH FIREBASE THIRD-PARTY AUTH TRÊN SUPABASE (GIAI ĐOẠN 1)

Tài liệu này hướng dẫn cách kích hoạt và liên kết **Firebase Authentication** làm nhà cung cấp định danh duy nhất (Third-Party Auth) cho **Supabase Database** của dự án Trọ Xinh.

---

## 1. THÔNG TIN DỰ ÁN LIÊN KẾT
- **Firebase Project ID:** `troxinh-eb`
- **Firebase Auth Domain:** `troxinh-eb.firebaseapp.com`
- **Supabase Project URL:** `https://nanhmbnpihlaojbwfebb.supabase.co`

---

## 2. BƯỚC 1: CẤU HÌNH SUPABASE DASHBOARD (THIRD-PARTY AUTH)

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn dự án: `nanhmbnpihlaojbwfebb` (hoặc tên dự án Trọ Xinh của bạn).
3. Ở thanh menu bên trái, truy cập vào: **Project Settings** (biểu tượng bánh răng) -> **Authentication**.
4. Cuộn xuống phần **Third-Party Auth** (hoặc **External Auth Providers / JWT Settings**).
5. Bật tùy chọn **Custom JWT Providers** (hoặc **Firebase Auth**):
   - **Provider Name:** `firebase`
   - **Project ID / Issuer URL:** `https://securetoken.google.com/troxinh-eb`
   - **JWKS URI:** `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
   - **Audience:** `troxinh-eb`
6. Nhấn **Save / Update Settings**.

---

## 3. BƯỚC 2: CẤU HÌNH FIREBASE CONSOLE

1. Đăng nhập vào [Firebase Console](https://console.firebase.google.com/).
2. Chọn project `troxinh-eb`.
3. Vào mục **Build** -> **Authentication** -> **Sign-in method**:
   - **Email/Password:** Bật (Enabled). Bật tùy chọn Email link (passwordless sign-in) nếu muốn.
   - **Google:** Bật (Enabled), nhập email hỗ trợ dự án.
   - **Phone:** Bật (Enabled).
4. Vào tab **Settings** -> **Authorized domains**:
   - Đảm bảo đã có: `localhost`, `troxinh-eb.firebaseapp.com`, `troxinh.vn`, và domain Vercel của bạn (ví dụ `troxinh.vercel.app`).

---

## 4. BƯỚC 3: CÁCH HOẠT ĐỘNG TRONG CODE (ĐÃ HOÀN TẤT)

1. **Khách hàng hoặc tài khoản Demo đăng nhập qua Firebase:**
   - Đăng nhập Google 1-chạm: `signInWithPopup(auth, googleProvider)`
   - Đăng nhập Email/Password: `signInWithEmailAndPassword(auth, email, password)`
   - Đăng nhập SĐT SMS: `signInWithPhoneNumber(auth, phone, recaptcha)`
   - Đăng nhập 3 Nút Demo (Admin, Chủ trọ, Sinh viên): Gọi Edge Function `create-demo-token` an toàn không để lộ password trong bundle.
2. **Supabase Client tự động đính kèm Token:**
   - Mỗi query tới Supabase đều gọi `accessToken: async () => await getFirebaseIdToken()`.
   - Supabase PostgREST xác thực JWT với Google JWKS và tự động điền `auth.jwt()`.
3. **Đồng bộ quyền và Profile:**
   - Bảng `profiles` lưu `firebase_uid` và `app_role` (`renter` / `owner` / `admin`).
   - RLS kiểm tra quyền tự động thông qua JWT `sub` và hàm PostgreSQL `current_profile_id()`.
