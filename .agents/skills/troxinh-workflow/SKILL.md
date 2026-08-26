---
name: troxinh-workflow
description: Comprehensive workflow guide and technical cheatsheet for developing and verifying features on TroXinh platform (Unified Auth, MoMo Payment, Supabase Database, and Chotot UI).
---

# 🚀 TroXinh Development & Verification Workflow

Kỹ năng này hướng dẫn quy trình tiêu chuẩn khi phát triển, kiểm thử và vận hành các phân hệ trên nền tảng **Trọ Xinh (TroXinh.vn)**.

---

## 1. Quy Trình Xác Thực Hợp Nhất (Unified Auth Flow)

Khi thao tác trên các file liên quan đến đăng nhập/đăng ký:
- Luôn sử dụng hàm `handleUnifiedAuth` từ `src/lib/supabaseAuthSync.ts` hoặc `src/lib/authService.ts`.
- Không tạo form đăng ký tách rời khỏi form đăng nhập.
- Luôn đảm bảo tài khoản mới được gán mặc định `role: 'user'`, trạng thái `verified: true`, và tự động lưu vào bảng `users` trên Supabase.

```typescript
import { handleUnifiedAuth } from '../lib/supabaseAuthSync';

const res = await handleUnifiedAuth({
  identifier: phoneOrEmail,
  authType: 'phone' | 'google' | 'facebook',
  name: fullName,
  intendedRole: 'renter' | 'owner',
});
```

---

## 2. Quy Trình Thanh Toán MoMo (MoMo Payment Gateway Flow)

Khi triển khai hoặc chỉnh sửa tính năng thanh toán:
- Sử dụng hàm `createMoMoPaymentOrder` từ `src/lib/momo.ts`.
- Luôn hỗ trợ cả 2 chế độ:
  1. **Mobile Deeplink**: `momo://app?action=pay&amount=...` mở trực tiếp App MoMo.
  2. **Dynamic QR Napas MoMo**: `generateMoMoQR(phoneNumber, amount, transferContent, accountName)`.
- Khi thanh toán thành công, gọi `generateInvoicePDF` từ `src/lib/generateInvoice.ts` để xuất hóa đơn PDF.

---

## 3. Quy Trình Kiểm Thử Tự Động & Đóng Gói (Build & Verification)

Trước khi hoàn thành bất kỳ tác vụ nào, luôn thực hiện theo thứ tự:

1. **Chạy kịch bản kiểm thử NodeJS**:
   ```bash
   node scripts/test-unified-auth.mjs
   ```
2. **Kiểm tra biên dịch TypeScript & Vite**:
   ```bash
   npm run build
   ```
3. **Đồng bộ tự động lên GitHub**:
   ```bash
   git add -A
   git commit -m "feat/fix: <mô tả chi tiết>"
   git push origin upgrade/core-public-beta
   git checkout main && git merge upgrade/core-public-beta && git push origin main && git checkout upgrade/core-public-beta
   ```

---

## 4. Bảng Tra Cứu Thông Tin Cấu Hình Cốt Lõi

- **Màu thương hiệu Chợ Tốt**: `#00a854` (Chính), `#009249` (Hover), `#e6f7ef` (Light).
- **Màu thương hiệu MoMo**: `#A50064` (Chính), `#D82D8B` (Accent).
- **Hotline & Zalo Vận Hành**: `0888 110 789` (Nguyễn Vũ Chính).
- **Tài khoản MoMo & Techcombank**: `0888110789`.
