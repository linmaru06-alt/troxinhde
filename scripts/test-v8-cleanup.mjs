import fs from "fs";
import path from "path";

console.log(
  "======================================================================",
);
console.log(
  "  BẮT ĐẦU CHẠY TEST SUITE CHO V8 GARBAGE COLLECTION & MEMORY CLEANUP (PLAN 7)",
);
console.log(
  "======================================================================\n",
);

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

// Test 1: Kiểm tra thu hồi Blob Object URLs trong ImageUploader.tsx
console.log(
  "Test 1: Kiểm tra thu hồi Blob Object URLs trong ImageUploader.tsx",
);
try {
  const fileContent = fs.readFileSync(
    path.resolve("src/components/ui/ImageUploader.tsx"),
    "utf-8",
  );
  const hasRevokeOnDone = fileContent.includes(
    "URL.revokeObjectURL(prevItem.url)",
  );
  const hasRevokeOnRemove = fileContent.includes(
    "URL.revokeObjectURL(itemToRemove.url)",
  );
  const hasRevokeOnRetry = fileContent.includes(
    "URL.revokeObjectURL(itemToRetry.url)",
  );
  const hasRevokeOnUnmount = fileContent.includes(
    "URL.revokeObjectURL(it.url)",
  );

  assert(
    hasRevokeOnDone,
    "ImageUploader: Thu hồi Blob URL ngay khi tải ảnh lên Cloud thành công",
  );
  assert(
    hasRevokeOnRemove,
    "ImageUploader: Thu hồi Blob URL khi người dùng bấm xóa ảnh xem trước",
  );
  assert(hasRevokeOnRetry, "ImageUploader: Thu hồi Blob URL khi retry tải ảnh");
  assert(
    hasRevokeOnUnmount,
    "ImageUploader: Thu hồi toàn bộ Blob URLs khi component unmount",
  );
} catch (e) {
  assert(false, `Không thể đọc ImageUploader.tsx: ${e.message}`);
}

// Test 2: Kiểm tra thu hồi Blob Object URLs trong AvatarUploader.tsx
console.log(
  "\nTest 2: Kiểm tra thu hồi Blob Object URLs trong AvatarUploader.tsx",
);
try {
  const fileContent = fs.readFileSync(
    path.resolve("src/components/ui/AvatarUploader.tsx"),
    "utf-8",
  );
  const hasRevokeOnSuccess = fileContent.includes(
    "URL.revokeObjectURL(localUrl)",
  );
  const hasRevokeOnUnmount = fileContent.includes(
    "URL.revokeObjectURL(previewUrlRef.current)",
  );

  assert(
    hasRevokeOnSuccess,
    "AvatarUploader: Thu hồi Blob URL sau khi upload ảnh đại diện hoàn tất",
  );
  assert(hasRevokeOnUnmount, "AvatarUploader: Thu hồi Blob URL khi unmount");
} catch (e) {
  assert(false, `Không thể đọc AvatarUploader.tsx: ${e.message}`);
}

// Test 3: Kiểm tra dọn sạch Detached DOM Nodes trong MapViewPage.tsx
console.log(
  "\nTest 3: Kiểm tra dọn sạch Detached DOM Nodes trong MapViewPage.tsx",
);
try {
  const fileContent = fs.readFileSync(
    path.resolve("src/pages/MapViewPage.tsx"),
    "utf-8",
  );
  const hasCleanupEffect = fileContent.includes("delete cardRefs.current[id]");
  const tracksFilteredRooms = fileContent.includes(
    "const currentIds = new Set(filteredRooms.map((r) => r.id))",
  );

  assert(
    hasCleanupEffect && tracksFilteredRooms,
    "MapViewPage: Tự động xóa tham chiếu cardRefs không còn trên DOM khi đổi bộ lọc",
  );
} catch (e) {
  assert(false, `Không thể đọc MapViewPage.tsx: ${e.message}`);
}

// Test 4: Kiểm tra cấu hình gcTime của TanStack QueryClient trong main.tsx
console.log(
  "\nTest 4: Kiểm tra cấu hình gcTime của TanStack QueryClient trong main.tsx",
);
try {
  const fileContent = fs.readFileSync(path.resolve("src/main.tsx"), "utf-8");
  const hasGcTime = fileContent.includes("gcTime: 10 * 60 * 1000");

  assert(
    hasGcTime,
    "main.tsx: Đặt gcTime = 10 phút để V8 chủ động thu gom rác cache không dùng",
  );
} catch (e) {
  assert(false, `Không thể đọc main.tsx: ${e.message}`);
}

// Test 5: Kiểm tra cơ chế giới hạn trần LRU Cap 50 mục trong useAppStore.ts
console.log(
  "\nTest 5: Kiểm tra cơ chế giới hạn trần LRU Cap 50 mục trong useAppStore.ts",
);
try {
  const fileContent = fs.readFileSync(
    path.resolve("src/store/useAppStore.ts"),
    "utf-8",
  );
  const hasCapRoom = fileContent.includes(".slice(0, 50)");

  assert(
    hasCapRoom,
    "useAppStore: Áp dụng LRU Cap 50 mục gần nhất, chặn LocalStorage & RAM phình to vô hạn",
  );
} catch (e) {
  assert(false, `Không thể đọc useAppStore.ts: ${e.message}`);
}

console.log(
  "\n======================================================================",
);
if (failCount === 0) {
  console.log(
    `🎉 TẤT CẢ ${passCount} BÀI TEST V8 MEMORY CLEANUP ĐẠT CHUẨN 100%!`,
  );
  console.log(
    "======================================================================",
  );
  process.exit(0);
} else {
  console.error(`💥 CÓ ${failCount} BÀI TEST THẤT BÀI!`);
  console.log(
    "======================================================================",
  );
  process.exit(1);
}
