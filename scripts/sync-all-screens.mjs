import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Read .env
let env = { ...process.env };
if (fs.existsSync('.env')) {
  const content = fs.readFileSync('.env', 'utf-8');
  content.split('\n').forEach(line => {
    const [k, v] = line.trim().split('=');
    if (k && v) env[k] = v;
  });
}

const projectId = '2677664159020999894';

// 1. Fetch screens list
console.log('Fetching screens list for project', projectId, '...');
const listCmd = `npx.cmd -y @_davideast/stitch-mcp site -l -p ${projectId}`;
const listRaw = execSync(listCmd, { env }).toString();
const listData = JSON.parse(listRaw);

const screens = listData.screens || [];
console.log(`Found ${screens.length} screens!`);

// Map routes
const routes = screens.map((s, idx) => ({
  screenId: s.screenId,
  route: s.suggestedRoute || `/screen-${idx + 1}`
}));

// Output directory
const outputDir = path.resolve('stitch/designs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate site
const routesJson = JSON.stringify(routes).replace(/"/g, '\\"');
console.log('Exporting all 19 screens to stitch/designs ...');

const genCmd = `npx.cmd -y @_davideast/stitch-mcp site -p ${projectId} -o stitch/designs --routes "${routesJson}"`;
const genRes = execSync(genCmd, { env }).toString();
console.log(genRes);
console.log('✅ Sync completed successfully!');
