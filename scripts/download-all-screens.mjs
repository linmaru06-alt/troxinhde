import fs from 'fs';
import path from 'path';
import https from 'https';

const stepOutputFile = path.resolve('C:/Users/Windows/.gemini/antigravity-ide/brain/521aad4e-682e-4094-a36e-a8c2ac8120c3/.system_generated/steps/107/output.txt');
const rawData = JSON.parse(fs.readFileSync(stepOutputFile, 'utf8'));

const outDir = path.resolve('stitch/designs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(false);
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      // Follow redirects if any
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log(`Bắt đầu tải ${rawData.screens.length} màn hình về thư mục stitch/designs...`);
  
  const screensMeta = [];

  for (let i = 0; i < rawData.screens.length; i++) {
    const s = rawData.screens[i];
    const screenId = s.name.split('/').pop();
    const safeTitle = (s.title || `screen-${i+1}`).replace(/[\/\\?%*:|"<>]/g, '_');
    const folder = path.join(outDir, `${String(i + 1).padStart(2, '0')}_${safeTitle}`);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

    console.log(`[${i+1}/${rawData.screens.length}] Đang tải: ${s.title}...`);

    let htmlDownloaded = false;
    let imgDownloaded = false;

    if (s.htmlCode?.downloadUrl) {
      const ext = s.htmlCode.mimeType === 'text/markdown' ? 'md' : 'html';
      await downloadFile(s.htmlCode.downloadUrl, path.join(folder, `index.${ext}`));
      htmlDownloaded = true;
    }

    if (s.screenshot?.downloadUrl) {
      await downloadFile(s.screenshot.downloadUrl, path.join(folder, `screenshot.png`));
      imgDownloaded = true;
    }

    // Save metadata
    fs.writeFileSync(path.join(folder, 'metadata.json'), JSON.stringify(s, null, 2));

    screensMeta.push({
      index: i + 1,
      id: screenId,
      title: s.title,
      folder: path.relative(process.cwd(), folder),
      html: htmlDownloaded,
      img: imgDownloaded
    });
  }

  fs.writeFileSync(path.join(outDir, 'screens-summary.json'), JSON.stringify(screensMeta, null, 2));
  console.log('🎉 ĐÃ TẢI HOÀN TẤT TOÀN BỘ 19 MÀN HÌNH VÀO stitch/designs!');
}

main().catch(console.error);
