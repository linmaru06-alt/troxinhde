// Cloudflare Worker: Dynamic OpenGraph & SEO Meta Tags Injector for TroXinh.vn
// Enables crawlability for Facebook, Zalo, Googlebot on Single Page Application (SPA) routes like /phong/:id

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

function formatPrice(price) {
  if (!price) return 'Liên hệ';
  if (price >= 1000000) {
    const mil = (price / 1000000).toFixed(1).replace('.0', '');
    return `${mil} triệu`;
  }
  return `${price.toLocaleString('vi-VN')}đ`;
}

async function fetchRoomData(roomId, supabaseUrl, supabaseAnonKey) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rooms?id=eq.${roomId}&select=*,room_images(*),buildings(name,district,address)&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error fetching room data in Cloudflare Worker:', error);
    return null;
  }
}

async function handleRequest(request) {
  const url = new URL(request.url);

  // Only intercept /phong/:id routes
  const roomMatch = url.pathname.match(/^\/phong\/([^/]+)$/);
  if (!roomMatch) {
    return fetch(request);
  }

  const roomId = roomMatch[1];
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /googlebot|bingbot|facebookexternalhit|twitterbot|baiduspider|yandex|slackbot|zalo/i.test(userAgent);

  // Fetch the original Single Page Application HTML from origin
  const response = await fetch(request);
  let html = await response.text();

  // Supabase credentials configured via Worker Environment Variables
  const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
  const supabaseAnonKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

  const room = await fetchRoomData(roomId, supabaseUrl, supabaseAnonKey);

  if (room) {
    const roomTitle = room.name || room.title || 'Phòng Trọ Đã Kiểm Duyệt PCCC';
    const roomPrice = formatPrice(room.price);
    const roomDistrict = room.buildings?.district || room.district || 'Hà Nội';
    const roomArea = room.area || '25';
    const roomImage =
      room.room_images && room.room_images.length > 0
        ? room.room_images[0].url
        : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=630&fit=crop';
    const roomDesc = room.description
      ? room.description.slice(0, 160)
      : `Cho thuê phòng trọ ${roomTitle} ${roomArea}m² tại ${roomDistrict}, Hà Nội. Giá chỉ ${roomPrice}/tháng. 100% đã kiểm duyệt PCCC an toàn.`;

    const metaTags = `
    <!-- Dynamic Injected OpenGraph for Social Bots & Crawlers -->
    <title>${roomTitle} - ${roomPrice}/tháng | Trọ Xinh Hà Nội</title>
    <meta name="description" content="${roomDesc}" />
    <link rel="canonical" href="https://troxinh.vn/phong/${roomId}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Trọ Xinh Hà Nội" />
    <meta property="og:title" content="${roomTitle} - ${roomPrice}/tháng" />
    <meta property="og:description" content="Phòng ${roomArea}m² tại ${roomDistrict}, Hà Nội. Đã kiểm duyệt PCCC 100%." />
    <meta property="og:image" content="${roomImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="https://troxinh.vn/phong/${roomId}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${roomTitle} - ${roomPrice}/tháng" />
    <meta name="twitter:description" content="${roomDesc}" />
    <meta name="twitter:image" content="${roomImage}" />
    `;

    // Replace default static title with full dynamic metadata
    html = html.replace(/<title>.*?<\/title>/i, metaTags);
  }

  return new Response(html, {
    headers: {
      ...response.headers,
      'Content-Type': 'text/html;charset=UTF-8',
      'X-Robots-Tag': 'index, follow',
    },
  });
}
