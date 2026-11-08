// =====================================================================
// K23 MONETIZATION & LISTING LIFECYCLE ENGINE
// Quản lý vòng đời tin 30 ngày, lưu trữ 60 ngày, tính phí đăng lại & SEO
// Theo tài liệu: "Trọ Xinh - Mô hình thu tiền mới - Đã chốt vòng đời tin 30 ngày"
// =====================================================================

import { Room } from '../types';

export const LISTING_CONSTANTS = {
  DEFAULT_LIFESPAN_DAYS: 30, // Tin hiển thị mặc định 30 ngày
  REMINDER_BEFORE_DAYS: 3, // Nhắc trước 3 ngày
  ARCHIVE_STORAGE_DAYS: 60, // Lưu trữ 60 ngày sau hết hạn trước khi xóa hẳn
  REPOST_1ST_PRICE_XU: 0, // Đăng lại lần 1 miễn phí
  REPOST_15_DAYS_PRICE_XU: 30, // Gia hạn lần 2 trở đi - 15 ngày: 30 Xu (30.000đ)
  REPOST_30_DAYS_PRICE_XU: 50, // Gia hạn lần 2 trở đi - 30 ngày: 50 Xu (50.000đ)
  SINGLE_LISTING_15D_PRICE_XU: 30, // Tin lẻ 15 ngày
  SINGLE_LISTING_30D_PRICE_XU: 50, // Tin lẻ 30 ngày
  FREE_LISTING_QUOTA: 2, // 2 phòng đầu tiên miễn phí
  XU_TO_VND_RATE: 1000, // 1 Xu = 1.000đ
};

export interface ListingStatusDetail {
  isActive: boolean;
  isExpired: boolean;
  isNearExpiry: boolean; // Còn <= 3 ngày
  daysRemaining: number;
  isInArchive: boolean; // Đang trong 60 ngày lưu trữ
  canRepostFree: boolean; // Được đăng lại miễn phí lần 1
  canRepostPaid: boolean; // Được gia hạn có phí (lần 2 trở đi)
  isDeleted: boolean; // Đã quá 60 ngày lưu trữ
}

/**
 * Tính toán chi tiết trạng thái vòng đời tin đăng (Bảo vệ an toàn 100% trước null/undefined/NaN)
 */
export function calculateListingStatus(room?: Room | null): ListingStatusDetail {
  if (!room) {
    return {
      isActive: false,
      isExpired: false,
      isNearExpiry: false,
      daysRemaining: 30,
      isInArchive: false,
      canRepostFree: false,
      canRepostPaid: false,
      isDeleted: false,
    };
  }

  const now = new Date();
  const rawPublished = room.publishedAt || room.createdAt || new Date().toISOString();
  const publishedDate = new Date(rawPublished);
  const validPublishedTime = isNaN(publishedDate.getTime()) ? now.getTime() : publishedDate.getTime();

  const expirationDate = room.expiresAt && !isNaN(new Date(room.expiresAt).getTime())
    ? new Date(room.expiresAt)
    : new Date(validPublishedTime + LISTING_CONSTANTS.DEFAULT_LIFESPAN_DAYS * 24 * 60 * 60 * 1000);

  const archiveExpirationDate = room.archivedUntil && !isNaN(new Date(room.archivedUntil).getTime())
    ? new Date(room.archivedUntil)
    : new Date(expirationDate.getTime() + LISTING_CONSTANTS.ARCHIVE_STORAGE_DAYS * 24 * 60 * 60 * 1000);

  const diffMs = expirationDate.getTime() - now.getTime();
  const daysRemaining = isNaN(diffMs) ? 0 : Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const isExpired = room.status === 'Hết hạn' || now >= expirationDate;
  const isNearExpiry = !isExpired && daysRemaining <= LISTING_CONSTANTS.REMINDER_BEFORE_DAYS;
  const isDeleted = now >= archiveExpirationDate;
  const isInArchive = isExpired && !isDeleted;

  const repostCount = room.repostCount || 0;
  const canRepostFree = isInArchive && repostCount === 0;
  const canRepostPaid = isInArchive && repostCount > 0;
  const isActive = !isExpired && (room.status === 'Còn trống' || room.status === 'Đã cho thuê');

  return {
    isActive,
    isExpired,
    isNearExpiry,
    daysRemaining,
    isInArchive,
    canRepostFree,
    canRepostPaid,
    isDeleted,
  };
}

/**
 * Tính toán số ngày còn lại của gói Đẩy tin VIP
 */
export function calculateBoostRemainingDays(room?: Room | null): number {
  if (!room || !room.isBoosted || !room.boostExpiresAt) return 0;
  const now = new Date();
  const boostEnd = new Date(room.boostExpiresAt);
  if (isNaN(boostEnd.getTime())) return 0;
  const diffMs = boostEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Kiểm tra xem hiện tại có đang trong khung Giờ Vàng (11h-13h & 19h-22h) không
 * Dành cho gói Đẩy Tin VIP 7 ngày (Hot)
 */
export function isCurrentlyGoldenHour(): boolean {
  const currentHour = new Date().getHours();
  // Giờ vàng trưa: 11h00 - 12h59 | Giờ vàng tối: 19h00 - 21h59
  return (currentHour >= 11 && currentHour < 13) || (currentHour >= 19 && currentHour < 22);
}
