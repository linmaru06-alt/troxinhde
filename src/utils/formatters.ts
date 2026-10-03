/**
 * Format date string to relative time (e.g., '5 phút trước', '2 ngày trước')
 */
export function formatTimeAgo(dateString?: string | number | Date): string {
  if (!dateString) return 'Vừa xong';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Vừa xong';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ngày trước`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  }
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} năm trước`;
}

/**
 * Format number to Vietnamese currency string (e.g. '150.000 đ')
 */
export function formatCurrency(amount?: number | null): string {
  if (amount === 0) return 'Miễn phí';
  const num = Number(amount);
  if (amount === undefined || amount === null || isNaN(num)) return 'Thỏa thuận';
  return `${num.toLocaleString('vi-VN')} đ`;
}

/**
 * Format monthly rent price (e.g. '2.5 tr/tháng' or '800.000 đ/tháng')
 */
export function formatPrice(price?: number | null): string {
  if (price === 0) return 'Miễn phí';
  const num = Number(price);
  if (price === undefined || price === null || isNaN(num) || num <= 0) return 'Thỏa thuận';
  if (num >= 1000000) {
    const tr = num / 1000000;
    return `${tr % 1 === 0 ? tr : tr.toFixed(1)} tr/tháng`;
  }
  return `${num.toLocaleString('vi-VN')} đ/tháng`;
}

/**
 * Format date to standard Vietnamese display format (DD/MM/YYYY)
 */
export function formatDate(dateString?: string | number | Date): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('vi-VN');
}

/**
 * Format message timestamp into "HH:mm • DD/MM/YYYY" (e.g. "20:37 • 03/10/2026")
 */
export function formatMessageDateTime(dateString?: string | number | Date | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} • ${day}/${month}/${year}`;
}

/**
 * Check if two dates represent the same calendar day
 */
export function isSameCalendarDay(
  d1?: string | number | Date | null,
  d2?: string | number | Date | null
): boolean {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Format date divider pill for chat message streams (e.g. "Hôm nay, 03/10/2026", "Hôm qua, 02/10/2026", "Thứ Bảy, 03/10/2026")
 */
export function formatChatDateDivider(dateString?: string | number | Date | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const now = new Date();

  const isToday = isSameCalendarDay(d, now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = isSameCalendarDay(d, yesterday);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const dateFormatted = `${day}/${month}/${year}`;

  if (isToday) {
    return `Hôm nay, ${dateFormatted}`;
  }
  if (isYesterday) {
    return `Hôm qua, ${dateFormatted}`;
  }

  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeek = daysOfWeek[d.getDay()];

  return `${dayOfWeek}, ${dateFormatted}`;
}
