import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MapPin, Clock, FileText, CheckCircle2, Clock3 } from 'lucide-react';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { formatTimeAgo } from '../utils/formatters';

export const UserPostsPage: React.FC = () => {
  const { currentUser, roommates, marketplaceItems, rooms } = useAppStore();
  const [activeTab, setActiveTab] = useState<'roommates' | 'marketplace' | 'rooms'>('roommates');

  if (!currentUser) return null;

  // Filter posts by current user
  const userRoommates = roommates.filter(post => post.userId === currentUser.id);
  const userMarketplaceItems = marketplaceItems.filter(item => (item.userId || item.sellerId) === currentUser.id);
  const userRooms = rooms.filter(room => room.ownerId === currentUser.id);

  const getStatusBadge = (status?: string, verified?: boolean) => {
    if (status === 'pending' || (verified !== undefined && !verified)) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
          <Clock3 className="w-3 h-3" /> Chờ duyệt
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
        <CheckCircle2 className="w-3 h-3" /> Đã duyệt
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-950 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#00a854]" />
            Quản lý bài viết
          </h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý các bài đăng tìm bạn ở ghép và chợ đồ cũ của bạn.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('roommates')}
          className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors relative ${
            activeTab === 'roommates' ? 'text-[#00a854]' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tìm bạn ở ghép ({userRoommates.length})
          {activeTab === 'roommates' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00a854] rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors relative ${
            activeTab === 'marketplace' ? 'text-[#00a854]' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Chợ đồ cũ ({userMarketplaceItems.length})
          {activeTab === 'marketplace' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00a854] rounded-t-full"></span>
          )}
        </button>
        {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors relative ${
              activeTab === 'rooms' ? 'text-[#00a854]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Phòng trọ ({userRooms.length})
            {activeTab === 'rooms' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00a854] rounded-t-full"></span>
            )}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'roommates' && (
          <>
            {userRoommates.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900">Chưa có bài viết nào</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Bạn chưa đăng bài tìm bạn ở ghép nào.</p>
                <Link to="/tim-ban-cung-phong">
                  <Button variant="primary" size="sm">Đăng bài ngay</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {userRoommates.map(post => (
                  <Card key={post.id} className="p-4 flex flex-col hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(post.status, post.verified)}
                      </div>
                      <Link to={`/tim-ban-cung-phong/${post.id}`} className="text-[#00a854] text-xs font-bold hover:underline">
                        Xem chi tiết
                      </Link>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mt-1 flex-1">{post.title || post.linkedRoomTitle || post.intro || 'Tìm bạn cùng phòng'}</h3>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[100px]">{post.district}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTimeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'marketplace' && (
          <>
            {userMarketplaceItems.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900">Chưa có bài viết nào</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Bạn chưa đăng bán món đồ nào trên chợ sinh viên.</p>
                <Link to="/cho-do-cu">
                  <Button variant="primary" size="sm">Đăng bán ngay</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {userMarketplaceItems.map(item => (
                  <Card key={item.id} className="p-3 flex gap-3 hover:border-emerald-200 transition-colors overflow-hidden">
                    <OptimizedImage
                      src={item.images[0] || '/images/placeholder.jpg'}
                      alt={item.title || item.name || 'Món đồ'}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        {getStatusBadge(item.status)}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{item.title || item.name}</h3>
                      <p className="text-[#00a854] font-black text-sm mt-0.5">
                        {item.price.toLocaleString('vi-VN')}đ
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-[10px] text-gray-500">{formatTimeAgo(item.createdAt)}</span>
                        <Link to={`/cho-do-cu/${item.id}`} className="text-[#00a854] text-[10px] font-bold hover:underline">
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'rooms' && (
          <>
            {userRooms.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900">Chưa có bài viết nào</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Bạn chưa đăng phòng trọ nào.</p>
                <Link to="/chu-tro/phong/tao-moi">
                  <Button variant="primary" size="sm">Đăng phòng ngay</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {userRooms.map(room => (
                  <Card key={room.id} className="p-3 flex gap-3 hover:border-emerald-200 transition-colors overflow-hidden">
                    <OptimizedImage
                      src={room.images[0] || '/images/placeholder.jpg'}
                      alt={room.title}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        {getStatusBadge(room.status, room.verified)}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{room.title}</h3>
                      <p className="text-[#00a854] font-black text-sm mt-0.5">
                        {room.price.toLocaleString('vi-VN')}đ/tháng
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-[10px] text-gray-500">{formatTimeAgo(room.createdAt)}</span>
                        <Link to={`/phong/${room.id}`} className="text-[#00a854] text-[10px] font-bold hover:underline">
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
