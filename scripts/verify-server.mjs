import http from 'http';

function checkUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          hasRoot: body.includes('id="root"'),
          hasBeVietnamPro: body.includes('Be+Vietnam+Pro'),
          length: body.length
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    const result = await checkUrl('http://localhost:3000/');
    console.log('✅ Dev server is running perfectly!');
    console.log('Status code:', result.status);
    console.log('Includes #root:', result.hasRoot);
    console.log('Includes font Be Vietnam Pro:', result.hasBeVietnamPro);
    console.log('Response size:', result.length, 'bytes');
  } catch (err) {
    console.error('❌ Server error:', err.message);
  }
}

run();
