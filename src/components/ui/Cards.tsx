import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Room, Building, RoommatePost, MarketplaceItem } from '../../types';
import { CONDITION_LABELS, MarketplaceConditionCode } from '../../lib/marketplaceFilter';
import { useAppStore } from '../../store/useAppStore';
import { findOrCreateConversation, isSameUserId } from '../../lib/api/messages';
import { updateMarketplaceItem as updateMarketplaceItemApi } from '../../lib/api/marketplace';
import { Badge } from './Badge';
import { ImageWithFallback } from './ImageWithFallback';
import { ConfirmDialog } from './ConfirmDialog';
import { Card } from './Card';
import {
  Heart,
  MapPin,
  Sparkles,
  Navigation,
  CheckCircle,
  Camera,
  Tag,
  Trash2,
  MessageSquare,
  Edit,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export { Card };

export const formatPrice = (price?: number | null): string => {
  if (price === 0) return 'Miễn phí';
  const num = Number(price);
  if (price === undefined || price === null || isNaN(num) || num <= 0) return 'Thỏa thuận';
  if (num >= 1000000) {
    const tr = num / 1000000;
    return `${tr % 1 === 0 ? tr : tr.toFixed(1)} tr/tháng`;
  }
  return `${num.toLocaleString('vi-VN')} đ/tháng`;
};

export const formatCurrency = (amount?: number | null): string => {
  if (amount === 0) return 'Miễn phí';
  const num = Number(amount);
  if (amount === undefined || amount === null || isNaN(num)) return 'Thỏa thuận';
  return `${num.toLocaleString('vi-VN')} đ`;
};

// 1. RoomCard
export const RoomCard: React.FC<{ room: Room }> = ({ room }) => {
  const { savedRoomIds, toggleSaveRoom, currentUser, removeRoom } = useAppStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const isSaved = savedRoomIds.includes(room.id);
  const isOwner = currentUser?.id === room.ownerId;

  const handleConfirmDelete = () => {
    removeRoom(room.id);
    setShowDeleteConfirm(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  // Calculate estimated total monthly cost (Rent + typical electricity ~150k + water ~100k + wifi/service ~150k)
  const estimatedServices = (room.electricityPrice ? room.electricityPrice * 40 : 150000)
    + (room.waterPrice ? room.waterPrice * 3 : 100000)
    + 100000;
  const totalEstimatedMonthly = room.price + estimatedServices;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden max-w-full w-full border border-gray-200/90 hover:border-[#00a854]/40 shadow-xs hover:shadow-card-hover transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
      {/* Image & Badges */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
        <Link to={`/phong/${room.id}`} className="block w-full h-full">
          <ImageWithFallback
            src={room.images?.[0] || '/images/hero-banner.webp'}
            alt={room.title}
            preset="thumbnail"
            loading="lazy"
            fallback="room"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          {room.isBoosted && (
            <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-amber-300">
              ★ {room.boostBadge || 'Tin Nổi Bật'}
            </span>
          )}
          {room.verified && (
            <span className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
              ✓ Đã xác minh
            </span>
          )}
          <Badge variant={room.status === 'Còn trống' ? 'available' : room.status === 'Chờ duyệt' ? 'pending' : 'rented'} size="sm">
            {room.status}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isOwner && (
            <button
              onClick={handleDeleteClick}
              aria-label="Xóa phòng"
              className="p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm bg-white/80 hover:bg-red-50 text-gray-700 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSaveRoom(room.id);
            }}
            aria-label={isSaved ? 'Bỏ lưu phòng' : 'Lưu phòng'}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm ${
              isSaved
                ? 'bg-rose-500 text-white scale-110'
                : 'bg-white/80 hover:bg-white text-gray-700 hover:text-rose-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 left-3 bg-[#00a854]/95 backdrop-blur-md text-white font-black text-xs sm:text-sm px-3 py-1 rounded-xl shadow-md">
          {formatPrice(room.price)}
        </div>
      </div>

      {/* Info Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Info row: 2 rows on screens < 380px, single line with truncate on larger */}
          <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center gap-1 min-[380px]:gap-1.5 text-[11px] text-gray-500 mb-1.5 font-medium overflow-hidden">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-gray-800">{room.area} m²</span>
              <span>•</span>
              <span className="truncate max-w-[110px]">{room.type}</span>
            </div>
            {room.nearestSchool && (
              <div className="flex items-center gap-1 min-w-0 overflow-hidden text-[#00a854] font-bold">
                <span className="hidden min-[380px]:inline text-gray-400">•</span>
                <Navigation className="w-3 h-3 shrink-0" />
                <span className="truncate">{room.nearestSchool}</span>
              </div>
            )}
          </div>

          <Link to={`/phong/${room.id}`}>
            <h3 className="text-sm sm:text-base font-bold text-gray-950 line-clamp-2 group-hover:text-[#00a854] transition-colors leading-snug">
              {room.title}
            </h3>
          </Link>
        </div>

        {/* Estimated Monthly Cost pill */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tổng dự kiến/tháng</span>
            <span className="text-xs font-black text-emerald-700">~{formatCurrency(totalEstimatedMonthly)}/tháng</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400">{room.district}</span>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa phòng"
        description="Bạn có chắc chắn muốn xóa tin đăng phòng này không? Hành động này không thể hoàn tác."
        confirmText="Xóa phòng"
        cancelText="Hủy"
        variant="destructive"
      />
    </div>
  );
};

// 1.5 HorizontalRoomCard
export const HorizontalRoomCard: React.FC<{ room: Room }> = ({ room }) => {
  return (
    <div className="group relative bg-white rounded-[20px] overflow-hidden border border-gray-200/80 hover:border-[#00a854]/40 shadow-xs hover:shadow-md transition-all duration-300 p-2.5 flex gap-3 h-[140px] w-full">
      {/* Left side: Image */}
      <div className="relative w-[110px] sm:w-[130px] shrink-0 rounded-2xl overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={room.images?.[0] || '/images/hero-banner.webp'}
          alt={room.title}
          preset="thumbnail"
          loading="lazy"
          fallback="room"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Area Badge */}
        <div className="absolute top-1.5 left-1.5 bg-gray-900/70 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
          {room.area} m²
        </div>
        {/* Price Badge */}
        <div className="absolute bottom-1.5 left-1.5 bg-[#00a854] text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-sm">
          {formatPrice(room.price)}
        </div>
      </div>

      {/* Right side: Info */}
      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 pr-1">
        <div>
          {/* Top row: Type & Electricity */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border text-emerald-700 bg-emerald-50 border-emerald-200 uppercase tracking-wide">
              {room.type}
            </span>
            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
              ⚡ {room.electricityPrice ? `${room.electricityPrice / 1000}k` : '3.5k'}/số
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-[#00a854] transition-colors mt-1">
            {room.title}
          </h3>

          {/* Address */}
          <p className="text-[11px] text-gray-500 line-clamp-1 flex items-center gap-1 mt-1 font-medium">
            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
            <span className="truncate">
              {[room.address, room.district].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}
            </span>
          </p>
        </div>

        {/* Bottom row: University & Details link */}
        <div className="flex items-center justify-between mt-2 w-full">
          {room.nearestSchool ? (
            <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg shrink min-w-0">
              <span className="text-[12px]">🎓</span>
              <span className="truncate">
                {room.nearestSchool} {room.distanceToSchoolKm ? `(~${(room.distanceToSchoolKm * 1000).toFixed(0)}m)` : ''}
              </span>
            </div>
          ) : (
            <div></div>
          )}
          <Link to={`/phong/${room.id}`} onClick={(e) => e.stopPropagation()} className="text-[11px] font-bold text-[#00a854] flex items-center shrink-0 ml-2 hover:underline">
            Chi tiết &gt;
          </Link>
        </div>
      </div>
    </div>
  );
};

export const BuildingCard: React.FC<{ building: Building }> = ({ building }) => {
  const { currentUser, removeBuilding } = useAppStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const isOwner = currentUser?.id === building.ownerId;

  const handleConfirmDelete = () => {
    removeBuilding(building.id);
    setShowDeleteConfirm(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  return (
    <Link
      to={`/toa-nha/${building.id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-200/80 hover:border-[#006d37]/30 shadow-xs hover:shadow-card-hover transition-all duration-300 flex flex-col h-full hover:-translate-y-1"
    >
      <div className="relative aspect-16/10 w-full overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={building.images?.[0] || '/images/hero-banner.webp'}
          alt={building.name}
          preset="hero"
          loading="lazy"
          fallback="building"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          {building.verifiedBadge && (
            <Badge variant="verified" size="sm">
              Tòa Nhà Đã Kiểm Duyệt
            </Badge>
          )}
        </div>
        
        {isOwner && (
          <button
            onClick={handleDeleteClick}
            aria-label="Xóa tòa nhà"
            className="absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm bg-white/80 hover:bg-red-50 text-gray-700 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-lg">
          Còn {building.availableRooms} / {building.totalRooms} phòng
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-[#006d37] transition-colors line-clamp-1 mb-1">
            {building.name}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {building.address}, {building.district}
          </p>
        </div>

        <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">Chủ trọ: {building.ownerName}</span>
          <span className="text-amber-500 font-semibold flex items-center gap-1">
            ★ {building.rating} ({building.reviewCount})
          </span>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa tòa nhà"
        description="Bạn có chắc chắn muốn xóa tòa nhà này không? Tất cả các phòng trong tòa nhà cũng sẽ bị ảnh hưởng."
        confirmText="Xóa tòa nhà"
        cancelText="Hủy"
        variant="destructive"
      />
    </Link>
  );
};

// 3. RoommateCard
export const RoommateCard: React.FC<{ post: RoommatePost }> = ({ post }) => {
  const { savedRoommateIds, toggleSaveRoommate, currentUser, removeRoommatePost } = useAppStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  
  const isSaved = savedRoommateIds.includes(post.id);
  const isOwner = currentUser?.id === post.userId;

  const handleConfirmDelete = () => {
    removeRoommatePost(post.id);
    setShowDeleteConfirm(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200/80 hover:border-[#006d37]/30 shadow-xs hover:shadow-card-hover transition-all duration-300 p-5 flex flex-col justify-between h-full hover:-translate-y-1">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-100 shrink-0">
              <ImageWithFallback
                src={post.userAvatar}
                alt={post.userName}
                preset="avatar"
                loading="lazy"
                fallback="avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-gray-900">{post.userName}</h4>
                <span className="text-xs text-gray-400">({post.userAge} tuổi • {post.userGender})</span>
              </div>
              {post.userSchool && (
                <p className="text-xs text-[#006d37] font-medium">{post.userSchool}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={handleDeleteClick}
                className="p-2 rounded-full transition cursor-pointer text-gray-400 hover:text-red-500 hover:bg-red-50"
                title="Xóa bài viết"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => toggleSaveRoommate(post.id)}
              className={`p-2 rounded-full transition cursor-pointer ${isSaved ? 'text-rose-500 bg-rose-50' : 'text-gray-400 hover:text-rose-500 hover:bg-gray-50'}`}
              title={isSaved ? "Bỏ lưu" : "Lưu bài viết"}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Budget Tag */}
        <div className="flex items-center justify-between bg-emerald-50/70 rounded-xl p-2.5 mb-3 text-xs">
          <span className="text-emerald-900 font-medium">Ngân sách share:</span>
          <span className="text-[#006d37] font-bold text-sm">{formatCurrency(post.budgetShare)}/người</span>
        </div>

        {/* Intro (Mask contact info if present) */}
        <p className="text-xs text-gray-600 line-clamp-3 mb-3 leading-relaxed">
          "{(post.intro || '').replace(/(0[3|5|7|8|9][0-9]{1}[.\s-]?[0-9]{3}[.\s-]?[0-9]{3,4})/g, (m) => m.slice(0, 3) + '***' + m.slice(-3))}"
        </p>

        {Array.isArray(post.lifestyleTags) && post.lifestyleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {post.lifestyleTags.map((tag: string, i: number) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-[#006d37] border border-emerald-100"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">{post.district || 'Hà Nội'}</span>
        <Link
          to={`/roommate/${post.id}`}
          className="text-xs font-bold text-[#006d37] hover:underline"
        >
          Xem chi tiết →
        </Link>
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa bài viết"
        description="Bạn có chắc chắn muốn xóa bài viết tìm bạn ở ghép này không? Hành động này không thể hoàn tác."
        confirmText="Xóa bài viết"
        cancelText="Hủy"
        variant="destructive"
      />
    </div>
  );
};

// 4. MarketplaceCard
const CATEGORY_ICONS: Record<string, string> = {
  'Nội thất': '🪑',
  'Đồ điện tử': '⚡',
  'Sách vở': '📚',
  'Đồ gia dụng': '🍳',
};

export const MarketplaceCard: React.FC<{ item: MarketplaceItem }> = ({ item }) => {
  const { currentUser, removeMarketplaceItem, updateMarketplaceItem, showToast } = useAppStore();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isChatLoading, setIsChatLoading] = React.useState(false);

  const isOwner = Boolean(currentUser && isSameUserId(currentUser.id, item.userId));
  const isSold = item.status === 'Đã bán';
  const isPending = Boolean(item.status === 'Chờ duyệt' || item.moderationStatus === 'pending');
  const isRejected = Boolean(item.status === 'Bị từ chối' || item.moderationStatus === 'rejected');
  const isHidden = Boolean((item as any).isHidden);
  const isUnavailable = Boolean(isSold || isPending || isRejected || isHidden);

  const unavailableReason = isSold
    ? 'Đã bán'
    : isPending
      ? 'Chờ duyệt'
      : isRejected
        ? 'Bị từ chối'
        : isHidden
          ? 'Đang ẩn'
          : '';

  const handleConfirmDelete = () => {
    removeMarketplaceItem(item.id);
    setShowDeleteConfirm(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleMarkAsSold = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOwner) return;

    try {
      updateMarketplaceItem(item.id, { status: 'Đã bán' });
      try {
        await updateMarketplaceItemApi(item.id, { status: 'sold' });
      } catch {
        // Fallback
      }
      showToast('Đã đánh dấu đã bán! 🎉', 'Món đồ đã được chuyển sang trạng thái Đã bán.', 'success');
    } catch (err: any) {
      showToast('Lỗi thao tác', err?.message || 'Không thể đánh dấu đã bán', 'error');
    }
  };

  const handleContactSeller = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để nhắn tin với người bán', 'warning');
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(`/cho-do-cu/${item.id}`)}`);
      return;
    }
    if (isSameUserId(currentUser.id, item.userId)) {
      showToast('Đây là món đồ của bạn', 'Không thể tự nhắn tin cho chính mình', 'info');
      return;
    }

    setIsChatLoading(true);
    try {
      const result = await findOrCreateConversation(
        currentUser.id,
        item.userId,
        item.id,
        {
          mockItem: {
            id: item.id,
            title: item.name,
            price: item.price,
            user_id: item.userId,
            images: item.images,
          },
          currentUserId: currentUser.id,
        }
      );
      navigate(`/tin-nhan/${result.conversationId}`);
    } catch (err: any) {
      console.error('[MarketplaceCard] Lỗi mở chat:', err);
      showToast('Không thể mở cuộc trò chuyện', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  const categoryIcon = CATEGORY_ICONS[item.category] || '📦';
  const hasMultipleImages = Array.isArray(item.images) && item.images.length > 1;

  return (
    <Link
      to={`/cho-do-cu/${item.id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-200/90 hover:border-[#006d37]/40 shadow-xs hover:shadow-card-hover transition-all duration-300 flex flex-col h-full hover:-translate-y-1"
    >
      {/* 1. Hình ảnh sản phẩm + Badges */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={item.images?.[0] || '/images/hero-banner.webp'}
          alt={item.name}
          preset="market"
          loading="lazy"
          fallback="item"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* 2. Giá sản phẩm */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          <Badge variant={item.pricingType === 'Miễn phí' ? 'free' : (item.price > 0 ? 'cheap' : 'outline')} size="sm">
            {item.pricingType === 'Miễn phí'
              ? 'Tặng 0đ'
              : item.price > 0
                ? formatCurrency(item.price)
                : 'Chưa nhập giá'}
          </Badge>
        </div>

        {isOwner && (
          <button
            onClick={handleDeleteClick}
            aria-label="Xóa món đồ"
            className="absolute top-2.5 right-2.5 z-30 p-1.5 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm bg-black/40 hover:bg-red-50 text-white hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Huy hiệu số lượng ảnh bổ trợ */}
        {hasMultipleImages && (
          <span className={`absolute ${isOwner ? 'top-10' : 'top-2.5'} right-2.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs border border-white/20`}>
            <Camera className="w-3 h-3 text-amber-300" />
            {item.images.length} ảnh
          </span>
        )}

        {/* 3. Tình trạng món đồ (Góc dưới bên trái) */}
        <div className="absolute bottom-2 left-2 bg-slate-950/75 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs border border-white/10">
          {CONDITION_LABELS[item.condition as MarketplaceConditionCode] || item.condition}
        </div>

        {/* 3b. Trạng thái Đã bán / Chờ duyệt / Bị từ chối */}
        {item.status === 'Đã bán' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <span className="bg-rose-600 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider border-2 border-white/30">
              Đã bán
            </span>
          </div>
        )}
        {(item.status === 'Chờ duyệt' || item.moderationStatus === 'pending') && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-white/30">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              Chờ duyệt
            </span>
          </div>
        )}
        {(item.status === 'Bị từ chối' || item.moderationStatus === 'rejected') && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-white/30">
              ⚠️ Bị từ chối
            </span>
          </div>
        )}
      </div>

      {/* Thông tin chi tiết */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          {/* 4. Danh mục */}
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs">{categoryIcon}</span>
            <span className="text-[11px] font-bold text-gray-500 tracking-wide uppercase">
              {item.category}
            </span>
          </div>

          {/* 5. Tên món đồ */}
          <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#006d37] transition-colors line-clamp-2 leading-snug">
            {item.name}
          </h3>
        </div>

        {/* 5b. Trạng thái còn hàng / đã bán / chờ duyệt / bị từ chối */}
        <div className="flex items-center gap-1.5 mt-1">
          {item.status === 'Đã bán' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              Đã đóng
            </span>
          ) : item.status === 'Chờ duyệt' || item.moderationStatus === 'pending' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              Chờ Admin duyệt
            </span>
          ) : item.status === 'Bị từ chối' || item.moderationStatus === 'rejected' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              Bị từ chối
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Còn hàng
            </span>
          )}
        </div>

        {/* 6. Khu vực & Nút xem */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium flex items-center gap-1 truncate max-w-[65%]">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{item.district}</span>
          </span>
          <span className="text-[#006d37] font-bold text-xs shrink-0 group-hover:translate-x-0.5 transition-transform">
            Xem ngay →
          </span>
        </div>

        {/* 7. Action Bar: Nhắn người bán / Sửa tin & Đánh dấu đã bán */}
        <div className="pt-2.5 mt-0.5 border-t border-gray-100 flex flex-col gap-1">
          {isOwner ? (
            <div className="grid grid-cols-2 gap-1.5 w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/cho-do-cu/${item.id}?edit=true`);
                }}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold text-[#006d37] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              >
                <Edit className="w-3 h-3" />
                Sửa tin
              </button>
              {isSold ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-75"
                >
                  <Check className="w-3 h-3" />
                  Đã bán
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMarkAsSold}
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Đã bán
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1 w-full">
              <button
                type="button"
                disabled={isUnavailable || isChatLoading}
                onClick={handleContactSeller}
                className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                  isUnavailable
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                    : 'bg-[#006d37] hover:bg-emerald-800 text-white cursor-pointer active:scale-98'
                }`}
              >
                {isChatLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5" />
                )}
                <span>{isChatLoading ? 'Đang mở...' : 'Nhắn người bán'}</span>
              </button>
              {isUnavailable && unavailableReason && (
                <span className="text-[10px] text-rose-600 font-semibold text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                  Món đồ {unavailableReason.toLowerCase()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa bài đăng đồ cũ"
        description="Bạn có chắc chắn muốn xóa món đồ này không? Hành động này không thể hoàn tác."
        confirmText="Xóa bài đăng"
        cancelText="Hủy"
        variant="destructive"
      />
    </Link>
  );
};