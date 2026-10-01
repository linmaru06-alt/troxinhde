---
name: domain-modeling
description: Xây dựng và duy trì mô hình miền (Domain Model), từ điển thuật ngữ GLOSSARY.md và các quyết định kiến trúc ADR cho Trọ Xinh. Dùng khi thảo luận thuật ngữ thực thể, thay đổi cấu trúc bảng, hoặc bổ sung luồng nghiệp vụ mới.
---

# Domain Modeling — Xây Dựng Mô Hình Miền Cho Trọ Xinh

Kỹ năng này chịu trách nhiệm bảo vệ và cập nhật liên tục **Ngôn ngữ chung (Ubiquitous Language)** của Trọ Xinh. Khi thảo luận hoặc triển khai code, Agent phải chủ động bảo vệ tính nhất quán của thuật ngữ và mô hình dữ liệu.

---

## 1. Nguyên Tắc Làm Việc Trong Phiên Chat

### A. Đối chiếu tức thì với `GLOSSARY.md`
Khi người dùng hoặc tài liệu nhắc tới một khái niệm mập mờ hoặc xung đột với file [GLOSSARY.md](file:///c:/Users/Windows/.gemini/antigravity-ide/scratch/tr%C3%B5inhdemo/GLOSSARY.md), Agent phải hỏi lại ngay:
* *Ví dụ*: "Trong `GLOSSARY.md`, hệ thống dùng `profiles` liên kết với Firebase Auth. Bác đang muốn lưu vào bảng `profiles` đúng không, vì dự án đã cấm dùng bảng `users` cũ?"

### B. Làm sắc nét từ ngữ mơ hồ
Nếu gặp các từ ngữ chung chung như "tài khoản", "người dùng", "chủ sở hữu", hãy quy chiếu về thực thể chính xác:
* "Tài khoản": Là **Firebase UID** (dùng cho xác thực) hay **Profile ID (UUID)** (dùng làm khóa ngoại trong database)?
* "Người đăng": Là **landlord** (đăng phòng trọ) hay **renter** (đăng tin ở ghép / thanh lý đồ cũ)?

### C. Đối chiếu với mã nguồn thực tế
Nếu phát hiện logic code hiện tại mâu thuẫn với nghiệp vụ vừa thảo luận, hãy nêu ra ngay:
* *Ví dụ*: "Code hiện tại đang cho phép mọi người dùng gửi tin nhắn trực tiếp qua Supabase Cloud, nhưng bác vừa nhắc tới việc chặn tin nhắn nếu chưa nâng cấp tài khoản. Chúng ta sẽ áp dụng quy tắc nào?"

---

## 2. Tiêu Chuẩn Tạo Tài Liệu Quyết Định Kiến Trúc (ADR)

Chỉ tạo file quyết định kiến trúc tại thư mục `docs/adr/XXXX-ten-quyet-dinh.md` khi thỏa mãn **toàn bộ 3 điều kiện**:
1. **Khó đảo ngược (Hard to reverse)**: Chi phí sửa lại trong tương lai là rất lớn (ví dụ: Quyết định dùng Firebase Auth làm nguồn xác thực duy nhất thay vì Supabase Auth native).
2. **Dễ gây ngạc nhiên nếu thiếu ngữ cảnh (Surprising without context)**: Lập trình viên mới vào đọc code sẽ tự hỏi: "Tại sao họ lại thiết kế theo cách này mà không làm theo cách phổ biến kia?".
3. **Kết quả của một sự đánh đổi thực sự (A real trade-off)**: Có ít nhất 2 phương án khả thi và chúng ta đã cân nhắc ưu/nhược điểm rõ ràng trước khi chọn.

### Mẫu cấu trúc 1 file ADR chuẩn:
```markdown
# ADR-000X: [Tiêu đề quyết định ngắn gọn]

* **Trạng thái**: Accepted
* **Ngày quyết định**: YYYY-MM-DD
* **Người quyết định**: Trọ Xinh Core Team

## Ngữ cảnh & Bài toán (Context)
Mô tả vấn đề đang gặp phải và các ràng buộc kỹ thuật.

## Các phương án đã cân nhắc (Considered Options)
1. Phương án A: Ưu điểm / Nhược điểm.
2. Phương án B: Ưu điểm / Nhược điểm.

## Quyết định lựa chọn (Decision Outcome)
Chọn phương án [A/B] vì các lý do cốt lõi...

## Hậu quả & Đánh đổi (Consequences)
* Tác động tích cực: ...
* Đánh đổi chấp nhận: ...
```
