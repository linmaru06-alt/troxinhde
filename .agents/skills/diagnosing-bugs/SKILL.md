---
name: diagnosing-bugs
description: Quy trình 6 bước chẩn đoán lỗi chuyên sâu cho Trọ Xinh. Dùng khi gặp lỗi hỏng, văng ngoại lệ, lỗi realtime, lỗi Supabase/Firebase, hoặc khi người dùng báo có tính năng không hoạt động như mong muốn.
---

# Diagnosing Bugs — Quy Trình Chẩn Đoán Lỗi 6 Bước Cho Trọ Xinh

Kỹ năng này bắt buộc áp dụng khi điều tra các lỗi khó, lỗi phân tán hoặc lỗi không đồng bộ giữa Client và Server. **Tuyệt đối không đoán mò, không nhảy cóc các bước, và không che giấu lỗi bằng mock data hay localStorage.**

---

## Giai đoạn 1: Xây Dựng Vòng Lặp Phản Hồi Đỏ (Build A Red Feedback Loop)

Đây là bước cốt lõi nhất. Nếu không có một lệnh hoặc kịch bản tự động có khả năng **đi qua đường code lỗi và chuyển sang màu ĐỎ (Failed)**, bạn sẽ không bao giờ tìm ra đúng nguyên nhân.

**Cách tạo vòng lặp phản hồi theo thứ tự ưu tiên:**
1. **Bài test tự động (Automated test)**: Một ca kiểm thử trong `scripts/run-all-tests.mjs` hoặc file test độc lập gọi đúng hàm API bị lỗi.
2. **Kịch bản thăm dò Node.js (Probe script)**: Một đoạn mã chạy bằng `node scratch/test_probe.mjs` gọi trực tiếp vào Supabase hoặc backend endpoint với tham số mô phỏng lỗi.
3. **Headless Browser / Network trace**: Theo dõi chính xác request/response HTTP trả về mã `4xx`, `5xx` hoặc lỗi RLS PostgreSQL `42501`, `23503`.

> **Tiêu chuẩn hoàn thành GĐ 1**: Phải có **đúng 1 lệnh CLI duy nhất** đã chạy và tái hiện được chính xác triệu chứng người dùng mô tả. Không có lệnh này → CẤM chuyển sang Giai đoạn 2!

---

## Giai đoạn 2: Tái Hiện & Thu Nhỏ Tối Đa (Reproduce & Minimise)

Chạy lệnh ở GĐ 1 và quan sát kết quả màu đỏ.
* Cắt giảm các tham số thừa, cắt giảm giao diện, loại bỏ dữ liệu râu ria.
* Thu nhỏ payload gửi lên cho đến khi đạt được kịch bản **tối thiểu nhất mà vẫn phát sinh lỗi**.
* Mỗi chi tiết còn lại đều là **load-bearing** (nếu bỏ nó đi thì lỗi biến mất).

---

## Giai đoạn 3: Thiết Lập 3–5 Giả Thuyết Có Thể Bác Bỏ (Hypothesise)

Không neo vào giả định đầu tiên xuất hiện trong đầu. Liệt kê từ 3 đến 5 nguyên nhân tiềm năng. Mỗi giả thuyết phải tuân theo cấu trúc falsifiable:

> *"Nếu [X] là nguyên nhân thực sự, thì khi [thay đổi Y] lỗi sẽ biến mất / hoặc khi [đổi Z] mã lỗi sẽ thay đổi cụ thể."*

**Ví dụ thực tế trong Trọ Xinh:**
* *Giả thuyết 1*: Do `owner_applications.user_id` thiếu bản ghi tương ứng trong bảng `profiles` dẫn đến lỗi Foreign Key `23503`.
* *Giả thuyết 2*: Do RLS Policy chặn quyền insert của người dùng chưa xác minh.
* *Giả thuyết 3*: Do token Firebase chưa được đồng bộ sang Supabase JWT.

---

## Giai đoạn 4: Đặt Thăm Dò & Đo Đạc (Instrument)

* Thay đổi **đúng một biến số tại một thời điểm**.
* Mọi log kiểm tra tạm thời bắt buộc phải có tiền tố nhận diện duy nhất, ví dụ:
  ```typescript
  console.log('[DEBUG-probe-auth]', { uid: user?.uid, profileId });
  ```
* Việc gắn tiền tố này giúp đảm bảo 100% log tạm thời được xóa sạch ở khâu dọn dẹp cuối cùng.

---

## Giai đoạn 5: Viết Bài Test Bảo Vệ & Sửa Lỗi (Fix + Regression Test)

1. Đặt bài test kiểm thử tại đúng **Seam** (giao diện công khai của service).
2. Chạy test → Thấy test **FAILED** (màu đỏ).
3. Triển khai code sửa lỗi (hoặc migration SQL).
4. Chạy lại test → Thấy test **PASSED** (màu xanh).
5. Chạy lại kịch bản tổng thể ban đầu ở GĐ 1 để chắc chắn không gây tác dụng phụ gãy các tính năng lân cận.

---

## Giai đoạn 6: Dọn Dẹp Sạch Sẽ (Cleanup)

Trước khi commit và báo cáo người dùng:
- [ ] Kịch bản lỗi ban đầu không còn tái diễn.
- [ ] Toàn bộ bài test hồi quy (regression tests) trong `scripts/run-all-tests.mjs` chạy xanh 100%.
- [ ] Dùng `grep` quét và **xóa toàn bộ** các dòng log mang tiền tố `[DEBUG-...]`.
- [ ] Xóa các file script tạm thời trong thư mục scratch.
- [ ] Báo cáo rõ ràng: Triệu chứng ban đầu → Nguyên nhân gốc rễ (giả thuyết đúng) → Cách khắc phục.
