import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { RoomCard } from '../components/ui/Cards';
import { EmptyState } from '../components/ui/EmptyState';
import { Heart, Compass } from 'lucide-react';

export const SavedRoomsPage: React.FC = () => {
  const { rooms, savedRoomIds } = useAppStore();

  const savedRooms = rooms.filter((r) => savedRoomIds.includes(r.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-500 fill-current" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Danh Sách Phòng Trọ Đã Lưu
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Bạn đã lưu <strong className="text-gray-900">{savedRooms.length}</strong> phòng trọ yêu thích.
        </p>
      </div>

      {savedRooms.length === 0 ? (
        <EmptyState
          icon="saved"
          title="Bạn chưa lưu phòng trọ nào"
          description="Bấm vào biểu tượng trái tim trên các thẻ phòng trọ để lưu lại và so sánh dễ dàng hơn."
          actionText="Khám phá phòng trọ ngay"
          onAction={() => (window.location.href = '/tim-kiem')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {savedRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
};
