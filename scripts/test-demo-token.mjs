import assert from 'node:assert';
import { build } from 'esbuild';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ==============================================================================
// KIỂM THỬ EDGE FUNCTION create-demo-token (ĐƯỜNG CODE PRODUCTION)
// Bundle trực tiếp supabase/functions/create-demo-token/index.ts; chỉ thay `serve` của Deno std
// để lấy handler và giả lập Deno.env / fetch (audit log). Chữ ký token được kiểm bằng khóa công khai.
// ==============================================================================

console.warn = () => {};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundled = await build({
  entryPoints: [resolve(root, 'supabase/functions/create-demo-token/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
  plugins: [
    {
      name: 'deno-std-stub',
      setup(b) {
        b.onResolve({ filter: /^https:\/\/deno\.land\/std/ }, () => ({ path: 'serve', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'export const serve = (handler) => { globalThis.__handler = handler; };',
          loader: 'js',
        }));
      },
    },
  ],
});

const env = {};
globalThis.Deno = { env: { get: (k) => env[k] } };
const auditCalls = [];
globalThis.fetch = async (url, init) => {
  auditCalls.push({ url, body: JSON.parse(init.body) });
  return new Response(null, { status: 201 });
};
await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const handler = globalThis.__handler;

async function call(demoType) {
  const res = await handler(new Request('http://localhost/', { method: 'POST', body: JSON.stringify({ demoType }) }));
  return { status: res.status, body: await res.json() };
}

const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const serviceAccount = {
  client_email: 'firebase-adminsdk-test@troxinh-test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
};

let passed = 0;
async function test(name, fn) {
  auditCalls.length = 0;
  await fn();
  passed++;
  console.log(`✓ ${name}`);
}

env.SUPABASE_URL = 'https://example.supabase.co';
env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';

await test('Chưa cấu hình FIREBASE_SERVICE_ACCOUNT: không cấp token, báo lý do, vẫn ghi audit log', async () => {
  delete env.FIREBASE_SERVICE_ACCOUNT;
  const { status, body } = await call('renter');
  assert.equal(status, 200);
  assert.equal(body.customToken, null);
  assert.match(body.tokenError, /FIREBASE_SERVICE_ACCOUNT/);
  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0].body.action, 'demo_login');
});

await test('Demo Sinh viên: cấp Firebase custom token RS256 hợp lệ cho uid demo_renter_troxinh', async () => {
  env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(serviceAccount);
  const { body } = await call('renter');
  assert.equal(body.tokenError, null);
  const [h, p, s] = body.customToken.split('.');
  assert.deepEqual(decode(h), { alg: 'RS256', typ: 'JWT' });
  const payload = decode(p);
  assert.equal(payload.uid, 'demo_renter_troxinh');
  assert.equal(payload.iss, serviceAccount.client_email);
  assert.equal(payload.sub, serviceAccount.client_email);
  assert.equal(
    payload.aud,
    'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit'
  );
  assert.ok(payload.exp - payload.iat <= 3600);
  assert.deepEqual(payload.claims, { role: 'authenticated', is_demo_account: true });
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${h}.${p}`);
  assert.ok(verifier.verify(publicKey, Buffer.from(s, 'base64url')), 'chữ ký phải khớp khóa công khai');
  assert.equal(auditCalls[0].body.entity_id, 'demo_renter_troxinh');
});

await test('Demo Chủ trọ: cấp token cho uid demo_owner_troxinh', async () => {
  const { body } = await call('owner');
  assert.equal(decode(body.customToken.split('.')[1]).uid, 'demo_owner_troxinh');
});

await test('Demo Quản trị: không bao giờ cấp token (tránh trao quyền admin thật cho mọi người)', async () => {
  const { body } = await call('admin');
  assert.equal(body.customToken, null);
  assert.match(body.tokenError, /chỉ dùng để xem/);
});

await test('demoType không hợp lệ: trả lỗi 400', async () => {
  const { status } = await call('hacker');
  assert.equal(status, 400);
});

console.log(`\n${passed} kiểm thử create-demo-token đã qua.`);
