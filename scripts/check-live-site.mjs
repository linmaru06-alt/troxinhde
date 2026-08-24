async function checkLiveSite() {
  try {
    const res = await fetch('https://troxinhde-zeta.vercel.app/');
    const html = await res.text();
    const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    
    if (jsMatch) {
      const jsUrl = 'https://troxinhde-zeta.vercel.app' + jsMatch[1];
      const jsRes = await fetch(jsUrl);
      const jsContent = await jsRes.text();
      const hasSupabaseId = jsContent.includes('nanhmbnpihlaojbwfebb');
      const hasChototBanner = jsContent.includes('Giá Tốt, Gần Bạn, Chốt Nhanh') || jsContent.includes('troxinh');

      console.log('--- KẾT QUẢ KIỂM TRA LIVE SITE VERCEL ---');
      console.log('URL Live:', 'https://troxinhde-zeta.vercel.app/');
      console.log('HTTP Status:', res.status);
      console.log('Bundle file:', jsMatch[1]);
      console.log('Đã nạp Supabase ID nanhmbnpihlaojbwfebb:', hasSupabaseId);
    }
  } catch (err) {
    console.error('Error checking live site:', err);
  }
}

checkLiveSite();
