---
name: tdd
description: Quy trình Phát triển hướng kiểm thử (TDD) cho Trọ Xinh. Dùng khi viết tính năng mới, bổ sung logic tính toán, phân quyền hoặc sửa lỗi theo chu trình Red-Green-Refactor.
---

# Test-Driven Development (TDD) — Phát Triển Hướng Kiểm Thử

Kỹ năng này định nghĩa kỷ luật viết bài test trong Trọ Xinh. Một bài test giá trị là bài test đọc như một bản đặc tả nghiệp vụ, bảo vệ mã nguồn khi refactor và không phụ thuộc vào chi tiết cài đặt nội bộ.

---

## 1. Ba Giai Đoạn Cốt Lõi: Đỏ → Xanh → Tối Ưu (Red → Green → Refactor)

```
       ┌───────────────────────────────┐
       │ 1. RED (Viết Test Thất Bại)   │ ← Viết test tại Seam công khai
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │ 2. GREEN (Viết Vừa Đủ Code)   │ ← Chỉ viết vừa đủ để test xanh
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │ 3. REFACTOR (Dọn Code & Test) │ ← Tối ưu sạch đẹp mà test vẫn xanh
       └───────────────────────────────┘
```

1. **RED (Màu đỏ)**: Viết một ca kiểm thử mô tả chính xác yêu cầu mới. Chạy bài test và quan sát nó thất bại với lý do chính đáng (hàm chưa tồn tại hoặc kết quả chưa tính toán đúng).
2. **GREEN (Màu xanh)**: Viết **vừa đủ lượng code tối thiểu** để bài test vượt qua. Tuyệt đối không đoán trước các tính năng tương lai ngoài phạm vi ca test này.
3. **REFACTOR (Tối ưu)**: Cải tiến cấu trúc code cho gọn gàng, loại bỏ trùng lặp mà không làm đổi hành vi bên ngoài. Toàn bộ bài test phải tiếp tục chạy xanh.

---

## 2. Kiểm Thử Tại Đúng "Seam" (Public Interface)

* **Seam** là ranh giới công khai mà caller tiếp xúc với module:
  * Ví dụ trong Trọ Xinh: Hàm `findOrCreateConversation`, hàm `calculateDeposit`, hoặc endpoint kiểm tra quyền `hasUserReported`.
* **Quy tắc**:
  * Kiểm thử **thông qua Seam công khai**, không bao giờ kiểm thử các biến private hay hàm phụ trợ ẩn bên trong.
  * Nếu đổi tên một biến nội bộ hoặc thuật toán bên trong mà bài test bị vỡ → Đó là bài test tồi bị phụ thuộc cài đặt (Implementation-coupled).
  * Một bài test chuẩn chỉ vỡ khi **hành vi nghiệp vụ trả về cho người dùng bị sai lệch**.

---

## 3. Ba "Cạm Bẫy" Cần Tránh Khi Viết Test

1. **Cạm bẫy Tự Bằng Lòng (Tautological Test)**:
   * Viết assertion bằng cách tính lại giá trị y hệt như code trong hàm:
     ```typescript
     // SAI: Luôn pass vô nghĩa vì dùng chung công thức với code
     expect(calcTotal(a, b)).toBe(a + b);
     
     // ĐÚNG: So sánh với một giá trị chân lý độc lập cụ thể
     expect(calcTotal(3500000, 500000)).toBe(4000000);
     ```
2. **Cạm bẫy Lát Cắt Ngang (Horizontal Slicing)**:
   * Viết hàng loạt 20 bài test giả định cùng lúc rồi mới cặm cụi đi code. Cách này làm bài test bị cứng nhắc và xa rời thực tế.
   * **Nên làm**: Đi theo **Lát cắt dọc (Vertical Slice)**: 1 kịch bản test → 1 đoạn code tương ứng → Kiểm chứng xanh → Đi tiếp kịch bản kế tiếp.
3. **Cạm bẫy Mocking tràn lan**:
   * Mock sạch mọi hàm đến mức bài test không còn kiểm tra bất kỳ dòng code thực tế nào. Chỉ mock các dịch vụ mạng bên ngoài khó kiểm soát (như gửi SMS OTP thật hoặc cổng ngân hàng thật).

---

## 4. Tích Hợp Vào Bộ Kiểm Thử Trọ Xinh

Mọi bài test mới phải được đăng ký vào hệ thống kiểm thử tự động của dự án:
* Định vị file test: `scripts/test-*.mjs` hoặc nhúng trực tiếp vào `scripts/run-all-tests.mjs`.
* Chạy kiểm tra nhanh bằng lệnh:
  ```bash
  node scripts/run-all-tests.mjs
  ```
* Tiêu chuẩn chấp thuận: **100% các bộ test suites phải đạt trạng thái PASS** trước khi được phép commit mã nguồn.
