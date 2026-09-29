import assert from 'node:assert';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ==============================================================================
// KIỂM THỬ VÒNG ĐỜI TIN CHỢ ĐỒ CŨ (ĐƯỜNG CODE PRODUCTION)
// Bundle trực tiếp src/lib/marketplaceStatus.ts và src/lib/marketplaceFilter.ts,
// không sao chép lại logic trong file test.
// ==============================================================================

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundled = await build({
  stdin: {
    contents: "export * from './src/lib/marketplaceStatus'; export { filterMarketplaceItems } from './src/lib/marketplaceFilter';",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const code = bundled.outputFiles[0].text;
const lib = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const { toItemStatus, mapMarketplaceRow, toMarketplaceDbFields, getItemAvailability, getUnavailableReason, filterMarketplaceItems } = lib;

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

const baseRow = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  seller_id: '11111111-1111-1111-1111-111111111111',
  title: 'Nồi cơm điện Sharp',
  price: 150000,
  is_free: false,
  category: 'household',
  condition: 'new90',
  district: 'Quận Cầu Giấy',
  image_urls: ['a.jpg'],
  status: 'available',
  moderation_status: 'approved',
  created_at: '2026-09-01T00:00:00Z',
  profiles: { id: '11111111-1111-1111-1111-111111111111', full_name: 'Minh', phone: '0901234567', avatar_url: null },
};

console.log('\n=== KIỂM THỬ TRẠNG THÁI CHỢ ĐỒ CŨ ===\n');

test('Chuẩn hóa trạng thái DB sang nhãn hiển thị', () => {
  assert.equal(toItemStatus('available', 'approved'), 'Còn hàng');
  assert.equal(toItemStatus('sold', 'approved'), 'Đã bán');
  assert.equal(toItemStatus('given', 'approved'), 'Đã bán');
  assert.equal(toItemStatus('closed', 'approved'), 'Đã đóng');
  assert.equal(toItemStatus('pending', 'pending'), 'Chờ duyệt');
  assert.equal(toItemStatus('available', 'pending'), 'Chờ duyệt');
  assert.equal(toItemStatus('rejected', 'rejected'), 'Bị từ chối');
  assert.equal(toItemStatus('hidden', 'approved'), 'Đã ẩn');
  assert.equal(toItemStatus('deleted', 'approved'), null);
});

test('Map dòng DB: giữ trạng thái đã bán sau khi tải lại', () => {
  const item = mapMarketplaceRow({ ...baseRow, status: 'sold', closed_at: '2026-09-02T00:00:00Z' });
  assert.equal(item.status, 'Đã bán');
  assert.equal(item.moderationStatus, 'approved');
  assert.equal(item.closedAt, '2026-09-02T00:00:00Z');
  assert.equal(item.seller_id, baseRow.seller_id);
  assert.equal(item.userId, baseRow.seller_id);
  assert.equal(getItemAvailability(item), 'sold');
});

test('Tin đã xóa mềm không được đưa lên giao diện', () => {
  assert.equal(mapMarketplaceRow({ ...baseRow, status: 'deleted' }), null);
});

test('Không bịa số điện thoại, khu vực hay ảnh khi thiếu dữ liệu', () => {
  const item = mapMarketplaceRow({ ...baseRow, profiles: null, district: null, image_urls: [], images: null });
  assert.equal(item.userPhone, '');
  assert.equal(item.district, '');
  assert.equal(item.location, '');
  assert.deepEqual(item.images, []);
  assert.notEqual(item.userId, 'user_1');
});

test('Chỉ hiện số điện thoại khi tin đang bán và người bán cho phép', () => {
  assert.equal(mapMarketplaceRow(baseRow).userPhone, '0901234567');
  assert.equal(mapMarketplaceRow({ ...baseRow, show_phone: false }).userPhone, '');
  assert.equal(mapMarketplaceRow({ ...baseRow, status: 'sold' }).userPhone, '');
  assert.equal(mapMarketplaceRow({ ...baseRow, status: 'closed' }).userPhone, '');
});

test('Map danh mục, tình trạng, cách nhận đồ từ DB', () => {
  const item = mapMarketplaceRow({ ...baseRow, delivery_methods: ['tai_truong', 'khong_hop_le'], is_negotiable: true });
  assert.equal(item.category, 'Đồ gia dụng');
  assert.equal(item.condition, 'nhu_moi');
  assert.deepEqual(item.deliveryMethods, ['tai_truong']);
  assert.equal(item.isNegotiable, true);
});

test('Biểu mẫu -> cột DB -> hiển thị giữ nguyên dữ liệu', () => {
  const input = {
    name: '  Bàn học gấp  ',
    price: 200000,
    pricingType: 'Giá rẻ',
    category: 'Nội thất',
    condition: 'da_cu',
    location: 'KTX Mỹ Đình',
    district: 'Quận Nam Từ Liêm',
    description: 'Còn chắc chắn',
    images: ['x.jpg', 'y.jpg'],
    deliveryMethods: ['tu_den_lay'],
    isNegotiable: true,
  };
  const fields = toMarketplaceDbFields(input);
  assert.equal(fields.title, 'Bàn học gấp');
  assert.equal(fields.category, 'furniture');
  assert.equal(fields.condition, 'needs_repair');
  assert.deepEqual(fields.image_urls, ['x.jpg', 'y.jpg']);
  assert.ok(!('status' in fields), 'Client không được gửi trạng thái khi tạo/sửa tin');
  assert.ok(!('moderation_status' in fields));

  const back = mapMarketplaceRow({ id: baseRow.id, seller_id: baseRow.seller_id, status: 'pending', moderation_status: 'pending', ...fields });
  assert.equal(back.name, 'Bàn học gấp');
  assert.equal(back.category, 'Nội thất');
  assert.equal(back.condition, 'da_cu');
  assert.equal(back.location, 'KTX Mỹ Đình');
  assert.deepEqual(back.deliveryMethods, ['tu_den_lay']);
  assert.equal(back.status, 'Chờ duyệt');
});

test('Đồ tặng luôn có giá 0', () => {
  const fields = toMarketplaceDbFields({
    name: 'Tặng sách', price: 50000, pricingType: 'Miễn phí', category: 'Sách vở', condition: 'con_tot',
    location: '', district: '', description: '', images: ['s.jpg'], deliveryMethods: [], isNegotiable: false,
  });
  assert.equal(fields.price, 0);
  assert.equal(fields.is_free, true);
});

test('Lý do không liên hệ được phân biệt Đã bán và Đã đóng', () => {
  assert.match(getUnavailableReason('sold'), /đã bán/);
  assert.match(getUnavailableReason('closed'), /đóng tin/);
  assert.equal(getUnavailableReason('available'), '');
});

test('Danh sách công khai: ẩn tin đã đóng/đang ẩn/chờ duyệt, vẫn hiện tin đã bán', () => {
  const rows = [
    { ...baseRow, id: 'i1', status: 'available' },
    { ...baseRow, id: 'i2', status: 'sold' },
    { ...baseRow, id: 'i3', status: 'closed' },
    { ...baseRow, id: 'i4', status: 'hidden' },
    { ...baseRow, id: 'i5', status: 'pending', moderation_status: 'pending' },
    { ...baseRow, id: 'i6', status: 'deleted' },
  ];
  const items = rows.map(mapMarketplaceRow).filter(Boolean);
  assert.equal(items.length, 5);
  const publicIds = filterMarketplaceItems(items, { viewMode: 'public' }).map((i) => i.id).sort();
  assert.deepEqual(publicIds, ['i1', 'i2']);
  const mine = filterMarketplaceItems(items, { viewMode: 'my_items', currentUserId: baseRow.seller_id }).map((i) => i.id).sort();
  assert.deepEqual(mine, ['i1', 'i2', 'i3', 'i4', 'i5']);
});

console.log(`\nĐẠT ${passed}/${passed} KIỂM THỬ TRẠNG THÁI CHỢ ĐỒ CŨ\n`);
