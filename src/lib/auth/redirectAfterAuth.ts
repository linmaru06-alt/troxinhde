import { UserRole } from '../../types';

export function isValidReturnUrl(returnUrl: string | null | undefined, role?: UserRole): boolean {
  if (!returnUrl || typeof returnUrl !== 'string') return false;
  const trimmed = returnUrl.trim();
  // Bắt buộc bắt đầu bằng '/' và không bắt đầu bằng '//' hoặc '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) return false;
  // Chặn dấu gạch chéo ngược ở bất kỳ đâu trong phần path trước '?' để chống bypass trên các trình duyệt
  const pathPart = trimmed.split('?')[0];
  if (pathPart.includes('\\')) return false;
  // Chặn các pseudo-protocols như javascript:, data:, vbscript: hoặc http:, https:
  if (/^\/[a-zA-Z0-9+.-]+:/.test(trimmed)) return false;
  if (/^(javascript|data|vbscript|http|https):/i.test(trimmed)) return false;
  // Block admin route if not admin
  if (trimmed.startsWith('/admin') && role !== 'admin') return false;
  // Block owner routes if not owner
  if (trimmed.startsWith('/chu-tro') && role !== 'owner') return false;
  return true;
}

export function getDefaultRouteForRole(role?: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'owner':
      return '/chu-tro';
    case 'user':
    default:
      return '/tim-kiem';
  }
}
