import assert from 'node:assert';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ==============================================================================
// KIỂM THỬ LUỒNG ĐĂNG XUẤT SAU KHI ĐĂNG NHẬP BẰNG EMAIL (ĐƯỜNG CODE PRODUCTION)
// Bundle trực tiếp src/store/useAppStore.ts và src/lib/authService.ts.
// Mô phỏng persistence bất đồng bộ (IndexedDB) của Firebase Auth và hành vi
// điều hướng window.location.href = '/' của trình duyệt.
// ==============================================================================

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const origError = console.error;
console.warn = () => {};
console.error = () => {};

// Polyfill window & localStorage trước khi import bundle store
const lsMap = new Map();
const ssMap = new Map();
const createStorageStub = (map) => ({
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => map.set(k, String(v)),
  removeItem: (k) => map.delete(k),
  clear: () => map.clear(),
  key: (i) => Array.from(map.keys())[i] ?? null,
  get length() {
    return map.size;
  },
});
const localStorageStub = createStorageStub(lsMap);
const sessionStorageStub = createStorageStub(ssMap);

let pendingRedirectUrl = null;
let fbUserAtRedirectInstant = undefined;
let persistedFbUser = null; // Mô phỏng bản ghi IndexedDB của Firebase Auth
let signOutCalls = 0;

globalThis.localStorage = localStorageStub;
globalThis.sessionStorage = sessionStorageStub;
globalThis.window = {
  localStorage: localStorageStub,
  sessionStorage: sessionStorageStub,
  location: {
    get href() {
      return pendingRedirectUrl || 'https://troxinh.vn/toi';
    },
    set href(val) {
      pendingRedirectUrl = val;
      // Ghi nhận trạng thái Firebase Auth ngay tại thời điểm trình duyệt rời trang!
      // Nếu firebaseSignOut() chưa xóa xong IndexedDB trước khi window.location.href gán,
      // trình duyệt sẽ hủy giao dịch IDB đang chạy dở và giữ nguyên persistedFbUser.
      fbUserAtRedirectInstant = persistedFbUser;
    },
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

const supabaseStub = `
export const isSupabaseConfigured = true;
export const supabase = {
  auth: { signOut: async () => ({ error: null }) },
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), or: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    upsert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
  }),
  rpc: async () => ({ data: null, error: null }),
  functions: { invoke: async () => ({ data: null, error: null }) },
};
export const getFirebaseIdToken = async () => 'fake-firebase-token';
`;

const firebaseStub = `
export const auth = {
  get currentUser() { return globalThis.__getFbUser ? globalThis.__getFbUser() : null; }
};
export const googleProvider = {};
export const facebookProvider = {};
export const appleProvider = {};
export class RecaptchaVerifier {}
export const signInWithPhoneNumber = async () => { throw new Error('stub'); };
export const signInWithPopup = async () => { throw new Error('stub'); };
export const signInWithEmailAndPassword = async (_auth, email) => {
  const user = {
    uid: 'fb_uid_email_001',
    email,
    displayName: 'Sinh Viên Test',
    photoURL: null,
    emailVerified: true,
    phoneNumber: null,
  };
  globalThis.__setFbUser(user);
  return { user };
};
export const signInWithCustomToken = async () => { throw new Error('stub'); };
export const createUserWithEmailAndPassword = async () => { throw new Error('stub'); };
export const fetchSignInMethodsForEmail = async () => [];
export const sendPasswordResetEmail = async () => {};
export const updateProfile = async () => {};
export const onAuthStateChanged = () => () => {};
export const onIdTokenChanged = () => () => {};
export const firebaseSignOut = async () => {
  globalThis.__incSignOut();
  // Mô phỏng thời gian xóa phiên khỏi IndexedDB của Firebase Web SDK
  await new Promise((r) => setTimeout(r, 25));
  if (globalThis.__shouldHangSignOut) {
    await new Promise(() => {});
  }
  globalThis.__setFbUser(null);
};
`;

globalThis.__getFbUser = () => persistedFbUser;
globalThis.__setFbUser = (u) => {
  persistedFbUser = u;
};
globalThis.__incSignOut = () => {
  signOutCalls++;
};
globalThis.__shouldHangSignOut = false;

const bundled = await build({
  stdin: {
    contents: `
      export { useAppStore } from './src/store/useAppStore';
      export * from './src/lib/authService';
    `,
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
      name: 'boundary-stubs',
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
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const { useAppStore, isAuthSigningOut } = mod;

async function runTests() {
  let passed = 0;

  // Test 1: Đăng nhập bằng email (Firebase session tồn tại) -> bấm logout()
  // Phải xóa xong phiên Firebase trước khi window.location.href = '/' được gán
  {
    pendingRedirectUrl = null;
    fbUserAtRedirectInstant = undefined;
    signOutCalls = 0;
    persistedFbUser = {
      uid: 'fb_uid_email_001',
      email: 'nguyenvana@gmail.com',
      displayName: 'Nguyễn Văn A',
      emailVerified: true,
    };
    localStorageStub.setItem('firebase:authUser:test:[DEFAULT]', JSON.stringify({ uid: 'fb_uid_email_001' }));

    useAppStore.getState().loginWithSocialUser({
      id: '11111111-1111-4111-8111-111111111111',
      firebaseUid: 'fb_uid_email_001',
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@gmail.com',
      role: 'user',
      emailVerified: true,
    });

    assert.ok(useAppStore.getState().currentUser, 'Precondition: user must be logged in');
    assert.ok(persistedFbUser, 'Precondition: Firebase session must exist');
    assert.strictEqual(isAuthSigningOut(), false);

    const logoutPromise = useAppStore.getState().logout();
    assert.strictEqual(isAuthSigningOut(), true, 'Trong khi đăng xuất, isAuthSigningOut() phải là true');
    await logoutPromise;

    assert.strictEqual(isAuthSigningOut(), false, 'Sau khi đăng xuất xong, isAuthSigningOut() trở về false');
    assert.strictEqual(pendingRedirectUrl, '/', 'Phải điều hướng về trang chủ / sau khi đăng xuất');
    assert.strictEqual(
      fbUserAtRedirectInstant,
      null,
      'Phiên Firebase trong IndexedDB phải được xóa XONG trước khi chuyển trang window.location.href = "/"'
    );
    assert.strictEqual(useAppStore.getState().currentUser, null, 'currentUser trong store phải là null');
    assert.strictEqual(localStorageStub.getItem('firebase:authUser:test:[DEFAULT]'), null, 'Key auth Firebase trong localStorage phải bị xóa');

    const persistedRaw = localStorageStub.getItem('troxinh_storage_v4');
    if (persistedRaw) {
      const parsed = JSON.parse(persistedRaw);
      assert.strictEqual(parsed.state.currentUser, null, 'localStorage phải lưu currentUser = null');
    }
    console.log('✓ Đăng xuất tài khoản email xóa xong phiên Firebase trước khi chuyển trang');
    passed++;
  }

  // Test 2: Bấm nút Đăng xuất nhiều lần liên tiếp không gọi signOut trùng lặp
  {
    pendingRedirectUrl = null;
    fbUserAtRedirectInstant = undefined;
    signOutCalls = 0;
    persistedFbUser = { uid: 'fb_uid_email_002', email: 'test2@gmail.com' };

    useAppStore.getState().loginWithSocialUser({
      id: '22222222-2222-4222-8222-222222222222',
      firebaseUid: 'fb_uid_email_002',
      name: 'User 2',
      email: 'test2@gmail.com',
      role: 'user',
    });

    await Promise.all([useAppStore.getState().logout(), useAppStore.getState().logout()]);
    assert.strictEqual(signOutCalls, 1, 'Chống nhấn đúp: chỉ gọi logoutAuth() 1 lần khi đang đăng xuất');
    assert.strictEqual(fbUserAtRedirectInstant, null);
    console.log('✓ Chống nhấn đúp nút Đăng xuất hoạt động đúng');
    passed++;
  }

  console.log(`\n${passed} kiểm thử đăng xuất tài khoản email đã qua.`);
}

runTests().catch((err) => {
  origError('❌ TEST FAILED:', err);
  process.exit(1);
});
