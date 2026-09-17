import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RoomCard } from '../components/ui/Cards';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import {
  Building2,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Star,
  MessageSquare,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

import { getOrCreateConversation } from '../lib/api/messages';

export const BuildingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { buildings, rooms, currentUser, showToast } = useAppStore();
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const building = buildings.find((b) => b.id === id) || buildings[0];
  const buildingRooms = rooms.filter((r) => r.buildingId === building?.id);

  if (!building) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Không tìm thấy tòa nhà</h2>
        <Link to="/tim-kiem" className="text-[#006d37] font-semibold mt-2 inline-block">← Về trang tìm kiếm</Link>
      </div>
    );
  }

  const handleContactOwner = async () => {
    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(`/toa-nha/${building.id}`)}`);
      return;
    }
    if (currentUser.id === building.ownerId) {
      showToast('Bạn là chủ tòa nhà này', 'Không thể tự nhắn tin cho chính mình', 'info');
      return;
    }

    setIsChatLoading(true);
    try {
      const convId = await getOrCreateConversation(currentUser.id, building.ownerId);
      navigate(`/tin-nhan/${convId}`);
    } catch (err: any) {
      console.error('[BuildingDetail] Lỗi mở chat:', err);
      showToast('Không thể mở cuộc trò chuyện', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-[#006d37]">Trang chủ</Link>
        <span>/</span>
        <Link to="/tim-kiem" className="hover:text-[#006d37]">Tòa nhà</Link>
        <span>/</span>
        <span className="text-gray-900 font-bold">{building.name}</span>
      </div>

      {/* Hero Banner with Building Image */}
      <div className="relative aspect-21/9 w-full overflow-hidden rounded-3xl bg-gray-900 shadow-xl">
        <ImageWithFallback
          src={building.images[0]}
          alt={building.name}
          preset="hero"
          loading="eager"
          fallback="building"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
          <div className="flex flex-wrap gap-2 mb-1">
            {building.verifiedBadge && (
              <Badge variant="verified" size="md">
                Tòa Nhà Đạt Chuẩn PCCC & Đã Kiểm Duyệt
              </Badge>
            )}
            <span className="bg-white/20 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-semibold">
              Còn trống {building.availableRooms} / {building.totalRooms} phòng
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{building.name}</h1>
          <p className="text-xs sm:text-sm text-gray-200 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            {building.address}, {building.district}, {building.city}
          </p>
        </div>
      </div>

      {/* Building Overview & Amenities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Giới Thiệu Tòa Nhà</h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{building.description}</p>

            <h3 className="text-sm font-bold text-gray-900 pt-2">Tiện ích chung toàn tòa nhà:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {building.amenities.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#006d37] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Available Rooms Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#006d37]" />
                Các Phòng Còn Trống Tại Tòa Nhà ({buildingRooms.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {buildingRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Owner Profile & Contact */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-md space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <img
                src={building.ownerAvatar}
                alt={building.ownerName}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-200"
              />
              <div>
                <h3 className="text-sm font-bold text-gray-900">{building.ownerName}</h3>
                <p className="text-xs text-gray-500">Chủ sở hữu tòa nhà</p>
                <div className="flex text-amber-500 text-xs mt-1">★★★★★ (4.9 / 5)</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="primary"
                size="md"
                className="w-full cursor-pointer"
                disabled={isChatLoading}
                onClick={handleContactOwner}
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                {isChatLoading ? 'Đang mở cuộc trò chuyện...' : 'Nhắn Tin Cho Chủ Trọ'}
              </Button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs space-y-2 text-emerald-900">
              <h4 className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#006d37]" />
                Chứng nhận kiểm duyệt:
              </h4>
              <p>• Đã kiểm tra PCCC và giấy phép kinh doanh.</p>
              <p>• Hợp đồng rõ ràng, niêm yết giá công khai.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
