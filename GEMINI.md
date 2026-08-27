# Trọ Xinh — Antigravity Instructions

Tuân thủ `AGENTS.md` làm nguồn quy tắc chính. Không lặp lại toàn bộ quy tắc dự án trong file này.

## Cách xử lý yêu cầu

1. Xác định người dùng đang yêu cầu:
   - Báo cáo, audit, đề xuất hoặc viết prompt.
   - Chẩn đoán lỗi.
   - Triển khai hoặc sửa code.

2. Nếu chỉ được yêu cầu báo cáo hoặc chẩn đoán:
   - Đọc code và đưa bằng chứng.
   - Không tự sửa file, commit, push hoặc deploy.

3. Nếu được yêu cầu triển khai:
   - Kiểm tra `git status`.
   - Truy vết đầy đủ UI → service → Firebase/Supabase → phản hồi UI.
   - Ưu tiên thay đổi nhỏ nhất giải quyết đúng nguyên nhân.
   - Không tạo thêm service, store, bảng hoặc nguồn dữ liệu song song nếu hệ thống đã có.
   - Không che lỗi bằng mock data, localStorage, fallback hoặc `success: true`.

## Sử dụng skill

Chỉ đọc `.agents/skills/troxinh-workflow/SKILL.md` khi tác vụ liên quan:

- Đăng nhập, đăng ký, OTP hoặc phân quyền.
- Supabase, database, migration hoặc RLS.
- Thanh toán.
- Luồng người dùng đi qua nhiều màn hình.
- Kiểm tra trước khi bàn giao một thay đổi quan trọng.

Không tải skill cho các tác vụ nhỏ như sửa văn bản, icon, khoảng cách hoặc nội dung tĩnh.

## Kiểm tra và bàn giao

- Chạy `npm run build`.
- Chạy thêm test đúng phạm vi nếu có.
- Không tuyên bố thành công nếu chưa chạy hoặc test thất bại.
- Không tự đẩy `main`.
- Báo cáo ngắn gọn các file đã thay đổi, kết quả kiểm thử và phần chưa xác minh.
