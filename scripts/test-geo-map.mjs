import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DISTRICT_CENTERS,
  HANOI_UNIVERSITIES,
  buildAddressCandidates,
  cleanDistrictName,
  getDistanceKm,
  getDistrictCenter,
  isValidHanoiCoord,
  matchLocalAreaCoords,
  normalizeViText,
  resolveEntityCoordsSync,
  spreadCoincidentCoords,
} from '../src/lib/geocoding.ts';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}\n   -> ${err.message}`);
    failed++;
  }
}

console.log('\n=== KIỂM THỬ HỆ THỐNG ĐỊNH VỊ ĐỊA CHỈ & BẢN ĐỒ TRỌ XINH ===\n');

test('isValidHanoiCoord từ chối tọa độ 0/NaN/TP.HCM và chấp nhận Hà Nội', () => {
  assert.equal(isValidHanoiCoord(21.0333, 105.7937), true);
  assert.equal(isValidHanoiCoord(10.8, 106.7), false);
  assert.equal(isValidHanoiCoord(0, 0), false);
  assert.equal(isValidHanoiCoord(Number.NaN, 105.8), false);
});

test('Ưu tiên tọa độ explicit lat/lng hợp lệ cao hơn street/district/buildingGeo', () => {
  const res = resolveEntityCoordsSync({
    lat: 21.0281,
    lng: 105.7849,
    address: 'Số 10 Phố Bạch Mai, Quận Hai Bà Trưng',
    district: 'Quận Hai Bà Trưng',
    buildingGeo: { lat: 21.0005, lng: 105.8442 },
    buildingAddress: 'Số 10 Phố Bạch Mai, Quận Hai Bà Trưng',
  });
  assert.equal(res.source, 'explicit');
  assert.equal(res.lat, 21.0281);
  assert.equal(res.lng, 105.7849);
});

test('Phòng dùng chung buildingId nhưng KHÁC địa chỉ với tòa nhà không bị kéo về tòa nhà', () => {
  const bld1Geo = { lat: 21.0338, lng: 105.7982 }; // Ngõ 165 Cầu Giấy
  const bld1Addr = 'Số 18 Ngõ 165 Cầu Giấy, Phường Dịch Vọng';

  const res = resolveEntityCoordsSync({
    address: 'Ngõ 66 Triều Khúc, Tân Triều',
    district: 'Quận Thanh Xuân',
    school: 'ĐH Công Nghệ GTVT',
    buildingGeo: bld1Geo,
    buildingAddress: bld1Addr,
  });

  assert.notEqual(res.source, 'building');
  assert.equal(res.source, 'street');
  const distToCauGiay = getDistanceKm(res.lat, res.lng, bld1Geo.lat, bld1Geo.lng);
  assert.ok(distToCauGiay > 4, `Kỳ vọng khác Cầu Giấy (>4km), thực tế: ${distToCauGiay.toFixed(2)}km`);
});

test('Phòng cùng địa chỉ với tòa nhà kế thừa chính xác buildingGeo', () => {
  const bldGeo = { lat: 21.0338, lng: 105.7982 };
  const res = resolveEntityCoordsSync({
    address: 'Số 18 Ngõ 165 Cầu Giấy, Phường Dịch Vọng',
    district: 'Quận Cầu Giấy',
    buildingGeo: bldGeo,
    buildingAddress: 'Số 18 Ngõ 165 Cầu Giấy, Phường Dịch Vọng',
  });
  assert.equal(res.source, 'building');
  assert.equal(res.lat, bldGeo.lat);
  assert.equal(res.lng, bldGeo.lng);
});

test('Nhận diện đúng tọa độ tuyến đường/phố Hà Nội cho cả phòng trọ và tin ở ghép', () => {
  const chuaLang = matchLocalAreaCoords('Số 15 Ngõ 84 Chùa Láng', 'Quận Đống Đa');
  assert.equal(chuaLang.source, 'street');
  assert.ok(getDistanceKm(chuaLang.coords.lat, chuaLang.coords.lng, 21.0235, 105.8038) < 0.2);

  const vanQuan = matchLocalAreaCoords('KĐT Văn Quán, Đường 19/5', 'Quận Hà Đông');
  assert.equal(vanQuan.source, 'street');
  assert.ok(
    getDistanceKm(vanQuan.coords.lat, vanQuan.coords.lng, DISTRICT_CENTERS['Hà Đông'].lat, DISTRICT_CENTERS['Hà Đông'].lng) < 4
  );
});

test('buildAddressCandidates chuẩn hóa địa chỉ Việt Nam thành chuỗi truy vấn geocoder', () => {
  const candidates = buildAddressCandidates('Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng', 'Quận Cầu Giấy');
  assert.ok(candidates.length >= 2);
  assert.ok(candidates[0].includes('Hà Nội, Vietnam'));
  assert.ok(candidates.some((c) => c.toLowerCase().includes('cầu giấy')));
});

test('spreadCoincidentCoords giữ nguyên vị trí khác nhau và chỉ giãn ~12m khi trùng tọa độ', () => {
  const input = [
    { id: 'room_a', coords: { lat: 21.0338, lng: 105.7982 } },
    { id: 'rm_b', coords: { lat: 21.0338, lng: 105.7982 } },
    { id: 'room_c', coords: { lat: 21.0005, lng: 105.8442 } },
  ];
  const spread = spreadCoincidentCoords(input);

  const distAB = getDistanceKm(
    spread[0].displayCoords.lat,
    spread[0].displayCoords.lng,
    spread[1].displayCoords.lat,
    spread[1].displayCoords.lng
  );
  assert.ok(distAB > 0.008 && distAB < 0.03, `Khoảng cách giãn trùng phải ~12-24m, thực tế: ${(distAB * 1000).toFixed(1)}m`);
  assert.equal(spread[2].displayCoords.lat, 21.0005);
  assert.equal(spread[2].displayCoords.lng, 105.8442);
});

test('Tất cả 12 quận nội thành Hà Nội có tọa độ trung tâm hợp lệ', () => {
  const districts = [
    'Quận Cầu Giấy', 'Quận Đống Đa', 'Quận Hai Bà Trưng', 'Quận Thanh Xuân',
    'Quận Hà Đông', 'Quận Nam Từ Liêm', 'Quận Bắc Từ Liêm', 'Quận Ba Đình',
    'Quận Hoàng Mai', 'Quận Tây Hồ', 'Quận Long Biên', 'Quận Hoàn Kiếm',
  ];
  districts.forEach((d) => {
    const c = getDistrictCenter(d);
    assert.ok(isValidHanoiCoord(c.lat, c.lng), `Quận ${d} phải có tọa độ hợp lệ`);
    assert.equal(normalizeViText(cleanDistrictName(d)).startsWith('quan'), false);
  });
});

test('Dữ liệu mockData (mockData.ts) chứa tọa độ phân bổ nhiều quận chứ không dồn về 3 tòa nhà đầu', () => {
  const mockContent = readFileSync(join(process.cwd(), 'src', 'data', 'mockData.ts'), 'utf8');
  assert.ok(mockContent.includes('21.0338'), 'bld_1 phải có tọa độ Ngõ 165 Cầu Giấy');
  assert.ok(mockContent.includes('21.0005'), 'bld_2 phải có tọa độ Lê Thanh Nghị');
  assert.ok(mockContent.includes('21.0235'), 'bld_3 phải có tọa độ Chùa Láng');
  assert.ok(mockContent.includes("rm_1") && mockContent.includes("Số 18 Ngõ 165 Cầu Giấy"), 'rm_1 phải có địa chỉ và tọa độ riêng');
});

test('Migration 050 tồn tại, idempotent và không chứa DROP TABLE', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase', 'migrations', '050_geo_coordinates.sql'), 'utf8');
  assert.equal(/DROP\s+TABLE/i.test(sql), false, 'Tuyệt đối không chứa DROP TABLE');
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS lat'));
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS lng'));
  assert.ok(sql.includes('public.roommate_posts'));
  assert.ok(sql.includes('public.rooms'));
});

test('Khoảng cách trường Đại học dùng tọa độ Haversine chính xác (<2.5km từ ĐH Bách Khoa tới Lê Thanh Nghị)', () => {
  const bkhn = HANOI_UNIVERSITIES.find((u) => u.name.includes('Bách Khoa'));
  assert.ok(bkhn);
  const d = getDistanceKm(bkhn.coords[0], bkhn.coords[1], 21.0005, 105.8442);
  assert.ok(d < 1.0, `Lê Thanh Nghị cách ĐH Bách Khoa < 1km, thực tế: ${d.toFixed(2)}km`);
});

test('resolveEntityCoordsSync giữ nguyên tọa độ ghim dạng string số và không làm lệch vị trí', () => {
  const res = resolveEntityCoordsSync({
    lat: '21.03125',
    lng: '105.78891',
    address: 'Quận Cầu Giấy',
    district: 'Quận Cầu Giấy',
  });
  assert.equal(res.source, 'explicit');
  assert.equal(res.lat, 21.03125);
  assert.equal(res.lng, 105.78891);
});

test('MapPinPicker cập nhật tọa độ đồng bộ trước reverse-geocode và đồng nhất anchor [0, 0] với bản đồ xem', () => {
  const mapCode = readFileSync(join(process.cwd(), 'src', 'components', 'map', 'TroXinhMap.tsx'), 'utf8');
  const syncCallIdx = mapCode.indexOf('onLocationChange({ lat: newPos[0], lng: newPos[1] });');
  const reverseCallIdx = mapCode.indexOf('await reverseGeocodeAddress(newPos[0], newPos[1]);');
  assert.ok(syncCallIdx > 0 && reverseCallIdx > syncCallIdx, 'Phải gọi onLocationChange trước reverseGeocodeAddress');
  assert.equal(mapCode.includes('iconAnchor: [50, 15]'), false, 'Không dùng anchor [50, 15] gây lệch ngang theo độ rộng chữ');
  assert.equal(mapCode.includes('iconAnchor: [18, 36]'), false, 'Không dùng anchor [18, 36] không có mũi nhọn tâm ghim');
});

console.log(`\nKẾT QUẢ KIỂM THỬ BẢN ĐỒ & ĐỊNH VỊ: ${passed} Passed, ${failed} Failed\n`);
if (failed > 0) {
  process.exit(1);
}
