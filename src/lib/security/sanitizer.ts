/**
 * src/lib/security/sanitizer.ts
 * Bộ động cơ làm sạch dữ liệu đầu vào & chống XSS đa tầng
 * Dựa trên giáo trình Qiangu Web (Chương 16: An toàn thông tin XSS/CSRF)
 */

// 1. Chống XSS trong chuỗi văn bản thông thường (Escape HTML Entities)
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 2. Chống XSS trong liên kết URL (Zalo, Facebook, Website, liên kết bên thứ 3)
// Chặn đứng hoàn toàn: javascript:..., data:text/html..., vbscript:..., file:...
export function sanitizeSafeUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Danh sách các protocol độc hại nguy hiểm tiềm ẩn khai thác DOM XSS
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(trimmed)) {
    console.warn('[Security Guard] Chặn liên kết URL độc hại tiềm ẩn XSS:', trimmed);
    return '#unsafe-link-blocked';
  }

  // Chỉ chấp nhận http, https, tel, mailto hoặc đường dẫn nội bộ (relative link)
  const safeProtocols = /^(https?:\/\/|mailto:|tel:|\/)/i;
  if (!safeProtocols.test(trimmed)) {
    // Nếu người dùng nhập tên miền rút gọn như "zalo.me/..." hoặc "facebook.com/...", tự động thêm https://
    return `https://${trimmed}`;
  }

  return trimmed;
}

// 3. Làm sạch mã HTML mô tả phong phú (Rich Text) với Whitelist thẻ an toàn
export function sanitizeRichDescription(rawHtml: string): string {
  if (!rawHtml) return '';

  // Loại bỏ toàn bộ thẻ script, iframe, object, embed, style, form
  let clean = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

  // Loại bỏ triệt để mọi inline event handlers: onerror, onload, onclick, onmouseover, onfocus...
  clean = clean.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*[^>\s]+/gi, '');

  return clean;
}
