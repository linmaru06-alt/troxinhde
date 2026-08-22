import React from 'react';
import { Link } from 'react-router-dom';
import { Room, Building, RoommatePost, MarketplaceItem } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Badge } from './Badge';
import { ImageWithFallback } from './ImageWithFallback';
import { Heart, MapPin, Sparkles, Navigation, CheckCircle } from 'lucide-react';

export const formatPrice = (price: number): string => {
  if (price === 0) return 'Miễn phí';
  if (price >= 1000000) {
    const tr = price / 1000000;
    return `${tr % 1 === 0 ? tr : tr.toFixed(1)} tr/tháng`;
  }
  return `${price.toLocaleString('vi-VN')} đ/tháng`;
};

export const formatCurrency = (amount: number): string => {
  if (amount === 0) return 'Miễn phí';
  return `${amount.toLocaleString('vi-VN')} đ`;
};

// 1. RoomCard
export const RoomCard: React.FC<{ room: Room }> = ({ room }) => {
  const { savedRoomIds, toggleSaveRoom } = useAppStore();
  const isSaved = savedRoomIds.includes(room.id);

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200/80 hover:border-[#006d37]/30 shadow-xs hover:shadow-card-hover transition-all duration-300 flex flex-col h-full hover:-translate-y-1">
      {/* Image & Badges */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
        <Link to={`/phong/${room.id}`} className="block w-full h-full">
          <ImageWithFallback
            src={room.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600'}
            alt={room.title}
            preset="thumbnail"
            loading="lazy"
            fallback="room"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          {room.verified && (
            <Badge variant="verified" size="sm">
              Đã kiểm duyệt
            </Badge>
          )}
          <Badge variant={room.status === 'Còn trống' ? 'available' : room.status === 'Chờ duyệt' ? 'pending' : 'rented'} size="sm">
            {room.status}
          </Badge>
        </div>

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSaveRoom(room.id);
          }}
          aria-label={isSaved ? 'Bỏ lưu phòng' : 'Lưu phòng'}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm ${
            isSaved
              ? 'bg-rose-500 text-white scale-110'
              : 'bg-white/80 hover:bg-white text-gray-700 hover:text-rose-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 left-3 bg-[#006d37]/90 backdrop-blur-md text-white font-bold text-sm px-3 py-1 rounded-xl shadow-md">
          {formatPrice(room.price)}
        </div>
      </div>

      {/* Info Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
            <span className="font-semibold text-gray-700">{room.area} m²</span>
            <span>•</span>
            <span>{room.type}</span>
            <span>•</span>
            <span className="text-[#006d37] font-medium flex items-center gap-1">
              <Navigation className="w-3 h-3" /> {room.nearestSchool}
            </span>
          </div>

          <Link to={`/phong/${room.id}`}>
            <h3 className="text-base font-bold text-gray-900 line-clamp-2 group-hover:text-[#006d37] transition-colors leading-snug">
              {room.title}
            </h3>
          </Link>
        </div>

        <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1 truncate pr-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{room.address}</span>
          </div>
          <span className="shrink-0 text-gray-400 font-medium">{room.district}</span>
        </div>
      </div>
    </div>
  );
};

// 2. BuildingCard
export const BuildingCard: React.FC<{ building: Building }> = ({ building }) => {
  return (
    <Link
      to={`/toa-nha/${building.id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-200/80 hover:border-[#006d37]/30 shadow-xs hover:shadow-card-hover transition-all duration-300 flex flex-col h-full hover:-translate-y-1"
    >
      <div className="relative aspect-16/10 w-full overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={building.images[0]}
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
    </Link>
  );
};

// 3. RoommateCard
export const RoommateCard: React.FC<{ post: RoommatePost }> = ({ post }) => {
  const { savedRoommateIds, toggleSaveRoommate } = useAppStore();
  const isSaved = savedRoommateIds.includes(post.id);

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
              <p className="text-xs text-[#006d37] font-medium">{post.userSchool}</p>
            </div>
          </div>

          <button
            onClick={() => toggleSaveRoommate(post.id)}
            className={`p-2 rounded-full transition ${isSaved ? 'text-rose-500 bg-rose-50' : 'text-gray-400 hover:text-rose-500 hover:bg-gray-50'}`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Budget Tag */}
        <div className="flex items-center justify-between bg-emerald-50/70 rounded-xl p-2.5 mb-3 text-xs">
          <span className="text-emerald-900 font-medium">Ngân sách share:</span>
          <span className="text-[#006d37] font-bold text-sm">{formatCurrency(post.budgetShare)}/người</span>
        </div>

        {/* Intro */}
        <p className="text-xs text-gray-600 line-clamp-3 mb-3 leading-relaxed">
          "{post.intro}"
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
        <span className="text-xs text-gray-400">{post.district}</span>
        <Link
          to={`/roommate/${post.id}`}
          className="text-xs font-bold text-[#006d37] hover:underline"
        >
          Xem chi tiết →
        </Link>
      </div>
    </div>
  );
};

// 4. MarketplaceCard
export const MarketplaceCard: React.FC<{ item: MarketplaceItem }> = ({ item }) => {
  return (
    <Link
      to={`/cho-do-cu/${item.id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-200/80 hover:border-[#006d37]/30 shadow-xs hover:shadow-card-hover transition-all duration-300 flex flex-col h-full hover:-translate-y-1"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={item.images[0]}
          alt={item.name}
          preset="market"
          loading="lazy"
          fallback="item"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <Badge variant={item.pricingType === 'Miễn phí' ? 'free' : 'cheap'} size="sm">
            {item.pricingType === 'Miễn phí' ? 'Miễn phí 0đ' : formatCurrency(item.price)}
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-md backdrop-blur-xs">
          {item.condition}
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-medium text-gray-400 uppercase">{item.category}</span>
          <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#006d37] transition-colors line-clamp-2 mb-1">
            {item.name}
          </h3>
        </div>

        <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="truncate">{item.district}</span>
          <span className="text-[#006d37] font-semibold">Xem ngay</span>
        </div>
      </div>
    </Link>
  );
};
