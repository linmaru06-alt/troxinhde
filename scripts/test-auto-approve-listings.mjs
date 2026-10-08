import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('\n--- BẮT ĐẦU KIỂM TRA HỆ THỐNG TỰ ĐỘNG DUYỆT TIN & RLS HIỂN THỊ CÔNG KHAI (OPTION A) ---\n');

const projectRoot = process.cwd();

// Test 1: Migration 029 File Existence & Content
console.log('1. Kiểm tra File Migration 029 (029_auto_approve_and_public_listings.sql)');
const migrationPath = join(projectRoot, 'supabase', 'migrations', '029_auto_approve_and_public_listings.sql');
assert(existsSync(migrationPath), 'File migration 029 tồn tại trong thư mục supabase/migrations/');

if (existsSync(migrationPath)) {
  const migSql = readFileSync(migrationPath, 'utf8');
  assert(migSql.includes('Users can insert roommate posts'), 'Migration 029 có RLS Policy INSERT cho roommate_posts');
  assert(migSql.includes('Public view roommate posts'), 'Migration 029 có RLS Policy SELECT cho roommate_posts');
  assert(migSql.includes("ALTER TABLE public.rooms ALTER COLUMN moderation_status SET DEFAULT 'approved'"), 'Rooms được đặt default moderation_status = approved');
  assert(migSql.includes("ALTER TABLE public.marketplace_items ALTER COLUMN status SET DEFAULT 'available'"), 'Marketplace items được đặt default status = available');
  assert(migSql.includes("ALTER TABLE public.marketplace_items ALTER COLUMN moderation_status SET DEFAULT 'approved'"), 'Marketplace items được đặt default moderation_status = approved');
  assert(migSql.includes('CREATE OR REPLACE FUNCTION public.marketplace_items_guard'), 'Trigger guard được cập nhật để tự động duyệt tin mới đăng');
  assert(migSql.includes("UPDATE public.rooms") && migSql.includes("UPDATE public.marketplace_items"), 'Có câu lệnh kích hoạt hiển thị cho các tin cũ đang bị kẹt');
}

// Test 2: Room Creation API (src/lib/api/rooms.ts)
console.log('\n2. Kiểm tra API Tạo Phòng Trọ (src/lib/api/rooms.ts)');
const roomsApiPath = join(projectRoot, 'src', 'lib', 'api', 'rooms.ts');
const roomsApiContent = readFileSync(roomsApiPath, 'utf8');
assert(roomsApiContent.includes("moderation_status: 'approved'"), "createRoom gán moderation_status là 'approved'");
assert(roomsApiContent.includes("status: 'available'"), "createRoom gán status là 'available'");

// Test 3: Owner Create Room Page (src/pages/OwnerCreateRoomPage.tsx)
console.log('\n3. Kiểm tra UI Chủ Trọ Tạo Phòng (src/pages/OwnerCreateRoomPage.tsx)');
const createRoomPagePath = join(projectRoot, 'src', 'pages', 'OwnerCreateRoomPage.tsx');
const createRoomPageContent = readFileSync(createRoomPagePath, 'utf8');
assert(createRoomPageContent.includes("status: 'Còn trống'"), "OwnerCreateRoomPage lưu local store với status 'Còn trống'");
assert(createRoomPageContent.includes("verified: true"), "OwnerCreateRoomPage lưu local store với verified = true");
assert(createRoomPageContent.includes('xuất bản công khai'), 'Toast thông báo tin đăng đã được xuất bản công khai');

// Test 4: Marketplace DB Fields & Creation (src/lib/marketplaceStatus.ts & api/marketplace.ts)
console.log('\n4. Kiểm tra Chợ Đồ Cũ (src/lib/marketplaceStatus.ts & api/marketplace.ts)');
const mpStatusPath = join(projectRoot, 'src', 'lib', 'marketplaceStatus.ts');
const mpStatusContent = readFileSync(mpStatusPath, 'utf8');
assert(!mpStatusContent.includes("status: 'available'"), "Client toMarketplaceDbFields không gán cứng status (để trigger và default DB tự gán)");
assert(mpStatusContent.includes("CATEGORY_TO_DB"), "toMarketplaceDbFields chuẩn hóa danh mục DB hợp lệ");

const mpApiPath = join(projectRoot, 'src', 'lib', 'api', 'marketplace.ts');
const mpApiContent = readFileSync(mpApiPath, 'utf8');
assert(mpApiContent.includes('Tự động duyệt và hiển thị công khai ngay lập tức'), 'createMarketplaceItem có mô tả xuất bản công khai ngay');

// Test 5: Roommate Posts Direct Insertion & Poster Resolution (src/lib/api/roommates.ts)
console.log('\n5. Kiểm tra Bạn Ở Ghép (src/lib/api/roommates.ts & supabaseDataService.ts)');
const rmApiPath = join(projectRoot, 'src', 'lib', 'api', 'roommates.ts');
const rmApiContent = readFileSync(rmApiPath, 'utf8');
assert(rmApiContent.includes('resolveUserIdToUuid'), 'createRoommatePost chuẩn hóa poster_id qua resolveUserIdToUuid');
assert(rmApiContent.includes("from('roommate_posts')"), 'createRoommatePost chèn trực tiếp vào bảng roommate_posts');

const dataServicePath = join(projectRoot, 'src', 'lib', 'supabaseDataService.ts');
const dataServiceContent = readFileSync(dataServicePath, 'utf8');
assert(dataServiceContent.includes("moderation_status: 'approved'"), 'syncRoomToSupabase đặt moderation_status là approved');
assert(dataServiceContent.includes('resolveUserIdToUuid'), 'syncRoommatePostToSupabase chuẩn hóa posterId');

// Tổng kết
console.log(`\n==================================================`);
console.log(`KẾT QUẢ KIỂM TRA: ${passed} PASS, ${failed} FAIL`);
console.log(`TỶ LỆ THÀNH CÔNG: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
