import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const nodeRequire = createRequire(import.meta.url);

function loadTsModule(relPath) {
  const fullPath = path.resolve(ROOT_DIR, relPath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: fullPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const mod = { exports: {} };
  const dir = path.dirname(fullPath);

  const customRequire = (specifier) => {
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const normalized = specifier.replace(/\.js$/i, '.ts');
      const targetTs = path.resolve(dir, normalized);
      if (fs.existsSync(targetTs)) {
        return loadTsModule(path.relative(ROOT_DIR, targetTs));
      }
    }
    return nodeRequire(specifier);
  };

  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled.outputText);
  fn(mod.exports, customRequire, mod, fullPath, dir);
  return mod.exports;
}

const catalog = loadTsModule('src/lib/monetizationCatalog.ts');
const server = loadTsModule('api/_lib/monetizationServer.ts');
const walletServer = loadTsModule('api/_lib/walletServer.ts');
const ipnSource = fs.readFileSync(path.resolve(ROOT_DIR, 'api/webhook/payment-ipn.ts'), 'utf8');

console.log('🧪 Kiểm thử bảng giá & nghiệp vụ 3 dịch vụ trả phí Trọ Xinh...\n');

// 1. Dịch vụ 1 — Gói đăng phòng
assert.equal(catalog.FREE_LISTING_QUOTA, 2, 'Hạn mức miễn phí phải là 2 phòng đầu');
assert.equal(catalog.LISTING_PLANS.length, 4, 'Phải có đúng 4 gói đăng phòng trả phí');

const expectedListing = {
  single_15d: { priceXu: 30, durationDays: 15, billingType: 'one_time', freeRepostsGranted: 0 },
  single_30d: { priceXu: 50, durationDays: 30, billingType: 'one_time', freeRepostsGranted: 1 },
  featured: { priceXu: 149, yearlyPriceXu: 1430, roomLimit: 10, billingType: 'subscription' },
  pro: { priceXu: 450, yearlyPriceXu: 4320, roomLimit: -1, billingType: 'subscription' },
};

for (const [id, exp] of Object.entries(expectedListing)) {
  const clientPlan = catalog.getListingPlanById(id);
  const serverPlan = server.SERVER_LISTING_PLANS[id];
  assert.ok(clientPlan, `Thiếu gói client: ${id}`);
  assert.ok(serverPlan, `Thiếu gói server: ${id}`);
  assert.equal(clientPlan.priceXu, exp.priceXu, `Sai giá tháng/lẻ client gói ${id}`);
  assert.equal(serverPlan.priceXu, exp.priceXu, `Sai giá tháng/lẻ server gói ${id}`);
  assert.equal(clientPlan.billingType, exp.billingType);
  assert.equal(serverPlan.billingType, exp.billingType);
  if (exp.yearlyPriceXu !== undefined) {
    assert.equal(clientPlan.yearlyPriceXu, exp.yearlyPriceXu, `Sai giá năm (-20%) client gói ${id}`);
    assert.equal(serverPlan.yearlyPriceXu, exp.yearlyPriceXu, `Sai giá năm (-20%) server gói ${id}`);
  }
  if (exp.freeRepostsGranted !== undefined) {
    assert.equal(clientPlan.freeRepostsGranted, exp.freeRepostsGranted);
  }
  if (exp.roomLimit !== undefined) {
    assert.equal(clientPlan.roomLimit, exp.roomLimit);
  }
}

assert.equal(catalog.normalizeListingPlanId('basic'), 'featured', 'Alias cũ basic phải map sang featured');
console.log('  ✅ [PASS] Dịch vụ 1 (Gói đăng phòng): 2 phòng miễn phí, 4 gói 30/50/149/450 Xu & gói năm -20% khớp client/server');

// 2. Dịch vụ 2 — Gói đẩy tin
assert.equal(catalog.BOOST_PACKAGES.length, 4, 'Phải có đúng 4 gói đẩy tin');
const expectedBoost = {
  single: { priceXu: 15, days: 1, isGoldenHour: false },
  '3days': { priceXu: 29, days: 3, isGoldenHour: false },
  '7days': { priceXu: 59, days: 7, isGoldenHour: true },
  '30days': { priceXu: 199, days: 30, isGoldenHour: true },
};

for (const [id, exp] of Object.entries(expectedBoost)) {
  const clientPkg = catalog.getBoostPackageById(id);
  const serverPkg = server.SERVER_BOOST_PACKAGES[id];
  assert.ok(clientPkg && serverPkg, `Thiếu gói đẩy tin ${id}`);
  assert.equal(clientPkg.priceXu, exp.priceXu);
  assert.equal(serverPkg.priceXu, exp.priceXu);
  assert.equal(clientPkg.days, exp.days);
  assert.equal(serverPkg.days, exp.days);
  assert.equal(clientPkg.isGoldenHour, exp.isGoldenHour);
}
console.log('  ✅ [PASS] Dịch vụ 2 (Gói đẩy tin): 4 gói 15/29/59/199 Xu & giờ vàng khớp client/server');

// 3. Dịch vụ 3 — Gói quản lý phòng trọ K23
assert.equal(catalog.K23_PLAN_CATALOG.length, 3, 'Phải có đúng 3 gói K23');
const expectedK23 = {
  basic: { monthly: 49, yearly: 490, maxRooms: 10, maxBuildings: 1 },
  standard: { monthly: 129, yearly: 1290, maxRooms: 35, maxBuildings: 3 },
  chain: { monthly: 299, yearly: 2990, maxRooms: -1, maxBuildings: -1 },
};

for (const [code, exp] of Object.entries(expectedK23)) {
  const clientK23 = catalog.getK23PlanCatalogItem(code);
  const serverK23 = server.SERVER_K23_PLANS[code];
  assert.ok(clientK23 && serverK23, `Thiếu gói K23 ${code}`);
  assert.equal(clientK23.priceMonthlyXu, exp.monthly);
  assert.equal(serverK23.priceMonthlyXu, exp.monthly);
  assert.equal(clientK23.priceYearlyXu, exp.yearly, `K23 ${code} đóng 10 tặng 2`);
  assert.equal(clientK23.priceYearlyXu, clientK23.priceMonthlyXu * 10);
  assert.equal(serverK23.priceYearlyXu, exp.yearly);
  assert.equal(clientK23.maxRooms, exp.maxRooms);
  assert.equal(clientK23.maxBuildings, exp.maxBuildings);
}

assert.equal(catalog.normalizeK23PlanCode('pro'), 'standard', 'Alias K23 pro phải map sang standard');
assert.equal(catalog.normalizeK23PlanCode('enterprise'), 'chain', 'Alias K23 enterprise phải map sang chain');
assert.equal(catalog.calculateK23AmountXu('standard', 'quarterly').effectiveCycle, 'monthly', 'Không còn chu kỳ quarterly');
console.log('  ✅ [PASS] Dịch vụ 3 (Hệ thống K23): 3 gói 49/129/299 Xu, đóng 10 tặng 2, bỏ quarterly');

// 4. Coupon & Quy đổi Xu (1 Xu = 1.000 VNĐ)
assert.equal(catalog.XU_TO_VND_RATE, 1000);
assert.equal(server.XU_TO_VND_RATE, 1000);

for (const code of ['TROXINH50', 'TROXINH', 'CHUTROVIP', 'SINHVIEN', 'CHUTRO', 'BANMOI']) {
  const clientCoupon = catalog.validateMonetizationCoupon(code);
  const serverPercent = server.resolveCouponDiscountPercent(code);
  assert.equal(clientCoupon.valid, true);
  assert.equal(clientCoupon.discountPercent, serverPercent, `Coupon ${code} lệch giữa client và server`);
}

const calcFeatured50 = catalog.calculateListingPlanAmountXu('featured', 'monthly', 'TROXINH50');
assert.equal(calcFeatured50.finalXu, 75, '149 * 50% làm tròn = 75 Xu');
assert.equal(calcFeatured50.amountVnd, 75000);

const calcFloor = catalog.calculateListingPlanAmountXu('single_15d', 'monthly', 'TROXINH50');
assert.ok(calcFloor.finalXu >= 1, 'Giá sau giảm tối thiểu 1 Xu');
console.log('  ✅ [PASS] Mã giảm giá & công thức Xu đồng bộ client/server');

// 5. sanitizeReturnUrl (chống open redirect)
assert.equal(catalog.sanitizeReturnUrl('//evil.com'), '/chu-tro');
assert.equal(catalog.sanitizeReturnUrl('https://evil.com/phishing'), '/chu-tro');
assert.equal(catalog.sanitizeReturnUrl('javascript:alert(1)'), '/chu-tro');
assert.equal(catalog.sanitizeReturnUrl('/chu-tro/phong/tao-moi?from=modal'), '/chu-tro/phong/tao-moi?from=modal');
console.log('  ✅ [PASS] sanitizeReturnUrl chặn redirect ngoài domain');

// 6. Tiền tố mã đơn hàng & regex Webhook IPN
const servicePrefixPairs = [
  ['listing_plan', 'TXGOI'],
  ['boost', 'TXBST'],
  ['k23', 'TXK23'],
  ['repost', 'TXGHN'],
];
assert.match(ipnSource, /TXNAP\[A-Z0-9\]\{6,16\}/, 'Webhook IPN phải hỗ trợ mã nạp Xu TXNAP...');
assert.match(ipnSource, /TX\(\?:GOI\|BST\|K23\|GHN\)\[A-Z0-9\]\{6,16\}/, 'Webhook IPN phải hỗ trợ mã dịch vụ TXGOI/TXBST/TXK23/TXGHN');

for (const [serviceType, prefix] of servicePrefixPairs) {
  const orderCode = server.generateServiceOrderCode(serviceType);
  assert.ok(orderCode.startsWith(prefix), `${orderCode} phải bắt đầu bằng ${prefix}`);
  const ipnMatch = orderCode.match(/\b(TX(?:GOI|BST|K23|GHN)[A-Z0-9]{6,16})\b/i);
  assert.ok(ipnMatch && ipnMatch[1] === orderCode, `Regex IPN phải khớp mã ${orderCode}`);
}
console.log('  ✅ [PASS] Mã đơn hàng TXNAP/TXGOI/TXBST/TXK23/TXGHN khớp regex Webhook IPN');

// 7. Đầu nhận thanh toán thống nhất Techcombank + MoMo
assert.equal(walletServer.WALLET_BANK_CONFIG.vietQrBankId, '970407');
assert.equal(walletServer.WALLET_BANK_CONFIG.accountNumber, '0888110789');
assert.equal(walletServer.WALLET_BANK_CONFIG.accountName, 'NGUYEN VU CHINH');
assert.equal(walletServer.WALLET_MOMO_CONFIG.phoneNumber, '0888110789');
assert.equal(walletServer.WALLET_MOMO_CONFIG.receiverName, 'NGUYEN VU CHINH');
console.log('  ✅ [PASS] Tài khoản nhận tiền thống nhất (Techcombank 970407 / MoMo 0888110789)');

console.log('\n🎉 TẤT CẢ KIỂM THỬ BẢNG GIÁ & DỊCH VỤ TRẢ PHÍ ĐỀU PASS!');

