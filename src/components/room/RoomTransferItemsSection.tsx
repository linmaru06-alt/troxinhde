import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Room, Building, MarketplaceItem } from '../../types';
import { useMarketplaceByRoom } from '../../hooks/queries/useMarketplace';
import { useAppStore } from '../../store/useAppStore';
import { formatCurrency } from '../ui/Cards';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { findOrCreateConversation, isSameUserId } from '../../lib/api/messages';
import { CONDITION_LABELS, MarketplaceConditionCode } from '../../lib/marketplaceFilter';
import {
  PackageCheck,
  Sparkles,
  Truck,
  MessageSquare,
  PlusCircle,
  ExternalLink,
  Tag,
  AlertCircle,
  RefreshCw,
  Box,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface RoomTransferItemsSectionProps {
  room: Room;
  building?: Building;
  className?: string;
}

export const RoomTransferItemsSection: React.FC<RoomTransferItemsSectionProps> = ({
  room,
  building,
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, showToast } = useAppStore();
  const { items, isLoading, error, refetch } = useMarketplaceByRoom(room.id);
  const [chattingItemId, setChattingItemId] = useState<string | null>(null);

  const handleContactSeller = async (item: MarketplaceItem) => {
    if (!currentUser) {
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/dang-nhap?returnUrl=${returnUrl}`);
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để nhắn tin thương lượng đồ thanh lý', 'info');
      return;
    }

    const sellerUserId = item.userId ?? item.seller_id ?? item.sellerId ?? '';
    if (isSameUserId(currentUser.id, sellerUserId)) {
      showToast('Thông báo', 'Bạn là người đăng món đồ này!', 'info');
      return;
    }

    setChattingItemId(item.id);
    try {
      const result = await findOrCreateConversation(
        currentUser.id,
        sellerUserId,
        item.id,
        {
          mockItem: {
            id: item.id,
            title: item.name,
            price: item.price,
            user_id: sellerUserId,
            images: item.images,
          },
          currentUserId: currentUser.id,
        }
      );
      navigate(`/tin-nhan/${result.conversationId}`);
    } catch (err: any) {
      console.error('[RoomTransferItems] Lỗi mở chat:', err);
      showToast('Không thể mở cuộc trò chuyện', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setChattingItemId(null);
    }
  };

  const handleCreatePassItemClick = () => {
    if (!currentUser) {
      const returnUrl = encodeURIComponent(`/cho-do-cu?dangTin=1&roomId=${room.id}`);
      navigate(`/dang-nhap?returnUrl=${returnUrl}`);
      return;
    }
    navigate(`/cho-do-cu?dangTin=1&roomId=${room.id}`);
  };

  return (
    <div
      className={`bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200/90 shadow-sm relative overflow-hidden space-y-6 ${className}`}
      id="do-pass-tai-phong"
    >
      {/* Background soft gradient decorative splash */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-emerald-100/50 via-teal-50/30 to-transparent rounded-full -mr-28 -mt-28 pointer-events-none" />

      {/* Header section */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#006d37] bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              Vòng đời chuyển trọ khép kín
            </span>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {items.length} món đồ sẵn có
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>🎁 Đồ Thanh Lý / Pass Lại Tại Phòng Này</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl leading-relaxed">
            Người cũ dọn đi để lại tiện nghi giá sinh viên hoặc tặng 0đ. Bạn thuê phòng có thể nhận đồ ngay tại chỗ, <strong className="text-emerald-700 font-bold">0đ phí xe ba gác</strong>!
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreatePassItemClick}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#006d37] hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition hover:shadow-md cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Pass đồ tại phòng này</span>
        </button>
      </div>

      {/* Loading state skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-gray-200 p-4 space-y-3 animate-pulse bg-gray-50/50">
              <div className="aspect-4/3 w-full bg-gray-200 rounded-xl" />
              <div className="h-4 bg-gray-200 rounded-md w-3/4" />
              <div className="h-4 bg-gray-200 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800">
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            Không thể tải danh sách đồ pass lúc này.
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-rose-300 text-rose-700 text-xs">
            Thử lại
          </Button>
        </div>
      )}

      {/* Empty state: No items yet */}
      {!isLoading && !error && items.length === 0 && (
        <div className="relative rounded-2xl border border-dashed border-emerald-300 bg-linear-to-r from-emerald-50/60 via-teal-50/30 to-white p-6 sm:p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100/80 text-[#006d37] flex items-center justify-center shadow-2xs">
            <Box className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-900">
              Chưa có món đồ nào được pass lại tại căn phòng này
            </h4>
            <p className="text-xs text-gray-600 max-w-lg mx-auto leading-relaxed">
              Bạn đang ở hoặc sắp chuyển khỏi căn phòng này? Hãy pass lại tủ vải, bàn học, đệm, quạt... cho người thuê sau để nhận tiền ngay mà không tốn công vận chuyển!
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleCreatePassItemClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-emerald-300 text-[#006d37] hover:bg-emerald-50 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Đăng pass đồ đầu tiên cho phòng này (30s)</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Items Grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {items.map((item) => {
            const isFree = item.pricingType === 'Miễn phí' || item.price === 0;
            const isChatting = chattingItemId === item.id;
            const isMyItem = Boolean(currentUser && isSameUserId(currentUser.id, item.userId || item.seller_id || ''));

            return (
              <div
                key={item.id}
                className="group relative bg-white rounded-2xl border border-gray-200/90 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-0.5"
              >
                {/* Photo & Badges */}
                <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
                  <ImageWithFallback
                    src={item.images?.[0] || 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600'}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top-left: 0đ Ship & Price */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1 bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs">
                      <Truck className="w-3 h-3" />
                      0đ Phí Ship
                    </span>
                    <Badge variant={isFree ? 'free' : 'cheap'} size="sm">
                      {isFree ? 'Tặng 0đ' : formatCurrency(item.price)}
                    </Badge>
                  </div>

                  {/* Top-right: Condition */}
                  <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
                    <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                      {CONDITION_LABELS[item.condition as MarketplaceConditionCode] || item.condition}
                    </span>
                  </div>
                </div>

                {/* Body info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                      <span className="text-[#006d37] font-bold">{item.category}</span>
                      <span>•</span>
                      <span>Bàn giao tại phòng</span>
                    </div>

                    <Link
                      to={`/cho-do-cu/${item.id}`}
                      className="block font-bold text-sm text-gray-900 group-hover:text-[#006d37] transition-colors line-clamp-1"
                      title={item.name}
                    >
                      {item.name}
                    </Link>

                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Seller & Action buttons */}
                  <div className="pt-2 border-t border-gray-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={item.userAvatar || '/images/user-avatar.jpg'}
                          alt={item.userName}
                          className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-200"
                        />
                        <span className="text-gray-700 font-medium truncate text-xs" title={item.userName}>
                          {item.userName}
                        </span>
                      </div>
                      {item.sellerStudentVerified && (
                        <span className="text-[10px] text-[#006d37] font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Sinh viên
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={`/cho-do-cu/${item.id}`}
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition text-center"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      {isMyItem ? (
                        <Link
                          to={`/cho-do-cu/${item.id}`}
                          className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
                        >
                          <span>Tin của bạn</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleContactSeller(item)}
                          disabled={isChatting}
                          className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-[#006d37] hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
                        >
                          {isChatting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <MessageSquare className="w-3.5 h-3.5" />
                          )}
                          <span>Hỏi mua đồ</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer benefit callout */}
      <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Tiết kiệm trung bình <strong className="text-gray-900 font-bold">1.500.000đ</strong> chi phí mua sắm & chuyển đồ khi nhận đồ tại phòng.
        </span>
        <Link
          to={`/cho-do-cu?district=${encodeURIComponent(room.district)}`}
          className="font-bold text-[#006d37] hover:underline inline-flex items-center gap-1"
        >
          <span>Khám phá thêm đồ cũ quanh {room.district}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
