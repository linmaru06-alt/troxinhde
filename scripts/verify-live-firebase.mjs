async function verify() {
  console.log('--- KIỂM TRA LIÊN KẾT FIREBASE TRÊN LIVE WEBSITE VERCEL ---');
  try {
    const res = await fetch('https://troxinhde-zeta.vercel.app/dang-nhap');
    const html = await res.text();
    
    // Tìm tất cả các file assets js
    const matches = Array.from(html.matchAll(/\/assets\/[a-zA-Z0-9_\-\.]+\.js/g)).map(m => m[0]);
    console.log(`Tìm thấy ${matches.length} file scripts trong HTML:`, matches);

    let foundProject = false;
    let foundKey = false;
    let foundSender = false;
    let foundAuthCode = false;

    for (const match of matches) {
      const scriptUrl = 'https://troxinhde-zeta.vercel.app' + match;
      const scriptRes = await fetch(scriptUrl);
      const text = await scriptRes.text();
      
      if (text.includes('troxinh-eb')) foundProject = true;
      if (text.includes('AIzaSyBd2HY-2ICcxHb_9cjFNPJLWo2rCXGY_E0')) foundKey = true;
      if (text.includes('65991425256')) foundSender = true;
      if (text.includes('signInWithPhoneNumber') || text.includes('RecaptchaVerifier')) foundAuthCode = true;
    }

    // Cũng kiểm tra bundle OtpVerificationPage nếu có
    const otpRes = await fetch('https://troxinhde-zeta.vercel.app/xac-thuc-otp');
    const otpHtml = await otpRes.text();
    const otpMatches = Array.from(otpHtml.matchAll(/\/assets\/[a-zA-Z0-9_\-\.]+\.js/g)).map(m => m[0]);
    for (const match of otpMatches) {
      const scriptUrl = 'https://troxinhde-zeta.vercel.app' + match;
      const scriptRes = await fetch(scriptUrl);
      const text = await scriptRes.text();
      
      if (text.includes('troxinh-eb')) foundProject = true;
      if (text.includes('AIzaSyBd2HY-2ICcxHb_9cjFNPJLWo2rCXGY_E0')) foundKey = true;
      if (text.includes('65991425256')) foundSender = true;
      if (text.includes('signInWithPhoneNumber') || text.includes('RecaptchaVerifier')) foundAuthCode = true;
    }

    console.log('\n--- KẾT QUẢ KIỂM TRA THỰC TẾ TRÊN VERCEL ---');
    console.log('1. Dự án Firebase (troxinh-eb):', foundProject ? '✅ ĐÃ CÓ TRÊN VERCEL' : '❌ CHƯA CÓ');
    console.log('2. Firebase API Key:', foundKey ? '✅ ĐÃ CÓ TRÊN VERCEL' : '❌ CHƯA CÓ');
    console.log('3. Firebase Sender ID (65991425256):', foundSender ? '✅ ĐÃ CÓ TRÊN VERCEL' : '❌ CHƯA CÓ');
    console.log('4. Hàm gửi SMS Phone Auth (signInWithPhoneNumber):', foundAuthCode ? '✅ ĐÃ KẾT NỐI' : '❌ CHƯA CÓ');

  } catch (err) {
    console.error('Lỗi khi kiểm tra:', err);
  }
}

verify();
