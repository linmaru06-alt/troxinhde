import assert from 'node:assert';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ==============================================================================
// KIỂM THỬ ĐỊNH DANH HỒ SƠ SAU ĐĂNG NHẬP & ĐIỀU KIỆN ĐĂNG TIN CHỢ ĐỒ CŨ (ĐƯỜNG CODE PRODUCTION)
// Bundle trực tiếp src/lib/authService.ts và src/lib/api/marketplace.ts. Chỉ thay hai module
// kết nối mạng (src/lib/supabase.ts, src/lib/firebase.ts) bằng bản giả ở ranh giới,
// logic đồng bộ hồ sơ và kiểm tra người bán là code thật.
// ==============================================================================

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Code production ghi console.warn/error khi gặp lỗi giả lập; tắt để kết quả test dễ đọc
console.warn = () => {};
console.error = () => {};

const supabaseStub = `
export const isSupabaseConfigured = true;
export const supabase = {
  from: (...a) => globalThis.__sb.from(...a),
  rpc: (...a) => globalThis.__sb.rpc(...a),
  functions: { invoke: async (...a) => (globalThis.__invoke ? globalThis.__invoke(...a) : { data: null, error: { message: 'stub' } }) },
};
export const getFirebaseIdToken = async () => globalThis.__token ?? null;
`;

const firebaseStub = `
export const auth = {};
export const googleProvider = {};
export const facebookProvider = {};
export const appleProvider = {};
export class RecaptchaVerifier {}
export const signInWithPhoneNumber = async () => { throw new Error('stub'); };
export const signInWithPopup = async () => { throw new Error('stub'); };
export const signInWithEmailAndPassword = async () => { throw new Error('stub'); };
export const signInWithCustomToken = async (...a) => globalThis.__fb.signInWithCustomToken(...a);
export const createUserWithEmailAndPassword = async () => { throw new Error('stub'); };
export const sendPasswordResetEmail = async () => {};
export const fetchSignInMethodsForEmail = async () => [];
export const updateProfile = async () => {};
export const firebaseSignOut = async () => { globalThis.__signOuts = (globalThis.__signOuts || 0) + 1; };
`;

const bundled = await build({
  stdin: {
    contents:
      "export * from './src/lib/authService'; export { createMarketplaceItem } from './src/lib/api/marketplace';",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
  plugins: [
    {
      name: 'network-boundary-stubs',
      setup(b) {
        b.onResolve({ filter: /^\.{1,2}\/(.*\/)?(supabase|firebase)$/ }, (args) => ({
          path: args.path.endsWith('supabase') ? 'supabase' : 'firebase',
          namespace: 'stub',
        }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
          contents: args.path === 'supabase' ? supabaseStub : firebaseStub,
          loader: 'js',
        }));
      },
    },
  ],
});
const code = bundled.outputFiles[0].text;
const lib = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const {
  syncFirebaseUserToSupabase,
  completeFirebaseSignIn,
  confirmPhoneOtp,
  toNationalVietnamesePhone,
  isProfileUuid,
  createMarketplaceItem,
  loginWithDemoAccount,
} = lib;

// Supabase giả: ghi lại chuỗi lệnh, trả kết quả theo handler của từng test
function fakeSupabase(handler) {
  const calls = [];
  const from = (table) => {
    const ops = [];
    const builder = new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === 'then') {
            const p = Promise.resolve(handler({ table, ops, terminal: 'await' }));
            return p.then.bind(p);
          }
          if (prop === 'maybeSingle' || prop === 'single') {
            return () => {
              calls.push({ table, ops, terminal: prop });
              return Promise.resolve(handler({ table, ops, terminal: prop }));
            };
          }
          return (...args) => {
            ops.push([prop, ...args]);
            return builder;
          };
        },
      }
    );
    return builder;
  };
  const rpc = (name, args) => {
    calls.push({ rpc: name, args });
    return Promise.resolve(handler({ rpc: name, args }));
  };
  globalThis.__sb = { from, rpc };
  return calls;
}

const has = (ops, name) => ops.some((o) => o[0] === name);
const isProfileSelect = (q) => q.table === 'profiles' && has(q.ops, 'select') && !has(q.ops, 'upsert');

const PROFILE_ID = '5b0c3a52-9d8e-4c47-8f2e-1a2b3c4d5e6f';
const FB_UID = 'Xy7Qk2LmN9pR4sT6uV8wZ1aB3cD5';
const fbUser = (extra = {}) => ({
  uid: FB_UID,
  email: null,
  phoneNumber: '+84987654321',
  displayName: 'Lina',
  photoURL: null,
  ...extra,
});
const profileRow = (extra = {}) => ({
  id: PROFILE_ID,
  firebase_uid: FB_UID,
  full_name: 'Lina',
  phone: '0987654321',
  app_role: 'renter',
  ...extra,
});

let passed = 0;
async function test(name, fn) {
  globalThis.__signOuts = 0;
  globalThis.__token = null;
  await fn();
  passed++;
  console.log(`✓ ${name}`);
}

await test('Chuẩn hóa SĐT Firebase (+84...) về dạng 0... như hàm SQL normalize_vn_phone', () => {
  assert.equal(toNationalVietnamesePhone('+84987654321'), '0987654321');
  assert.equal(toNationalVietnamesePhone('84 987 654 321'), '0987654321');
  assert.equal(toNationalVietnamesePhone('0987654321'), '0987654321');
  assert.equal(toNationalVietnamesePhone(null), undefined);
});

await test('Firebase UID không bao giờ được coi là id hồ sơ', () => {
  assert.equal(isProfileUuid(FB_UID), false);
  assert.equal(isProfileUuid('usr_phone_0987654321'), false);
  assert.equal(isProfileUuid(PROFILE_ID), true);
});

await test('Có hồ sơ theo firebase_uid: trả về UUID, không ghép Firebase UID vào điều kiện id (tránh lỗi 22P02)', async () => {
  const calls = fakeSupabase((q) => {
    if (isProfileSelect(q)) {
      assert.ok(!has(q.ops, 'or'), 'Firebase UID không được ghép vào id.eq');
      assert.deepEqual(q.ops.find((o) => o[0] === 'eq'), ['eq', 'firebase_uid', FB_UID]);
      return { data: profileRow(), error: null };
    }
    throw new Error('Không được gọi thêm truy vấn khi đã có hồ sơ');
  });
  const profile = await syncFirebaseUserToSupabase(fbUser());
  assert.equal(profile.id, PROFILE_ID);
  assert.equal(calls.filter((c) => c.rpc).length, 0);
});

await test('Hồ sơ cũ theo SĐT đã xác thực: gọi RPC claim rồi đọc lại hồ sơ đã liên kết', async () => {
  let claimed = false;
  const calls = fakeSupabase((q) => {
    if (q.rpc === 'claim_profile_by_verified_phone') {
      claimed = true;
      return { data: PROFILE_ID, error: null };
    }
    if (isProfileSelect(q)) return { data: claimed ? profileRow() : null, error: null };
    throw new Error(`Truy vấn không mong đợi: ${JSON.stringify(q)}`);
  });
  const profile = await syncFirebaseUserToSupabase(fbUser());
  assert.equal(profile.id, PROFILE_ID);
  assert.ok(calls.some((c) => c.rpc === 'claim_profile_by_verified_phone'));
  assert.ok(!calls.some((c) => c.table === 'profiles' && has(c.ops, 'upsert')), 'không tạo hồ sơ trùng');
});

await test('Chưa có hồ sơ: tạo mới với SĐT dạng 0..., trả về UUID của bản ghi vừa tạo', async () => {
  let upsertPayload;
  fakeSupabase((q) => {
    if (q.rpc) return { data: null, error: null };
    if (q.table === 'profiles' && has(q.ops, 'upsert')) {
      upsertPayload = q.ops.find((o) => o[0] === 'upsert')[1];
      return { data: profileRow({ phone: upsertPayload.phone }), error: null };
    }
    if (isProfileSelect(q)) return { data: null, error: null };
    return { data: null, error: null };
  });
  const profile = await syncFirebaseUserToSupabase(fbUser());
  assert.equal(profile.id, PROFILE_ID);
  assert.equal(upsertPayload.firebase_uid, FB_UID);
  assert.equal(upsertPayload.phone, '0987654321');
});

await test('Tạo hồ sơ không đọc lại được bản ghi: báo lỗi, không dùng Firebase UID làm id', async () => {
  fakeSupabase((q) => {
    if (q.rpc) return { data: null, error: null };
    return { data: null, error: null };
  });
  await assert.rejects(() => syncFirebaseUserToSupabase(fbUser()), /không đọc lại được hồ sơ/i);
});

await test('SĐT đã thuộc tài khoản khác: báo lỗi rõ, đăng xuất Firebase, không vào ứng dụng', async () => {
  fakeSupabase((q) => {
    if (q.rpc) return { data: null, error: null };
    if (q.table === 'profiles' && has(q.ops, 'upsert')) {
      return {
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_profiles_phone_normalized"' },
      };
    }
    return { data: null, error: null };
  });
  const res = await completeFirebaseSignIn(fbUser());
  assert.equal(res.success, false);
  assert.match(res.error, /đã gắn với một tài khoản Trọ Xinh khác/);
  assert.equal(res.user, undefined);
  assert.equal(globalThis.__signOuts, 1);
});

await test('Supabase lỗi khi đọc hồ sơ: báo lỗi thật thay vì tạo hồ sơ mới', async () => {
  const calls = fakeSupabase((q) => {
    if (isProfileSelect(q)) return { data: null, error: { code: 'PGRST301', message: 'JWT invalid' } };
    throw new Error('Không được tạo hồ sơ khi không đọc được');
  });
  await assert.rejects(() => syncFirebaseUserToSupabase(fbUser()), /Không đọc được hồ sơ tài khoản trên Supabase: JWT invalid/);
  assert.ok(!calls.some((c) => c.table === 'profiles' && has(c.ops, 'upsert')));
});

await test('OTP chỉ do Firebase xác nhận: mã 123456 không còn được chấp nhận khi không có phiên SMS', async () => {
  globalThis.window = {};
  const res = await confirmPhoneOtp('123456');
  assert.equal(res.success, false);
  assert.match(res.error, /Phiên xác thực SMS đã hết hạn/);
  delete globalThis.window;
});

await test('Demo có custom token: đăng nhập Firebase thật rồi gắn hồ sơ demo có UUID', async () => {
  const DEMO_ID = '00000000-0000-0000-0000-000000000003';
  let usedToken;
  globalThis.__invoke = async (name, opts) => {
    assert.equal(name, 'create-demo-token');
    assert.deepEqual(opts.body, { demoType: 'renter' });
    return {
      data: {
        customToken: 'signed.custom.token',
        account: { uid: 'demo_renter_troxinh', name: 'Nguyễn Văn An (Người Thuê)', app_role: 'renter' },
      },
      error: null,
    };
  };
  globalThis.__fb = {
    signInWithCustomToken: async (_auth, token) => {
      usedToken = token;
      return { user: { uid: 'demo_renter_troxinh', email: 'nguoithue@troxinh.vn', phoneNumber: null, displayName: null, photoURL: null } };
    },
  };
  fakeSupabase((q) => {
    if (isProfileSelect(q)) {
      return { data: { id: DEMO_ID, firebase_uid: 'demo_renter_troxinh', full_name: 'Nguyễn Văn An (Người Thuê)', app_role: 'renter', is_demo_account: true }, error: null };
    }
    throw new Error('Không được tạo hồ sơ mới cho demo đã có sẵn');
  });
  const res = await loginWithDemoAccount('renter');
  assert.equal(usedToken, 'signed.custom.token');
  assert.equal(res.success, true);
  assert.equal(res.user.id, DEMO_ID);
  assert.equal(res.user.isDemoAccount, true);
  delete globalThis.__invoke;
});

await test('Demo không có token (máy chủ chưa cấu hình): vẫn vào chế độ xem với UUID hồ sơ demo', async () => {
  globalThis.__invoke = async () => ({
    data: { customToken: null, tokenError: 'missing', account: { uid: 'demo_owner_troxinh', name: 'Chủ trọ demo', app_role: 'owner' } },
    error: null,
  });
  globalThis.__fb = { signInWithCustomToken: async () => { throw new Error('không được gọi khi không có token'); } };
  fakeSupabase(() => ({ data: null, error: null }));
  const res = await loginWithDemoAccount('owner');
  assert.equal(res.success, true);
  assert.equal(res.user.id, '00000000-0000-0000-0000-000000000002');
  assert.equal(res.user.isDemoAccount, true);
  delete globalThis.__invoke;
});

const itemInput = {
  name: 'Bàn học gỗ',
  price: 200000,
  pricingType: 'Bán',
  category: 'Nội thất',
  condition: 'Như mới',
  location: 'Cầu Giấy',
  district: 'Quận Cầu Giấy',
  images: ['https://example.com/a.jpg'],
  description: 'còn mới',
  deliveryMethods: ['pickup'],
  isNegotiable: true,
};

await test('Đăng tin: id người bán không phải UUID thì chặn trước khi gọi máy chủ', async () => {
  const calls = fakeSupabase(() => ({ data: null, error: null }));
  globalThis.__token = 'token';
  await assert.rejects(() => createMarketplaceItem(FB_UID, itemInput), /chưa được đồng bộ hồ sơ/);
  assert.equal(calls.length, 0);
});

await test('Đăng tin: không có phiên Firebase (ví dụ tài khoản demo) thì báo lỗi rõ, không gửi insert', async () => {
  const calls = fakeSupabase(() => ({ data: null, error: null }));
  globalThis.__token = null;
  await assert.rejects(() => createMarketplaceItem(PROFILE_ID, itemInput), /Phiên đăng nhập đã hết hạn hoặc tài khoản demo/);
  assert.equal(calls.length, 0);
});

await test('Đăng tin: có phiên Firebase và UUID hồ sơ thì gửi insert với seller_id đúng hồ sơ', async () => {
  let inserted;
  fakeSupabase((q) => {
    if (q.table === 'marketplace_items' && has(q.ops, 'insert')) {
      inserted = q.ops.find((o) => o[0] === 'insert')[1];
      return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
    }
    return { data: null, error: null };
  });
  globalThis.__token = 'token';
  await assert.rejects(() => createMarketplaceItem(PROFILE_ID, itemInput), /không có quyền/);
  assert.equal(inserted.seller_id, PROFILE_ID);
});

console.log(`\n${passed} kiểm thử định danh hồ sơ & đăng tin đã qua.`);
