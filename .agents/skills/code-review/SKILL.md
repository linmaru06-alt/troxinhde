---
name: code-review
description: Quy trình Đánh giá mã nguồn (Code Review) 2 trục độc lập cho Trọ Xinh. Dùng trước khi commit, tạo PR, hoặc khi người dùng yêu cầu rà soát chất lượng code diff.
---

# Code Review — Rà Soát Mã Nguồn 2 Trục Độc Lập

Kỹ năng này thực hiện rà soát các thay đổi trong `git diff` theo **2 trục hoàn toàn độc lập**. Việc tách biệt này ngăn chặn tình trạng code đẹp nhưng làm sai nghiệp vụ, hoặc code chạy đúng nghiệp vụ nhưng để lại một đống rác bảo trì.

```
                  ┌──────────────────────────────┐
                  │          GIT DIFF            │
                  └──────┬────────────────┬──────┘
                         │                │
            ┌────────────▼──────┐   ┌─────▼─────────────┐
            │ TRỤC 1: TIÊU CHUẨN│   │ TRỤC 2: ĐẶC TẢ    │
            │  (STANDARDS &     │   │   (SPEC & AGENT   │
            │  FOWLER SMELLS)   │   │      RULES)       │
            └───────────────────┘   └───────────────────┘
```

---

## Trục 1: Tiêu Chuẩn Mã & 12 Mùi Hôi Code (Standards & Code Smells)

Rà soát diff xem có xuất hiện bất kỳ "mùi hôi code" (Fowler Code Smells) nào dưới đây không:

1. **Mysterious Name (Tên khó hiểu)**: Tên hàm, biến hoặc kiểu dữ liệu không thể hiện rõ mục đích (ví dụ: `data1`, `tempObj`, `handleX`). → Đổi tên thành tên trung thực, rõ nghĩa.
2. **Duplicated Code (Code trùng lặp)**: Đoạn logic giống hệt nhau xuất hiện ở 2 nơi trong diff. → Tách thành hàm dùng chung.
3. **Feature Envy (Dòm ngó dữ liệu ngoài)**: Một hàm truy cập dữ liệu của đối tượng khác nhiều hơn dữ liệu của chính nó. → Di chuyển hàm về gần đối tượng chứa dữ liệu.
4. **Data Clumps (Chùm dữ liệu đi kèm)**: Bộ 3-4 tham số luôn đi cùng nhau (`lat`, `lng`, `address`, `radius`). → Gom thành một interface TypeScript riêng biệt.
5. **Primitive Obsession (Lạm dụng kiểu nguyên thủy)**: Dùng chuỗi `string` tự do cho các khái niệm có tập giá trị hữu hạn như vai trò hoặc trạng thái. → Định nghĩa kiểu union hoặc enum (`'renter' | 'landlord' | 'admin'`).
6. **Repeated Switches (Switch/if lặp đi lặp lại)**: Các khối `if-else` kiểm tra loại bài đăng hoặc vai trò lặp lại khắp nơi. → Gom về một map cấu hình duy nhất.
7. **Shotgun Surgery (Phẫu thuật đạn ghém)**: Một thay đổi nghiệp vụ nhỏ bắt buộc phải đi sửa rải rác ở hàng chục file khác nhau. → Gom các thành phần biến động cùng nhau về một module sâu.
8. **Divergent Change (Thay đổi phân kỳ)**: Một file duy nhất liên tục bị chỉnh sửa vì nhiều lý do hoàn toàn không liên quan đến nhau. → Tách file thành các module đơn trách nhiệm.
9. **Speculative Generality (Trừu tượng hóa suy đoán)**: Viết thêm tham số, generic hoặc hook để đón đầu tương lai trong khi yêu cầu hiện tại không hề cần. → Xóa bỏ và giữ code đơn giản tối đa.
10. **Message Chains (Chuỗi gọi hàm dài ngoằng)**: Truy cập tầng tầng lớp lớp `a.b().c().d()`. → Ẩn việc điều hướng phía sau một hàm của đối tượng gốc.
11. **Middle Man (Kẻ trung gian vô dụng)**: Một class hoặc hàm hầu như chỉ làm mỗi việc gọi sang hàm khác mà không thêm bất kỳ giá trị nào. → Xóa bỏ kẻ trung gian, gọi trực tiếp đối tượng thật.
12. **Refused Bequest (Kế thừa miễn cưỡng)**: Kế thừa hoặc implement interface nhưng bỏ trống hoặc ném lỗi ở hầu hết các phương thức. → Chuyển sang dùng composition (kết hợp) thay vì thừa kế.

---

## Trục 2: Đặc Tả Nghiệp Vụ & Quy Tắc Trọ Xinh (Spec & Agent Rules)

Rà soát diff đối chiếu với yêu cầu của người dùng và các quy tắc sống còn trong `AGENTS.md`:

1. **Tuân thủ đúng phạm vi (No Scope Creep)**:
   * Diff chỉ sửa đúng những gì được yêu cầu, không tự ý đổi style giao diện, không tự ý sửa các chức năng ngoài phạm vi.
2. **Không che giấu lỗi (Zero Fake Fallbacks)**:
   * Có dòng nào dùng `localStorage` lưu tạm server state không?
   * Có chỗ nào `catch` lỗi Supabase/Firebase rồi âm thầm trả về `success: true` ảo không?
   * Mọi lỗi backend/database phải được hiển thị rõ ràng lên giao diện hoặc toast notification.
3. **Bảo toàn dữ liệu & An toàn Database**:
   * Không có bất kỳ lệnh xóa bảng phá hủy (`DROP TABLE`).
   * RLS policy phải phân định rõ ràng giữa dữ liệu cá nhân (`auth.uid() = user_id`) và dữ liệu công khai (`SELECT` cho phòng trọ, chợ đồ cũ).
4. **Không lộ Secret**:
   * Tuyệt đối không để lọt `service_role_key`, secret key thanh toán hoặc password vào frontend, logs hoặc tài liệu.

---

## Báo Cáo Kết Quả Code Review

Khi thực hiện review, hãy báo cáo kết quả theo mẫu chuẩn:
* **Trục 1 (Standards & Smells)**: Đạt / Có phát hiện (kèm trích dẫn dòng code cụ thể).
* **Trục 2 (Spec & Agent Rules)**: Đạt / Có vi phạm quy tắc dự án.
* **Kết luận**: Đủ điều kiện commit / Cần tinh chỉnh lại các điểm cụ thể.
