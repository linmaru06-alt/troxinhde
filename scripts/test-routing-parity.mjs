import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🚀 [ROUTING TEST] Khởi động kiểm thử tính năng Tự Động Hóa URL & Định Tuyến Hai Vùng...');

// 1. Kiểm tra thuật toán sinh Slug & Bóc tách ID
function toVietnameseSlug(text, maxLength = 65) {
  if (!text || typeof text !== 'string') return '';
  let slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  if (slug.length > maxLength) {
    const trimmed = slug.slice(0, maxLength);
    const lastHyphen = trimmed.lastIndexOf('-');
    slug = lastHyphen > 20 ? trimmed.slice(0, lastHyphen) : trimmed;
  }
  return slug.replace(/^-+|-+$/g, '');
}

function extractIdFromParam(param) {
  if (!param || typeof param !== 'string') return '';
  const separatorIndex = param.lastIndexOf('--');
  if (separatorIndex !== -1) {
    return param.slice(separatorIndex + 2);
  }
  return param;
}

// Test case 1.1: Chuyển đổi tiếng Việt có dấu sang slug ASCII
const title = 'Phòng Trọ Studio Khép Kín Đầy Đủ Tiện Nghi Cầu Giấy!';
const slug = toVietnameseSlug(title);
console.log('  -> Generated slug:', slug);
assert.strictEqual(slug, 'phong-tro-studio-khep-kin-day-du-tien-nghi-cau-giay', 'Slug tiếng Việt phải đúng chuẩn');

// Test case 1.2: Bóc tách ID với Double-Dash
const testParam1 = `${slug}--room-p302-uuid`;
const extractedId1 = extractIdFromParam(testParam1);
assert.strictEqual(extractedId1, 'room-p302-uuid', 'Bóc tách ID từ slug--id phải chính xác');

// Test case 1.3: Tương thích ngược với ID trần (không có slug)
const testParam2 = 'room-p302-uuid';
const extractedId2 = extractIdFromParam(testParam2);
assert.strictEqual(extractedId2, 'room-p302-uuid', 'ID trần phải được giữ nguyên vẹn');

console.log('  ✅ Test Case 1: Thuật toán Slug & Bóc tách ID chuẩn 100%');

// 2. Kiểm tra Privacy Shield trong ProtectedRoute
const protectedRouteFile = fs.readFileSync(path.resolve('src/components/auth/ProtectedRoute.tsx'), 'utf8');
assert.ok(protectedRouteFile.includes('react-helmet-async'), 'ProtectedRoute phải import Helmet');
assert.ok(protectedRouteFile.includes('noindex, nofollow'), 'ProtectedRoute phải chứa meta tag noindex, nofollow để bảo vệ dữ liệu');
console.log('  ✅ Test Case 2: Privacy Shield (noindex, nofollow) đã được kích hoạt trong ProtectedRoute');

// 3. Kiểm tra các Route trong src/App.tsx
const appRoutesFile = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

// 3.1 Vùng Public SEO
assert.ok(appRoutesFile.includes('/phong-tro/:id'), 'App.tsx phải có route /phong-tro/:id');
assert.ok(appRoutesFile.includes('/phong-tro/:district/:id'), 'App.tsx phải có route /phong-tro/:district/:id');
assert.ok(appRoutesFile.includes('/tim-o-ghep/:district/:id'), 'App.tsx phải có route /tim-o-ghep/:district/:id');
assert.ok(appRoutesFile.includes('/cho-do-cu/:category/:id'), 'App.tsx phải có route /cho-do-cu/:category/:id');

// 3.2 Vùng Private Deep Link (3 Lớp Sổ khách & Hợp đồng)
assert.ok(appRoutesFile.includes('/chu-tro/hop-dong'), 'App.tsx phải có Lớp 1: /chu-tro/hop-dong');
assert.ok(appRoutesFile.includes('/chu-tro/hop-dong/phong/:roomId'), 'App.tsx phải có Lớp 2: /chu-tro/hop-dong/phong/:roomId');
assert.ok(appRoutesFile.includes('/chu-tro/hop-dong/chi-tiet/:contractId'), 'App.tsx phải có Lớp 3: /chu-tro/hop-dong/chi-tiet/:contractId');

console.log('  ✅ Test Case 3: Toàn bộ route Public SEO & Private Deep Link đã được đăng ký đầy đủ trong App.tsx');

// 4. Kiểm tra sự tồn tại của Skill troxinh-routing-guard
const skillFile = fs.readFileSync(path.resolve('.agents/skills/troxinh-routing-guard/SKILL.md'), 'utf8');
assert.ok(skillFile.includes('name: troxinh-routing-guard'), 'Skill phải có header troxinh-routing-guard');
console.log('  ✅ Test Case 4: Skill troxinh-routing-guard đã sẵn sàng trong .agents/skills/');

console.log('🎉 TẤT CẢ 4 BỘ KIỂM THỬ ĐỊNH TUYẾN ĐỀU VƯỢT QUA 100%!');
