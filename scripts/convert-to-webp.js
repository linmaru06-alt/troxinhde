const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await convertDir(fullPath);
    } else if (/\.(jpg|jpeg|png)$/i.test(file) && !file.includes('.webp')) {
      const parsed = path.parse(fullPath);
      const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

      try {
        await sharp(fullPath)
          .webp({ quality: 82, effort: 6 })
          .toFile(webpPath);
        
        const origSize = fs.statSync(fullPath).size;
        const newSize = fs.statSync(webpPath).size;
        const savedPercent = Math.round(((origSize - newSize) / origSize) * 100);
        console.log(`Converted: ${file} -> ${parsed.name}.webp (${origSize}B -> ${newSize}B, -${savedPercent}%)`);
      } catch (err) {
        console.error(`Failed to convert ${file}:`, err.message);
      }
    }
  }
}

async function main() {
  console.log('Starting WebP conversion for /public/images and /public...');
  await convertDir(path.join(__dirname, '../public/images'));
  await convertDir(path.join(__dirname, '../public'));
  console.log('Finished WebP conversion.');
}

main();
