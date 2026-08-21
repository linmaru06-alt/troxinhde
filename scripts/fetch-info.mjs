import { execSync } from 'child_process';
import fs from 'fs';

// Read .env
let env = { ...process.env };
if (fs.existsSync('.env')) {
  const content = fs.readFileSync('.env', 'utf-8');
  content.split('\n').forEach(line => {
    const [k, v] = line.trim().split('=');
    if (k && v) env[k] = v;
  });
}

const cmd = `npx.cmd -y @_davideast/stitch-mcp tool list_screens -d "{\\"parent\\": \\"projects/2677664159020999894\\"}" --output json`;
const raw = execSync(cmd, { env }).toString();
const data = JSON.parse(raw);

console.log('=== DANH SÁCH 19 MÀN HÌNH MỚI NHẤT TỪ STITCH ===');
console.log('Tổng số màn hình:', data.screens?.length || 0);

(data.screens || []).forEach((s, idx) => {
  const shortId = s.name.split('/').pop();
  console.log(`${idx + 1}. [${s.title || 'Màn hình không tên'}] (ID: ${shortId})`);
  if (s.summary) console.log(`   📝 ${s.summary}`);
});
