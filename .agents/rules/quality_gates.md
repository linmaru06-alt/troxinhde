# Quy tắc Kiểm duyệt Chất lượng & Push Code (Quality Gates)

## 1. Kiểm tra bắt buộc trước khi commit hoặc push
- Tuyệt đối KHÔNG commit hoặc push code lên repository nếu chưa chạy và vượt qua lệnh kiểm tra build:
  ```bash
  npm run build
  ```
- Nếu `npm run build` gặp bất kỳ lỗi TypeScript nào, agent PHẢI tự động sửa triệt để tất cả các lỗi typecheck cho đến khi build hoàn tất thành công (exit code 0, không còn lỗi).

## 2. Quy tắc an toàn với Git & GitHub
- Tuyệt đối KHÔNG tự ý push code đang lỗi lên nhánh `main` làm sập Vercel và GitHub Actions CI.
- Không tự động commit và push bừa bãi khi tính năng chưa được xác minh hoặc kiểm thử.
- Mọi commit message phải rõ ràng, tuân thủ tiền tố chuẩn: `feat:`, `fix:`, `refactor:`, `chore:`.

## 3. Quy tắc kiểm tra SQL Migration & Supabase
- Mọi file SQL trong `supabase/migrations/` phải đảm bảo:
  - Kiểu dữ liệu UUID chuẩn xác (chỉ gồm ký tự hex `0-9, a-f`, ví dụ: `c0000000-0000-...`, không đặt chữ cái khác ngoài hex như `r000...`).
  - Dùng câu lệnh an toàn: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`.
  - Không phá vỡ khóa ngoại (Foreign Key) và kiểm tra RLS tương thích hoàn toàn với Firebase Auth (client anon).
