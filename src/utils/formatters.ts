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
