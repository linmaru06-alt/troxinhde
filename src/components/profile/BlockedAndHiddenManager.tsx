import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { formatCurrency } from '../ui/Cards';
import {
  EyeOff,
  Eye,
  ShieldOff,
  ShieldCheck,
  Package,
  UserX,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const BlockedAndHiddenManager: React.FC = () => {
  const {
    currentUser,
    hiddenItemIds,
    hiddenItemsDetailed,
    unhideItem,
    blockedUserIds,
    blockedUsersDetailed,
    unblockUser,
    syncBlocksAndHides,
    marketplaceItems,
    roommates,
  } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'hidden_items' | 'blocked_users'>('hidden_items');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Đồng bộ dữ liệu mới nhất từ Supabase khi mở component
  useEffect(() => {
    if (currentUser?.id) {
      syncBlocksAndHides(currentUser.id);
    }
  }, [currentUser?.id, syncBlocksAndHides]);

  const handleRefresh = async () => {
    if (!currentUser?.id || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await syncBlocksAndHides(currentUser.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUnhide = async (itemId: string) => {
    if (processingId) return;
    setProcessingId(itemId);
    try {
      await unhideItem(itemId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnblock = async (userId: string) => {
    if (processingId) return;
    setProcessingId(userId);
    try {
      await unblockUser(userId);
    } finally {
      setProcessingId(null);
    }
  };

  // Hợp nhất dữ liệu tin đã ẩn: ưu tiên từ hiddenItemsDetailed, fallback tìm trong marketplaceItems
  const mergedHiddenItems = hiddenItemIds.map((id) => {
    const detailed = hiddenItemsDetailed.find((h) => h.item_id === id);
    if (detailed?.item) {
      return {
        id,
        title: detailed.item.title,
        price: detailed.item.price,
        images: detailed.item.images || [],
        district: detailed.item.district,
        category: detailed.item.category,
        sellerName: detailed.item.seller_name,
      };
    }
    const local = marketplaceItems.find((m) => m.id === id);
    if (local) {
      return {
        id,
        title: local.name,
        price: local.price,
        images: local.images || [],
        district: local.district,
        category: local.category,
        sellerName: local.userName,
      };
    }
    return {
      id,
      title: `Tin đăng thanh lý #${id.slice(0, 8)}`,
      price: 0,
      images: [],
      district: 'Hà Nội',
      category: 'Chợ đồ cũ',
      sellerName: 'Người bán',
    };
  });

  // Hợp nhất dữ liệu người đã chặn
  const mergedBlockedUsers = blockedUserIds.map((uid) => {
    const detailed = blockedUsersDetailed.find((b) => b.blocked_id === uid);
    if (detailed?.user) {
      return {
        id: uid,
        name: detailed.user.name,
        avatarUrl: detailed.user.avatarUrl,
        phone: detailed.user.phone,
        role: detailed.user.role,
      };
    }
    const matchedRoommate = roommates.find((r) => r.userId === uid);
    if (matchedRoommate) {
      return {
        id: uid,
        name: matchedRoommate.userName,
        avatarUrl: matchedRoommate.userAvatar,
        phone: undefined,
        role: 'user',
      };
    }
    const matchedItem = marketplaceItems.find((m) => m.userId === uid);
    if (matchedItem) {
      return {
        id: uid,
        name: matchedItem.userName,
        avatarUrl: matchedItem.userAvatar,
        phone: matchedItem.userPhone,
        role: 'user',
      };
    }
    return {
      id: uid,
      name: `Người dùng #${uid.slice(0, 8)}`,
      avatarUrl: undefined,
      phone: undefined,
      role: 'user',
    };
  });

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-950 flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-amber-600" />
            Quản Lý Tin Đã Ẩn & Người Đã Chặn
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Xem lại và mở lại các tin đăng hoặc người dùng bạn đã chủ động ẩn hoặc chặn
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Làm mới
        </Button>
      </div>

      {/* Sub-tabs Selection */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('hidden_items')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSubTab === 'hidden_items'
              ? 'bg-emerald-50 text-[#006d37] border border-emerald-200 shadow-2xs'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Tin Đã Ẩn
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeSubTab === 'hidden_items' ? 'bg-[#006d37] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {hiddenItemIds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('blocked_users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeSubTab === 'blocked_users'
              ? 'bg-emerald-50 text-[#006d37] border border-emerald-200 shadow-2xs'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <UserX className="w-4 h-4" />
          Người Đã Chặn
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeSubTab === 'blocked_users' ? 'bg-[#006d37] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {blockedUserIds.length}
          </span>
        </button>
      </div>

      {/* Content for Sub-tab 1: Tin đã ẩn */}
      {activeSubTab === 'hidden_items' && (
        <div className="space-y-4">
          {mergedHiddenItems.length === 0 ? (
            <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-700">Chưa có tin đăng nào bị ẩn</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Khi bạn gửi báo cáo vi phạm và chọn "Ẩn tin này khỏi danh sách", các tin đó sẽ xuất hiện ở đây để bạn có thể xem lại hoặc bỏ ẩn bất kỳ lúc nào.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {mergedHiddenItems.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:bg-gray-50/50 p-2 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200 flex items-center justify-center">
                      {item.images && item.images[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs font-black text-[#006d37]">
                        {item.price === 0 ? 'Tặng miễn phí 0đ' : formatCurrency(item.price)}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {item.category || 'Đồ cũ sinh viên'} • {item.district || 'Hà Nội'} • Người bán: {item.sellerName || 'Sinh viên'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Link
                      to={`/cho-do-cu/${item.id}`}
                      className="p-2 text-gray-500 hover:text-[#006d37] hover:bg-emerald-50 rounded-xl transition"
                      title="Xem chi tiết món đồ"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnhide(item.id)}
                      isLoading={processingId === item.id}
                      leftIcon={<Eye className="w-3.5 h-3.5 text-emerald-600" />}
                    >
                      Bỏ ẩn
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content for Sub-tab 2: Người đã chặn */}
      {activeSubTab === 'blocked_users' && (
        <div className="space-y-4">
          {mergedBlockedUsers.length === 0 ? (
            <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <UserX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-700">Chưa có người dùng nào bị chặn</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Khi bạn chọn "Chặn người bán" sau khi báo cáo, các tài khoản bị chặn sẽ xuất hiện ở đây. Họ sẽ không thể gửi tin nhắn cho bạn và tin của họ sẽ không hiển thị trên chợ đồ cũ.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {mergedBlockedUsers.map((user) => (
                <div
                  key={user.id}
                  className="py-3.5 flex items-center justify-between gap-3 transition hover:bg-gray-50/50 p-2 rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-100">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {user.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 truncate">
                        ID: {user.id.slice(0, 12)}... • Đã chặn liên hệ & tin đăng
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(user.id)}
                      isLoading={processingId === user.id}
                      leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    >
                      Bỏ chặn
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
