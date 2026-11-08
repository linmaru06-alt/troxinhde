// =====================================================================
// K23 MONETIZATION — P3: SEO & EXPIRED LISTING BANNER
// Trang tin hết hạn giữ nguyên URL chuẩn SEO (noindex, follow)
// Không gây lỗi 404, điều hướng khách sang các phòng tương tự
// =====================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Building2, Search, ArrowRight } from 'lucide-react';
import { Room } from '../../types';
import { calculateListingStatus, LISTING_CONSTANTS } from '../../utils/listingLifecycle';
import { useAppStore } from '../../store/useAppStore';

interface ExpiredListingBannerProps {
  room: Room;
  onRepost?: () => void;
}

export const ExpiredListingBanner: React.FC<ExpiredListingBannerProps> = ({ room, onRepost }) => {
  const { currentUser } = useAppStore();
  const statusDetail = calculateListingStatus(room);
  const isOwner = Boolean(
    currentUser &&
      (currentUser.id === room.ownerId ||
        (currentUser.isDemoAccount && (room.ownerId === 'user_owner_1' || room.ownerId === '00000000-0000-0000-0000-000000000002')) ||
        (currentUser.firebaseUid && room.ownerId === currentUser.firebaseUid))
  );

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 mb-6 shadow-sm animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 ring-4 ring-amber-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-amber-950">Tin Đăng Đã Hết Thời Hạn 30 Ngày</h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                Lưu Trữ 60 Ngày
              </span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
              Phòng <strong>{room.roomNumber} - {room.title}</strong> hiện không còn trong danh sách tìm kiếm do đã hết hạn chu kỳ 30 ngày. Thông tin bên dưới được giữ lại nhằm lưu trữ lịch sử và bảo toàn dữ liệu tham khảo.
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
          {isOwner ? (
            <button
              type="button"
              onClick={onRepost}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {statusDetail.canRepostFree
                  ? 'Đăng Lại 1 Chạm (0 Xu - Miễn Phí)'
                  : `Gia Hạn Tin (${LISTING_CONSTANTS.REPOST_15_DAYS_PRICE_XU}-${LISTING_CONSTANTS.REPOST_30_DAYS_PRICE_XU} Xu)`}
              </span>
            </button>
          ) : (
            <Link
              to={`/tim-kiem?district=${encodeURIComponent(room.district || '')}`}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Search className="w-4 h-4" />
              <span>Xem phòng còn trống tại {room.district || 'khu vực này'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
