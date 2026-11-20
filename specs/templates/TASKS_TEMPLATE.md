# Danh Sách Nhiệm Vụ: [TÊN TÍNH NĂNG]
> Liên kết Kế hoạch: [plan.md](./plan.md)  
> Tiến độ: 0% Hoàn thành  

---

## Giai đoạn 1: Chuẩn bị & Database Schema
- [ ] Task 1.1: Viết mã SQL migration cho bảng/cột mới (sử dụng `IF NOT EXISTS`).
- [ ] Task 1.2: Thiết lập RLS policies an toàn cho từng vai trò người dùng.
- [ ] Task 1.3: Cập nhật TypeScript types trong `src/types/`.

## Giai đoạn 2: Backend & API Services
- [ ] Task 2.1: Xây dựng endpoint Serverless trong `api/...` (kèm xác thực Firebase Auth).
- [ ] Task 2.2: Xử lý idempotent (chống xử lý trùng lặp) và kiểm tra quyền hạn (Role check).
- [ ] Task 2.3: Viết service client trong `src/lib/api/`.

## Giai đoạn 3: Frontend UI & Tích hợp Luồng
- [ ] Task 3.1: Xây dựng component giao diện với Tailwind CSS, chuẩn bị trạng thái Loading/Error/Success.
- [ ] Task 3.2: Gắn TanStack Query để nạp và làm mới dữ liệu máy chủ.
- [ ] Task 3.3: Tích hợp Toast thông báo thân thiện bằng tiếng Việt.

## Giai đoạn 4: Kiểm thử & Nghiệm thu (Quality Gate)
- [ ] Task 4.1: Chạy `npm run build` xác nhận không có lỗi biên dịch hoặc gãy bundle.
- [ ] Task 4.2: Chạy bài kiểm thử tự động chuyên biệt.
- [ ] Task 4.3: Báo cáo kết quả và đẩy code lên nhánh `main`.

