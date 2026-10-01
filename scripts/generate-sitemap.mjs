import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';

const SITE_URL = 'https://troxinh.vn';

const HANOI_DISTRICTS = [
  'Cầu Giấy', 'Đống Đa', 'Thanh Xuân', 'Nam Từ Liêm', 
  'Bắc Từ Liêm', 'Hai Bà Trưng', 'Ba Đình', 'Hà Đông', 
  'Hoàng Mai', 'Tây Hồ', 'Long Biên', 'Hoàn Kiếm'
];

const POPULAR_UNIVERSITIES = [
  'Đại học Quốc Gia Hà Nội',
  'Đại học Bách Khoa Hà Nội',
  'Đại học Kinh Tế Quốc Dân',
  'Đại học Ngoại Thương',
  'Đại học Sư Phạm Hà Nội',
  'Học viện Ngân Hàng',
  'Học viện Bưu Chính Viễn Thông',
  'Đại học Hà Nội'
];

async function generateSitemap() {
  console.log('[Sitemap Generator] Khởi động tạo Dynamic Sitemap từ Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const now = new Date().toISOString().split('T')[0];

  const urls = [];

  // 1. Static Core Landing Pages
  const staticPages = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/tim-kiem`, changefreq: 'hourly', priority: '0.95' },
    { loc: `${SITE_URL}/ban-do`, changefreq: 'hourly', priority: '0.90' },
    { loc: `${SITE_URL}/roommate`, changefreq: 'daily', priority: '0.85' },
    { loc: `${SITE_URL}/cho-do-cu`, changefreq: 'daily', priority: '0.85' },
    { loc: `${SITE_URL}/ve-chung-toi/kiem-duyet`, changefreq: 'weekly', priority: '0.75' },
    { loc: `${SITE_URL}/hop-dong-mau`, changefreq: 'monthly', priority: '0.70' },
    { loc: `${SITE_URL}/bang-gia`, changefreq: 'weekly', priority: '0.70' },
    { loc: `${SITE_URL}/dieu-khoan`, changefreq: 'monthly', priority: '0.50' },
    { loc: `${SITE_URL}/chinh-sach-bao-mat`, changefreq: 'monthly', priority: '0.50' },
  ];

  staticPages.forEach(p => urls.push({ ...p, lastmod: now }));

  // 2. Programmatic SEO: 12 Districts Landing URLs
  HANOI_DISTRICTS.forEach(district => {
    urls.push({
      loc: `${SITE_URL}/tim-kiem?khuVuc=${encodeURIComponent(district)}`,
      changefreq: 'daily',
      priority: '0.80',
      lastmod: now
    });
  });

  // 3. Programmatic SEO: Universities Landing URLs
  POPULAR_UNIVERSITIES.forEach(school => {
    urls.push({
      loc: `${SITE_URL}/tim-kiem?truong=${encodeURIComponent(school)}`,
      changefreq: 'daily',
      priority: '0.80',
      lastmod: now
    });
  });

  // 4. Dynamic Rooms from Supabase
  try {
    const { data: rooms, error: roomError } = await supabase
      .from('rooms')
      .select('id, updated_at, created_at, status')
      .in('status', ['Còn trống', 'available']);

    if (roomError) {
      console.warn('[Sitemap Generator] Cảnh báo truy vấn rooms:', roomError.message);
    } else if (Array.isArray(rooms) && rooms.length > 0) {
      console.log(`[Sitemap Generator] Tìm thấy ${rooms.length} phòng trọ từ Supabase.`);
      rooms.forEach(r => {
        const modDate = r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : now;
        urls.push({
          loc: `${SITE_URL}/phong/${r.id}`,
          changefreq: 'weekly',
          priority: '0.75',
          lastmod: modDate
        });
      });
    }
  } catch (err) {
    console.warn('[Sitemap Generator] Không thể đọc bảng rooms:', err.message);
  }

  // 5. Dynamic Marketplace Items from Supabase
  try {
    const { data: items, error: itemError } = await supabase
      .from('marketplace_items')
      .select('id, updated_at, created_at, status')
      .eq('status', 'available');

    if (itemError) {
      console.warn('[Sitemap Generator] Cảnh báo truy vấn marketplace_items:', itemError.message);
    } else if (Array.isArray(items) && items.length > 0) {
      console.log(`[Sitemap Generator] Tìm thấy ${items.length} món đồ cũ từ Supabase.`);
      items.forEach(item => {
        const modDate = item.updated_at ? new Date(item.updated_at).toISOString().split('T')[0] : now;
        urls.push({
          loc: `${SITE_URL}/cho-do-cu/${item.id}`,
          changefreq: 'weekly',
          priority: '0.70',
          lastmod: modDate
        });
      });
    }
  } catch (err) {
    console.warn('[Sitemap Generator] Không thể đọc bảng marketplace_items:', err.message);
  }

  // 6. Dynamic Buildings from Supabase
  try {
    const { data: buildings, error: bldError } = await supabase
      .from('buildings')
      .select('id, updated_at, created_at');

    if (bldError) {
      console.warn('[Sitemap Generator] Cảnh báo truy vấn buildings:', bldError.message);
    } else if (Array.isArray(buildings) && buildings.length > 0) {
      console.log(`[Sitemap Generator] Tìm thấy ${buildings.length} tòa nhà từ Supabase.`);
      buildings.forEach(b => {
        const modDate = b.updated_at ? new Date(b.updated_at).toISOString().split('T')[0] : now;
        urls.push({
          loc: `${SITE_URL}/toa-nha/${b.id}`,
          changefreq: 'weekly',
          priority: '0.70',
          lastmod: modDate
        });
      });
    }
  } catch (err) {
    console.warn('[Sitemap Generator] Không thể đọc bảng buildings:', err.message);
  }

  // 7. Build XML String
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  urls.forEach(u => {
    xml += `  <url>\n`;
    xml += `    <loc>${u.loc}</loc>\n`;
    xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
    xml += `    <priority>${u.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>\n`;

  // Write to public/sitemap.xml
  const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');

  console.log(`[Sitemap Generator] Đã xuất thành công sitemap với ${urls.length} URLs vào ${sitemapPath}`);
}

generateSitemap().catch(console.error);
