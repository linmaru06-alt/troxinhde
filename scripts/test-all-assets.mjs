async function testLiveAssets() {
  try {
    const baseUrl = 'https://troxinhde-zeta.vercel.app';
    const htmlRes = await fetch(baseUrl);
    const html = await htmlRes.text();
    
    // Find all script tags and css links
    const srcMatches = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]);
    console.log('Found assets:', srcMatches.length);
    
    let allOk = true;
    for (const assetPath of srcMatches) {
      const assetUrl = baseUrl + assetPath;
      const res = await fetch(assetUrl);
      console.log(`${assetPath} -> Status: ${res.status}, Size: ${res.headers.get('content-length') || 'chunked'} bytes`);
      if (res.status !== 200) allOk = false;
    }
    
    if (allOk) {
      console.log('>>> TẤT CẢ ASSETS TRÊN VERCEL ĐỀU TẢI THÀNH CÔNG 200 OK! <<<');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testLiveAssets();
