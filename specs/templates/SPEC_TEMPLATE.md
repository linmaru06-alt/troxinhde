# Đặc Tả Tính Năng: [TÊN TÍNH NĂNG]
> Trạng thái: Draft / In-Review / Approved  
> Ngày tạo: YYYY-MM-DD | Tác giả: [Tên người phụ trách]

---

## 1. Mục tiêu & Bối cảnh (What & Why)
* **Vấn đề cần giải quyết:** Mô tả nỗi đau của người dùng (người thuê, chủ trọ, quản trị viên) hoặc bài toán kinh doanh.
* **Mục tiêu đạt được:** Kết quả mong muốn sau khi tính năng hoàn thành.
* **Phạm vi (Scope):**
  * Những gì NẰM TRONG phạm vi (In-scope).
  * Những gì NẰM NGOÀI phạm vi (Out-of-scope).

---

## 2. Đối tượng người dùng & Vai trò (User Roles)
* [ ] Khách vãng lai (`guest`)
* [ ] Người thuê trọ (`user` / `renter`)
* [ ] Chủ trọ (`owner`)
* [ ] Quản trị viên (`admin`)

---

## 3. Câu chuyện người dùng (User Stories)
* **Là một** [vai trò],  
* **Tôi muốn** [hành động cụ thể],  
* **Để** [giá trị nhận được].

---

## 4. Tiêu chí nghiệm thu (Acceptance Criteria)
- [ ] **Kịch bản 1 (Happy Path):** Khi người dùng làm X thì hệ thống phản hồi Y.
- [ ] **Kịch bản 2 (Lỗi / Validation):** Khi người dùng nhập sai/thiếu thì hiển thị thông báo lỗi Z rõ ràng.
- [ ] **Kịch bản 3 (Quyền hạn):** Người dùng không đúng quyền bị chặn truy cập.

---

## 5. Các trường hợp ngoại lệ & Giới hạn (Edge Cases)
1. Trường hợp mất mạng (Offline / Network Drop): Xử lý ra sao?
2. Trường hợp trùng lặp request (Double Click / Race condition): Có chống trùng (Idempotency) không?
3. Dữ liệu rỗng / Chưa có bản ghi nào (Empty state): Hiển thị giao diện thế nào?

