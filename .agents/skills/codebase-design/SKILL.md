---
name: codebase-design
description: Triết lý và từ điển thiết kế Deep Modules (Mô-đun sâu) cho Trọ Xinh. Dùng khi thiết kế giao diện module, bóc tách API, đặt Seam kiểm thử hoặc tối ưu kiến trúc không để phình to thành đống bùn (Ball of Mud).
---

# Codebase Design — Thiết Kế Module Sâu Cho Trọ Xinh

Kỹ năng này cung cấp ngôn ngữ chung và nguyên tắc thiết kế **Deep Modules** (Mô-đun sâu) dựa trên triết lý của John Ousterhout (*A Philosophy of Software Design*). Mục tiêu tối thượng là: **Giao diện công khai (Interface) đơn giản nhất có thể, nhưng giấu kín sức mạnh và độ phức tạp cao nhất bên trong.**

---

## 1. Thuật Ngữ Cốt Lõi (Core Vocabulary)

* **Module**: Bất kỳ đơn vị code nào có giao diện và phần cài đặt (ví dụ: một API client `messages.ts`, một hook `useOwnerUpgrade`, hoặc một component `VirtualRoomList`).
* **Interface (Giao diện công khai)**: Toàn bộ những gì caller (người gọi) phải biết để sử dụng: tên hàm, kiểu tham số, giá trị trả về, lỗi có thể văng ra.
* **Implementation (Cài đặt nội bộ)**: Khối code thực tế nằm ẩn bên trong module.
* **Depth (Độ sâu)**: Tỷ số đòn bẩy giữa hành vi cung cấp và độ phức tạp của Interface.
  * **Deep Module (Nên làm)**: Interface cực nhỏ (1-2 hàm dễ hiểu), nhưng bên trong giải quyết trọn vẹn logic phức tạp (caching, retry, fallback, realtime sync).
  * **Shallow Module (Cần tránh)**: Interface phức tạp cồng kềnh với hàng tá tham số, nhưng bên trong chỉ là các lệnh chuyển tiếp (pass-through) rỗng tuếch.
* **Seam (Điểm nối / Ranh giới)**: Nơi caller và module giao tiếp với nhau. Đây chính là nơi bài test (seam test) quan sát kết quả mà không cần thọc tay vào ruột module.
* **Leverage (Đòn bẩy)**: Lợi ích của caller — chỉ cần học 1 hàm đơn giản nhưng dùng được ở hàng chục màn hình khác nhau.
* **Locality (Tính cục bộ)**: Lợi ích bảo trì — khi cần sửa lỗi, logic chỉ nằm tập trung ở 1 file duy nhất, sửa một lần là toàn bộ hệ thống được sửa.

---

## 2. Mô Hình So Sánh Deep vs Shallow

```
✅ DEEP MODULE (Mục tiêu của Trọ Xinh)
┌──────────────────────────────────────────────┐
│  Interface Nhỏ: sendMessage(convId, text)    │  ← Dễ dùng, ít tham số
├──────────────────────────────────────────────┤
│  Implementation Sâu:                         │
│  - Kiểm tra Auth & Profile Cloud             │  ← Ẩn toàn bộ độ phức tạp
│  - Optimistic UI Update                      │  ← Caller không cần bận tâm
│  - WebSocket Realtime sync                   │
│  - Error Handling & Audit Log                │
└──────────────────────────────────────────────┘

❌ SHALLOW MODULE (Tuyệt đối tránh)
┌──────────────────────────────────────────────┐
│  Interface Cồng kềnh:                       │
│  prepareMessagePayload(user, token, headers) │
│  formatMessageRow(id, text, time, sender)    │  ← Bắt caller phải tự làm
│  validateSocketConnection(socket)            │
├──────────────────────────────────────────────┤
│  Implementation Nông:                        │  ← Chỉ pass-through
│  return fetch('/api/...')                    │
└──────────────────────────────────────────────┘
```

---

## 3. Ba Quy Tắc Thiết Kế Cho Trọ Xinh

### Quy tắc 1: Bài kiểm tra xóa bỏ (The Deletion Test)
Hãy tưởng tượng nếu xóa module này đi:
* Nếu độ phức tạp bốc hơi mất và code bên ngoài đơn giản hơn → Đó là một **Shallow Module vô dụng**, hãy xóa nó.
* Nếu độ phức tạp tái xuất hiện rải rác khắp 10 component khác nhau → Đó là một **Deep Module đắt giá**, hãy giữ và bảo vệ nó.

### Quy tắc 2: Truyền phụ thuộc, không tự tạo phụ thuộc ẩn
* **Dễ test**: Nhận service hoặc client qua tham số hoặc hook injection:
  ```typescript
  export async function processPayment(orderId: string, client = supabase) { ... }
  ```
* **Khó test**: Hardcode việc khởi tạo client hoặc gọi trực tiếp global `window`/`localStorage` bên trong ruột hàm.

### Quy tắc 3: Trả về kết quả, không sinh tác dụng phụ ngầm (Pure over Hidden Side-effects)
* Ưu tiên các hàm trả về dữ liệu tính toán (`calculatePrice(room, duration)`) thay vì các hàm tự sửa biến toàn cục bên ngoài (`updateGlobalCart()`).
* Đối với logic mạng: Trả về kết quả hoặc `throw` lỗi tường minh, **cấm tự ý catch lỗi rồi gán `success: true` giả lập**.
