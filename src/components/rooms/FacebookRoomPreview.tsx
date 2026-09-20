import React, { useState } from 'react';
import { Room } from '../../types';
import { formatPrice, RoomCard } from '../ui/Cards';
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Globe,
  CheckCircle2,
  Wind,
  Refrigerator,
  Wifi,
  Utensils,
  Sun,
  ShieldCheck,
  Zap,
  Droplets,
  Maximize2,
  KeyRound,
  DoorOpen,
  Sparkles,
  Send,
  Building,
  MapPin,
  Flame,
} from 'lucide-react';

interface FacebookRoomPreviewProps {
  room: Room;
}

// Mapping miniature icons for amenities
export const getAmenityMiniIcon = (amenityName: string) => {
  const lower = amenityName.toLowerCase();
  if (lower.includes('điều hòa') || lower.includes('máy lạnh')) return <Wind className="w-3.5 h-3.5 text-cyan-600 shrink-0" />;
  if (lower.includes('tủ lạnh')) return <Refrigerator className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
  if (lower.includes('ban công')) return <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  if (lower.includes('bếp')) return <Utensils className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
  if (lower.includes('wifi')) return <Wifi className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
  if (lower.includes('khóa') || lower.includes('vân tay') || lower.includes('tự do'))
    return <KeyRound className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
  if (lower.includes('khép kín') || lower.includes('phòng')) return <DoorOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
  if (lower.includes('an ninh') || lower.includes('camera') || lower.includes('bảo vệ'))
    return <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />;
  return <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
};

export const FacebookRoomPreview: React.FC<FacebookRoomPreviewProps> = ({ room }) => {
  const [activeView, setActiveView] = useState<'facebook' | 'card'>('facebook');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24);

  const images = room.images && room.images.length > 0
    ? room.images
    : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'];

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* View Switcher: Meta Facebook Feed vs Standard Card */}
      <div className="flex items-center justify-between bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs">
        <button
          type="button"
          onClick={() => setActiveView('facebook')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeView === 'facebook'
              ? 'bg-white text-[#1877F2] shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#1877F2]"></span>
          <span>Bảng tin</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView('card')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeView === 'card'
              ? 'bg-white text-[#006d37] shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[#006d37]"></span>
          <span>Thẻ Tìm Kiếm Web</span>
        </button>
      </div>

      {activeView === 'card' ? (
        <div className="max-w-sm mx-auto">
          <RoomCard room={room} />
        </div>
      ) : (
        /* Meta Facebook Post Card */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-gray-900 font-sans">
          {/* 1. Meta Post Header */}
          <div className="p-3.5 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={room.ownerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                  alt={room.ownerName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#1877F2] rounded-full flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-white">
                  ✓
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 hover:underline cursor-pointer">
                    {room.buildingName || room.ownerName || 'Chủ Trọ Trọ Xinh'}
                  </h4>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1877F2] fill-[#1877F2] text-white shrink-0" />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <span>Vừa xong</span>
                  <span>·</span>
                  <Globe className="w-3 h-3 text-gray-400" />
                  <span>·</span>
                  <span className="text-emerald-700 font-medium">Đối tác Trọ Xinh</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-gray-400">
              <button className="p-1.5 hover:bg-gray-100 rounded-full transition text-gray-500">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. Post Caption & Title */}
          <div className="p-3.5 space-y-2 text-xs leading-relaxed text-gray-800">
            {/* Public Title */}
            <p className="font-black text-sm sm:text-base text-gray-950">
              {room.title || 'Phòng cho thuê tiện nghi'}
            </p>

            {/* Quick Info Line */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-xs border border-rose-200">
                <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                {formatPrice(room.price)}/tháng
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-200">
                <Building className="w-3 h-3" />
                {room.roomNumber} · {room.type}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200">
                <Maximize2 className="w-3 h-3" />
                {room.area}m²
              </span>
            </div>

            {/* Description */}
            {room.description && (
              <p className="text-gray-700 whitespace-pre-line text-xs">
                {room.description}
              </p>
            )}

            {/* Miniature Icons for Amenities (Các tiện ích bằng icon thu nhỏ) */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>Tiện nghi & Dịch vụ phòng:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities && room.amenities.map((item, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 border border-gray-200/80 text-[11px] font-semibold text-gray-800 transition"
                    title={item}
                  >
                    {getAmenityMiniIcon(item)}
                    <span>{item}</span>
                  </div>
                ))}

                {/* Utility specs mini badges */}
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Điện {room.electricityPrice?.toLocaleString('vi-VN')}đ/số</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 border border-cyan-200 text-[11px] font-semibold text-cyan-800">
                  <Droplets className="w-3 h-3 text-cyan-600" />
                  <span>Nước {room.waterPrice?.toLocaleString('vi-VN')}đ/tháng</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 pt-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">{room.address || 'Hà Nội'}</span>
            </div>
          </div>

          {/* 3. Facebook Multi-Image Photo Grid Layout */}
          <div className="bg-gray-900 relative">
            {images.length === 1 && (
              <div className="aspect-16/10 w-full overflow-hidden">
                <img
                  src={images[0]}
                  alt="Ảnh phòng"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {images.length === 2 && (
              <div className="grid grid-cols-2 gap-0.5 aspect-16/10 w-full overflow-hidden">
                <img src={images[0]} alt="Ảnh 1" className="w-full h-full object-cover" />
                <img src={images[1]} alt="Ảnh 2" className="w-full h-full object-cover" />
              </div>
            )}

            {images.length === 3 && (
              <div className="grid grid-cols-2 gap-0.5 aspect-16/10 w-full overflow-hidden">
                <img src={images[0]} alt="Ảnh chính" className="w-full h-full object-cover row-span-2" />
                <div className="grid grid-rows-2 gap-0.5 h-full">
                  <img src={images[1]} alt="Ảnh 2" className="w-full h-full object-cover" />
                  <img src={images[2]} alt="Ảnh 3" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {images.length >= 4 && (
              <div className="grid grid-cols-2 gap-0.5 aspect-16/10 w-full overflow-hidden">
                <img src={images[0]} alt="Ảnh chính" className="w-full h-full object-cover" />
                <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full">
                  <img src={images[1]} alt="Ảnh 2" className="w-full h-full object-cover" />
                  <img src={images[2]} alt="Ảnh 3" className="w-full h-full object-cover" />
                  <img src={images[3]} alt="Ảnh 4" className="w-full h-full object-cover" />
                  <div className="relative w-full h-full">
                    {images[4] ? (
                      <img src={images[4]} alt="Ảnh 5" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-800" />
                    )}
                    {images.length > 4 && (
                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-white font-black text-sm">
                        +{images.length - 4} ảnh
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Meta Messenger / Action Callout Box */}
          <div className="p-3 bg-gray-50 border-t border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">
                TROXINH.VN · NỀN TẢNG PHÒNG TRỌ ĐÃ XÁC MINH
              </span>
              <p className="text-xs font-bold text-gray-900 truncate">
                {room.title || 'Liên hệ để đặt lịch xem phòng trực tiếp'}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#1877F2] hover:bg-blue-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi tin nhắn</span>
            </button>
          </div>

          {/* 5. Engagement Counts */}
          <div className="px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-500 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[9px]">
                👍
              </span>
              <span>{likeCount} người thích</span>
            </div>
            <div className="flex items-center gap-3">
              <span>6 bình luận</span>
              <span>2 lượt chia sẻ</span>
            </div>
          </div>

          {/* 6. Facebook Interactive Action Bar */}
          <div className="grid grid-cols-3 p-1 text-xs font-semibold text-gray-600">
            <button
              type="button"
              onClick={handleLike}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer hover:bg-gray-100 ${
                isLiked ? 'text-[#1877F2] font-bold' : ''
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-[#1877F2]' : ''}`} />
              <span>Thích</span>
            </button>

            <button
              type="button"
              className="py-2 rounded-lg flex items-center justify-center gap-1.5 hover:bg-gray-100 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Bình luận</span>
            </button>

            <button
              type="button"
              className="py-2 rounded-lg flex items-center justify-center gap-1.5 hover:bg-gray-100 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
