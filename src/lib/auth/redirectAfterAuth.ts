import { UserRole } from '../../types';

export function isValidReturnUrl(returnUrl: string | null | undefined, role?: UserRole): boolean {
  if (!returnUrl) return false;
  // Must be an internal path
  if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) return false;
  // Block admin route if not admin
  if (returnUrl.startsWith('/admin') && role !== 'admin') return false;
  // Block owner routes if not owner
  if (returnUrl.startsWith('/chu-tro') && role !== 'owner') return false;
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
