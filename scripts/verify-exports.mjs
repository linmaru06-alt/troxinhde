import fs from 'fs';
import path from 'path';

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

console.log('Verifying all', files.length, 'pages in src/pages:');
let hasMismatch = false;

for (const file of files) {
  const componentName = file.replace('.tsx', '');
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  
  const hasNamedExport = content.includes(`export const ${componentName}`) || content.includes(`export function ${componentName}`);
  const hasDefaultExport = content.includes(`export default ${componentName}`) || content.includes(`export default function ${componentName}`);
  
  if (!hasNamedExport) {
    console.warn(`WARNING: ${file} does not have named export 'export const ${componentName}'!`);
    hasMismatch = true;
  }
}

if (!hasMismatch) {
  console.log('>>> ALL PAGE EXPORTS MATCH 100%! <<<');
}
